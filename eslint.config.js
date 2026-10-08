const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  { ignores: ['node_modules/**', 'ios/**', 'android/**', '.expo/**', 'dist/**', 'coverage/**'] },
  expoConfig,
  {
    // React Compiler is enabled in app.json. Pre-existing diagnostics remain
    // visible warnings pending their owning feature's review, not silenced.
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  {
    files: ['scripts/**/*.js', 'plugins/**/*.js', '*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', __filename: 'readonly', module: 'readonly', require: 'readonly', process: 'readonly', console: 'readonly', Buffer: 'readonly' },
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: { globals: { Deno: 'readonly' } },
    // Deno checks URL imports and locks their content. Node's resolver cannot.
    rules: { 'import/no-unresolved': ['error', { ignore: ['^https://'] }] },
  },
]);
