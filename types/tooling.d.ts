// The installed flat preset has no declaration file. Its boundary is an ESLint
// flat-config array; this does not suppress checks of our configuration.
declare module 'eslint-config-expo/flat' {
  const config: import('eslint').Linter.Config[];
  export = config;
}
