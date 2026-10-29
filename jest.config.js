/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  /*
   * The list of `jest-expo`, plus `fractional-indexing`: this package is
   * published as ESM only, so Jest must transform it like the app sources.
   */
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|fractional-indexing))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  /*
   * Business rules in `src/domain` must stay fully covered. The threshold
   * applies through `npm run test:coverage` (`jest --coverage`), run by
   * `npm run check`; `npm run test` runs without coverage, for partial runs.
   * `istanbul ignore` comments are not allowed.
   */
  collectCoverageFrom: ["src/domain/**/*.ts", "!src/domain/**/*.test.ts"],
  coverageReporters: ["text"],
  coverageThreshold: {
    "./src/domain/": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
