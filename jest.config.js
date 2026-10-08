const path = require('node:path');
const coreDirectory = path.dirname(require.resolve('expo-modules-core/package.json', { paths: [require.resolve('expo/package.json')] }));

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // npm installs core under expo in this lockfile; resolve the actual dependency.
  moduleNameMapper: { '^expo-modules-core(.*)$': `${coreDirectory}$1` },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  watchman: false,
};
