// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      /*
       * Expo currently pulls in the broader React Hooks lint set, including
       * React Compiler-oriented rules. This app is not compiled with React
       * Compiler yet, and these rules produce noisy false positives for common
       * React Native/Reanimated patterns such as SharedValue `.value` writes
       * and Animated.Value refs.
       *
       * Keep the two hook correctness rules enabled through expoConfig, but
       * disable the compiler-only checks until the toolchain can understand
       * these React Native patterns reliably.
       */
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
]);
