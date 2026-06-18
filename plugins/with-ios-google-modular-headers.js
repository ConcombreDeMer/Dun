const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const PODFILE_TARGET = "target 'Dun' do";
const GOOGLE_UTILITIES_POD =
  "  pod 'GoogleUtilities', :modular_headers => true";
const RECAPTCHA_INTEROP_POD =
  "  pod 'RecaptchaInterop', :modular_headers => true";

module.exports = function withIosGoogleModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (
        contents.includes(GOOGLE_UTILITIES_POD) &&
        contents.includes(RECAPTCHA_INTEROP_POD)
      ) {
        return config;
      }

      contents = contents.replace(
        PODFILE_TARGET,
        [
          PODFILE_TARGET,
          GOOGLE_UTILITIES_POD,
          RECAPTCHA_INTEROP_POD,
        ].join("\n")
      );

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
