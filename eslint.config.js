// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      /*
       * Expo pulls in the broader React Hooks lint set, including the
       * React Compiler-oriented rules. React Compiler IS enabled in this app
       * (`app.json`, `experiments.reactCompiler: true`).
       *
       * These compiler-oriented rules stay disabled because they produce
       * false positives on common React Native / Reanimated patterns, such as
       * SharedValue `.value` writes and Animated.Value refs, not because the
       * compiler is missing.
       *
       * The two hook correctness rules (`rules-of-hooks`, `exhaustive-deps`)
       * stay enabled through expoConfig.
       */
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    /*
     * App code must log through `lib/logger.ts`, which only writes in
     * development (`__DEV__`).
     */
    files: ['app/**', 'components/**', 'lib/**', 'store/**'],
    ignores: ['lib/logger.ts'],
    rules: {
      'no-console': 'error',
    },
  },
]);
