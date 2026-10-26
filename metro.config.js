const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

/* The drizzle-kit migrations (`.sql`) are bundled, inlined by Babel. */
config.resolver.sourceExts.push("sql");

module.exports = config;
