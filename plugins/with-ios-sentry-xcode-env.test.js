/**
 * @jest-environment node
 */
const { describe, expect, it } = require("@jest/globals");
const {
  applySentryAuthTokenBlock,
  SENTRY_AUTH_TOKEN_BLOCK,
} = require("./with-ios-sentry-xcode-env");

const NODE_BINARY_LINE = "export NODE_BINARY=$(command -v node)";

const LEGACY_BLOCK = `set -a
if [[ -f "$PROJECT_DIR/../.env.local" ]]; then
  source "$PROJECT_DIR/../.env.local"
fi
if [[ -f "$PROJECT_DIR/../.env" ]]; then
  source "$PROJECT_DIR/../.env"
fi
set +a`;

const countBlocks = (contents) =>
  contents.split(">>> dun: SENTRY_AUTH_TOKEN").length - 1;

describe("applySentryAuthTokenBlock", () => {
  it("exports SENTRY_AUTH_TOKEN only and never sources a .env file", () => {
    expect(SENTRY_AUTH_TOKEN_BLOCK).toContain("export SENTRY_AUTH_TOKEN");
    expect(SENTRY_AUTH_TOKEN_BLOCK).not.toMatch(/set -a|source|^\s*\. /m);
    expect(SENTRY_AUTH_TOKEN_BLOCK).not.toContain('/../.env"');
  });

  it("writes the block alone in an empty file", () => {
    expect(applySentryAuthTokenBlock("")).toBe(`${SENTRY_AUTH_TOKEN_BLOCK}\n`);
  });

  it("replaces the legacy set -a block and keeps the other lines", () => {
    const legacy = `\n\n${LEGACY_BLOCK}\n`;
    const withNode = `${NODE_BINARY_LINE}\n\n${LEGACY_BLOCK}\n`;

    expect(applySentryAuthTokenBlock(legacy)).toBe(
      `${SENTRY_AUTH_TOKEN_BLOCK}\n`,
    );
    expect(applySentryAuthTokenBlock(withNode)).toBe(
      `${NODE_BINARY_LINE}\n\n${SENTRY_AUTH_TOKEN_BLOCK}\n`,
    );
  });

  it("replaces an existing marked block instead of adding one", () => {
    const outdated = `${NODE_BINARY_LINE}\n\n${SENTRY_AUTH_TOKEN_BLOCK.replace(
      "export SENTRY_AUTH_TOKEN",
      "export SENTRY_AUTH_TOKEN # old version",
    )}\n\n# after\n`;
    const result = applySentryAuthTokenBlock(outdated);

    expect(countBlocks(result)).toBe(1);
    expect(result).not.toContain("old version");
    expect(result).toBe(
      `${NODE_BINARY_LINE}\n\n# after\n\n${SENTRY_AUTH_TOKEN_BLOCK}\n`,
    );
  });

  it("is idempotent", () => {
    for (const input of [
      "",
      NODE_BINARY_LINE,
      `${NODE_BINARY_LINE}\n\n${LEGACY_BLOCK}\n`,
    ]) {
      const once = applySentryAuthTokenBlock(input);
      expect(applySentryAuthTokenBlock(once)).toBe(once);
      expect(countBlocks(once)).toBe(1);
      expect(once).not.toContain("set -a");
    }
  });
});
