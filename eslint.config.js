// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    /*
     * Global ignores. `dist` is build output. `supabase/functions` holds
     * Deno code (URL imports, `Deno` global), linted by `deno lint` with
     * `supabase/functions/deno.json`.
     */
    ignores: ["dist/*", "supabase/functions/**"],
  },
  {
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
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    /*
     * App code must log through `lib/logger.ts`, which only writes in
     * development (`__DEV__`).
     */
    files: ["app/**", "components/**", "lib/**", "store/**"],
    ignores: ["lib/logger.ts"],
    rules: {
      "no-console": "error",
    },
  },
  {
    /* Build scripts and config plugins run in Node. */
    files: ["scripts/**", "plugins/**"],
    languageOptions: {
      globals: globals.node,
    },
  },
  /*
   * Must stay last: turns off the style rules that would conflict with
   * Prettier, which runs separately (`npm run format:check`).
   */
  eslintConfigPrettier,
]);
