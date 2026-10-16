/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
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
