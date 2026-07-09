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

module.exports = function withIosSentryXcodeEnv(config) {
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const envLocalPath = path.join(
        config.modRequest.platformProjectRoot,
        ".xcode.env.local"
      );
      const envLocalSource = `set -a
if [[ -f "$PROJECT_DIR/../.env.local" ]]; then
  source "$PROJECT_DIR/../.env.local"
fi
if [[ -f "$PROJECT_DIR/../.env" ]]; then
  source "$PROJECT_DIR/../.env"
fi
set +a`;

      let contents = fs.existsSync(envLocalPath)
        ? fs.readFileSync(envLocalPath, "utf8")
        : "";

      if (!contents.includes(".env.local")) {
        contents = `${contents.trim()}\n\n${envLocalSource}\n`;
        fs.writeFileSync(envLocalPath, contents);
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
        phase.shellScript = JSON.stringify(`${ENV_SOURCE_SCRIPT}${shellScript}`);
      }
    }

    return config;
  });

  return config;
};
