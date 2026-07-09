const { withInfoPlist, withXcodeProject } = require("@expo/config-plugins");

function getIosBuildNumber(config) {
  return config.ios?.buildNumber;
}

function withIosInfoPlistBuildNumber(config) {
  return withInfoPlist(config, (config) => {
    const buildNumber = getIosBuildNumber(config);

    if (buildNumber) {
      config.modResults.CFBundleVersion = buildNumber;
    }

    return config;
  });
}

function withIosXcodeBuildNumber(config) {
  return withXcodeProject(config, (config) => {
    const buildNumber = getIosBuildNumber(config);

    if (!buildNumber) {
      return config;
    }

    const buildConfigurations =
      config.modResults.pbxXCBuildConfigurationSection();

    for (const buildConfiguration of Object.values(buildConfigurations)) {
      if (
        buildConfiguration &&
        typeof buildConfiguration === "object" &&
        buildConfiguration.buildSettings
      ) {
        buildConfiguration.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
      }
    }

    return config;
  });
}

module.exports = function withIosBuildNumber(config) {
  config = withIosInfoPlistBuildNumber(config);
  config = withIosXcodeBuildNumber(config);
  return config;
};
