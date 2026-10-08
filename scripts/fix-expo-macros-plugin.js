/*
 * postinstall: fix-expo-macros-plugin
 *
 * Problem fixed:
 *   `expo-modules-core` is installed nested under `node_modules/expo/`
 *   (`node_modules/expo/node_modules/expo-modules-core`). Its iOS build expects
 *   the Swift macros package `@expo/expo-modules-macros-plugin` to sit next to
 *   it, in `node_modules/expo/node_modules/expo-modules-core/node_modules/@expo/`.
 *   npm hoists that package to the project root (`node_modules/@expo/`), so the
 *   native iOS build cannot find it. This script creates a symlink from the
 *   expected location to the hoisted package after every `npm install`.
 *
 * Origin:
 *   Introduced with the upgrade to Expo SDK 56 (commit 8ac9af5).
 *
 * How to check whether it is still needed:
 *   1. Run `npm install`, then delete the symlink
 *      `node_modules/expo/node_modules/expo-modules-core/node_modules/@expo/expo-modules-macros-plugin`
 *      (or temporarily remove the `postinstall` entry and reinstall).
 *   2. Run a full native iOS build (`npx expo run:ios`, clean build).
 *   3. If the build succeeds without the symlink, this script and the
 *      `postinstall` entry in `package.json` can be removed.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const actualPackagePath = path.join(
  projectRoot,
  "node_modules",
  "@expo",
  "expo-modules-macros-plugin"
);
const expectedScopePath = path.join(
  projectRoot,
  "node_modules",
  "expo",
  "node_modules",
  "expo-modules-core",
  "node_modules",
  "@expo"
);
const expectedPackagePath = path.join(
  expectedScopePath,
  "expo-modules-macros-plugin"
);

if (!fs.existsSync(actualPackagePath)) {
  console.warn(
    "[fix-expo-macros-plugin] Skipped: @expo/expo-modules-macros-plugin is not installed."
  );
  process.exit(0);
}

fs.mkdirSync(expectedScopePath, { recursive: true });

try {
  const stat = fs.lstatSync(expectedPackagePath);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(expectedPackagePath);
    const resolvedTarget = path.resolve(path.dirname(expectedPackagePath), target);
    if (resolvedTarget === actualPackagePath) {
      process.exit(0);
    }
    fs.unlinkSync(expectedPackagePath);
  } else {
    console.warn(
      "[fix-expo-macros-plugin] Skipped: expected path exists and is not a symlink."
    );
    process.exit(0);
  }
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

const relativeTarget = path.relative(expectedScopePath, actualPackagePath);
fs.symlinkSync(relativeTarget, expectedPackagePath, "dir");
console.log("[fix-expo-macros-plugin] Linked Expo Swift macros plugin.");
