const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const localesDir = path.resolve(__dirname, "..", "locales");
const outputFile = path.resolve(__dirname, "..", "lib", "i18n", "resources.ts");

const files = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith(".yaml"))
  .sort();

const resources = files.reduce((acc, file) => {
  const locale = path.basename(file, ".yaml");
  const contents = fs.readFileSync(path.join(localesDir, file), "utf8");
  acc[locale] = {
    translation: yaml.load(contents),
  };
  return acc;
}, {});

const generated = `export const resources = ${JSON.stringify(resources, null, 2)} as const;\n\nexport type ResourceLanguage = keyof typeof resources;\n`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, generated, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputFile)}`);
