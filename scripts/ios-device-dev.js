/*
 * Build Release sur l'iPhone branché, avec les variables de `.env.development`
 * (base de dev). Voir docs/environnements.md, section « Tester un build
 * Release sur l'iPhone avec la base de dev ».
 *
 * Un build Release lit normalement `.env.production`. Les variables présentes
 * dans l'environnement du processus passent avant tous les fichiers `.env*` :
 * on y impose donc celles de `.env.development` avant de lancer le build.
 *
 * Les messages n'affichent que des noms de variables, jamais de valeur.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const envFile = path.join(projectRoot, ".env.development");
const exampleFile = path.join(projectRoot, ".env.example");

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!fs.existsSync(envFile)) {
  fail(
    "Fichier .env.development introuvable à la racine du projet.\n" +
      "Le créer à partir de .env.example (voir docs/environnements.md), puis relancer.",
  );
}

if (!fs.existsSync(exampleFile)) {
  fail("Fichier .env.example introuvable : impossible de vérifier les noms.");
}

// Le parseur d'Expo (`@expo/env`), résolu depuis le paquet `expo` : mêmes
// règles que le bundle (guillemets, commentaires, expansion `${VAR}`).
const { parseEnvFiles } = require(
  require.resolve("@expo/env", {
    paths: [require.resolve("expo/package.json")],
  }),
);

// `systemEnv: {}` : l'expansion `${VAR}` ne lit que le fichier, pas le shell.
const parseFile = (file) => parseEnvFiles([file], { systemEnv: {} }).env;

const devEnv = parseFile(envFile);
const publicNames = (env) =>
  Object.keys(env).filter((name) => name.startsWith("EXPO_PUBLIC_"));

// Une variable absente de `.env.development` serait prise dans
// `.env.production` : on s'arrête plutôt que de mélanger dev et prod.
const missing = publicNames(parseFile(exampleFile)).filter(
  (name) => !(name in devEnv),
);
if (missing.length > 0) {
  fail(
    "Variables absentes de .env.development (elles seraient prises dans .env.production) :\n" +
      missing.map((name) => `  - ${name}`).join("\n") +
      "\nLes ajouter (voir .env.example), puis relancer.",
  );
}

// Les valeurs de `.env.development` s'imposent à celles du shell.
const overridden = Object.keys(devEnv).filter(
  (name) => process.env[name] !== undefined,
);
if (overridden.length > 0) {
  console.warn(
    `Variables du shell remplacées par .env.development : ${overridden.join(", ")}`,
  );
}

const childEnv = { ...process.env, ...devEnv };
console.log(
  "Variables de .env.development chargées. Build Release (base de dev)…",
);

const result = spawnSync(
  "npx",
  ["expo", "run:ios", "--configuration", "Release", "--device"],
  { cwd: projectRoot, stdio: "inherit", env: childEnv },
);

if (result.error) {
  fail(`Impossible de lancer expo : ${result.error.message}`);
}

process.exit(result.status ?? 1);
