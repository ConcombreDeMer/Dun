/*
 * App logger. Writes to the console in development only (`__DEV__`);
 * in production builds every call is a no-op.
 *
 * This is the only file of the app allowed to use `console` (see the
 * `no-console` rule in `eslint.config.js`).
 */
export const logger = {
  warn(...args: unknown[]): void {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error(...args: unknown[]): void {
    if (__DEV__) {
      console.error(...args);
    }
  },
};
