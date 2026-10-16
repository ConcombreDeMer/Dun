/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  /*
   * Business rules in `src/domain` must stay fully covered (`npm run test`
   * runs `jest --coverage`). `istanbul ignore` comments are not allowed.
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
