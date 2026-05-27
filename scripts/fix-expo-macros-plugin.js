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
