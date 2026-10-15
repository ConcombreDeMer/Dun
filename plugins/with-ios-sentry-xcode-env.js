const { withDangerousMod, withXcodeProject } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const ENV_SOURCE_SCRIPT = `if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

`;

const BLOCK_START =
  "# >>> dun: SENTRY_AUTH_TOKEN (plugins/with-ios-sentry-xcode-env.js) >>>";
const BLOCK_END = "# <<< dun: SENTRY_AUTH_TOKEN <<<";

/*
 * Shell block written to `ios/.xcode.env.local`, which Xcode script phases
 * source (with /bin/sh, or bash under `set -eo pipefail`). It exports
 * SENTRY_AUTH_TOKEN only, read from `../.env.local`: no other variable of
 * any `.env*` file reaches the build phases, so `EXPO_PUBLIC_*` values keep
 * coming from Expo's own `.env.<mode>` selection.
 *
 * POSIX sh only. Every command exits 0 even when the file or the key is
 * missing, so the block never breaks the build. The value is never printed.
 * Handles `export KEY=…`, double or single quotes, inline comments; lines
 * starting with `#` are ignored.
 */
const SENTRY_AUTH_TOKEN_BLOCK = `${BLOCK_START}
# Generated: do not edit. Exports only SENTRY_AUTH_TOKEN from ../.env.local.
__dun_env_local="\${PROJECT_DIR:-}/../.env.local"
if [ -n "\${PROJECT_DIR:-}" ] && [ -f "$__dun_env_local" ]; then
  __dun_token=$(sed -n 's/^[[:space:]]*\\(export[[:space:]][[:space:]]*\\)\\{0,1\\}SENTRY_AUTH_TOKEN[[:space:]]*=[[:space:]]*//p' "$__dun_env_local" | tr -d '\\r' | tail -n 1)
  case "$__dun_token" in
    \\"*) __dun_token=\${__dun_token#\\"}; __dun_token=\${__dun_token%%\\"*} ;;
    \\'*) __dun_token=\${__dun_token#\\'}; __dun_token=\${__dun_token%%\\'*} ;;
    *) __dun_token=\${__dun_token%%#*}; __dun_token=\${__dun_token%"\${__dun_token##*[![:space:]]}"} ;;
  esac
  if [ -n "$__dun_token" ]; then
    SENTRY_AUTH_TOKEN=$__dun_token
    export SENTRY_AUTH_TOKEN
  fi
fi
unset __dun_env_local __dun_token
${BLOCK_END}`;

/* Block written by earlier versions of this plugin: it exported whole files. */
const LEGACY_BLOCK = `set -a
if [[ -f "$PROJECT_DIR/../.env.local" ]]; then
  source "$PROJECT_DIR/../.env.local"
fi
if [[ -f "$PROJECT_DIR/../.env" ]]; then
  source "$PROJECT_DIR/../.env"
fi
set +a`;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MARKED_BLOCK_PATTERN = new RegExp(
  `${escapeRegExp(BLOCK_START)}[\\s\\S]*?${escapeRegExp(BLOCK_END)}\\n?`,
  "g",
);

/*
 * Pure: returns `.xcode.env.local` contents with exactly one up-to-date
 * block at the end. Replaces a previous block (marked or legacy) and keeps
 * every other line. Idempotent.
 */
function applySentryAuthTokenBlock(contents) {
  const withoutBlocks = contents
    .replace(MARKED_BLOCK_PATTERN, "")
    .split(LEGACY_BLOCK)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return withoutBlocks
    ? `${withoutBlocks}\n\n${SENTRY_AUTH_TOKEN_BLOCK}\n`
    : `${SENTRY_AUTH_TOKEN_BLOCK}\n`;
}

function withIosSentryXcodeEnv(config) {
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const envLocalPath = path.join(
        config.modRequest.platformProjectRoot,
        ".xcode.env.local",
      );
      const contents = fs.existsSync(envLocalPath)
        ? fs.readFileSync(envLocalPath, "utf8")
        : "";
      const nextContents = applySentryAuthTokenBlock(contents);

      if (nextContents !== contents) {
        fs.writeFileSync(envLocalPath, nextContents);
      }

      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const shellScriptBuildPhases =
      config.modResults.hash.project.objects.PBXShellScriptBuildPhase;

    for (const phase of Object.values(shellScriptBuildPhases)) {
      if (
        phase &&
        typeof phase === "object" &&
        phase.name === '"Upload Debug Symbols to Sentry"' &&
        typeof phase.shellScript === "string" &&
        !phase.shellScript.includes(".xcode.env.local")
      ) {
        const shellScript = JSON.parse(phase.shellScript);
        phase.shellScript = JSON.stringify(
          `${ENV_SOURCE_SCRIPT}${shellScript}`,
        );
      }
    }

    return config;
  });

  return config;
}

module.exports = withIosSentryXcodeEnv;
module.exports.applySentryAuthTokenBlock = applySentryAuthTokenBlock;
module.exports.SENTRY_AUTH_TOKEN_BLOCK = SENTRY_AUTH_TOKEN_BLOCK;
