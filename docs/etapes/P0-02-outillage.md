# P0-02 — Outillage

- **Statut** : terminée
- **Branche** : `chore/p0-02-outillage`
- **Phase** : 0 — Assainir

## Plan validé

### Contexte

P0-01 a ramené `npm run lint` à 0 avertissement et posé `lib/logger.ts` + la règle `no-console`. La phase 0 se termine quand « la CI est verte sur `master` et `npm run check` passe sans aucun avertissement ». Cette étape crée tout l'outillage nécessaire à ce critère. Il restera ensuite les sections « Environnements » et « Documentation et Git ».

Constats faits pendant l'exploration :
- `npx tsc --noEmit` : 7 erreurs, toutes dans `supabase/functions/beta-signup/index.ts` (imports `https://`, global `Deno`). `tsconfig.json` inclut `**/*.ts` sans `exclude`.
- `npx eslint .` : 5 erreurs. `no-undef '__dirname'` dans `scripts/generate-i18n.js` (2) et `scripts/fix-expo-macros-plugin.js` (1), `import/no-unresolved` sur les 2 imports Deno. `npm run lint` (`expo lint`) ne les voit pas.
- `.github/workflows/quality.yml` et `.nvmrc` **n'existent plus** dans le dépôt (l'audit les décrivait comme non suivis). Il n'y a donc rien à supprimer : on crée la CI et un `.nvmrc` neufs.
- Deno n'est pas installé localement ; la CLI `supabase` l'est.
- Style dominant du code : guillemets doubles (705 imports contre 235) et points-virgules. Les réglages par défaut de Prettier correspondent.
- `lib/i18n/resources.ts` est généré par `scripts/generate-i18n.js` (`JSON.stringify`). Le reformater ferait échouer `format:check` à chaque `npm run i18n:generate`.
- Un checkout propre, sans `expo-env.d.ts` ni `.expo/` (tous deux ignorés par Git), passe déjà `tsc` hors `beta-signup`. La CI n'a donc pas besoin de fichiers générés par `expo start`.

Décisions de Yanis prises pendant la planification :
- **Node** : `.nvmrc` à `24` (LTS). Yanis passera sa machine de Node 25 à Node 24.
- **Portée de Prettier** : code seulement (JS, TS, JSON). Le Markdown et `locales/*.yaml` sont exclus.
- **Découpage** : une seule étape pour les 5 cases « Outillage » et la case `CLAUDE.md`.

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] Exclure `supabase/functions` de `tsconfig.json` et lui donner sa propre configuration Deno. Corriger au passage les erreurs que `npx eslint .` signale hors de `npm run lint` : `no-undef '__dirname'` dans `scripts/*.js` et `import/no-unresolved` sur les imports Deno (voir [P0-01, R1-4](P0-01-menage.md)).
- [ ] Ajouter Prettier et formater tout le dépôt en un seul commit dédié.
- [ ] Ajouter Jest (`jest-expo`) et `@testing-library/react-native`, avec un premier test.
- [ ] Ajouter les scripts `typecheck`, `lint`, `test`, `format:check` et `check` (qui enchaîne les quatre).
- [ ] Supprimer le `.github/workflows/quality.yml` non suivi et le remplacer par une CI simple : `npm ci`, puis `npm run check`, à chaque PR et sur `master`. Garder `.nvmrc`.
- [ ] Mettre à jour la section « Vérification » de `CLAUDE.md` une fois `npm run check` créé.

### Hors périmètre

- Le code de `supabase/functions/beta-signup` (imports, logique) : seule sa configuration change. Son sort (projet séparé ou suppression) relève de la phase 4.
- `deno check` / `deno lint` en CI : Deno n'est pas installé et la fonction sera reprise en phase 4.
- `eslint-plugin-prettier` (Prettier lancé par ESLint) : Prettier tourne séparément via `format:check`.
- Tout test métier : il viendra avec `src/domain` en phase 1. Pas de test sur `lib/date.ts`, qui sera remplacé.
- Profils EAS, projets Supabase, README, branches : autres cases de la phase 0.
- Toute modification de logique dans le code de l'app. Le diff de l'app doit être du pur formatage.

### Modifications

#### 1. TypeScript et Deno
- `tsconfig.json` : ajouter `"exclude": ["node_modules", "supabase/functions"]` (définir `exclude` remplace la valeur par défaut, d'où `node_modules` explicite).
- `supabase/functions/deno.json` : configuration Deno minimale pour les fonctions (`compilerOptions` stricts, `lint`, `fmt` si utile). Pas de changement des imports de `index.ts`.
- `.vscode/settings.json` : `"deno.enablePaths": ["supabase/functions"]`, pour que l'éditeur traite ce dossier en Deno. Les réglages existants restent.
- `eslint.config.js` :
  - ajouter `supabase/functions/**` aux `ignores` (le code Deno relève de `deno lint`) ;
  - un bloc `files: ['scripts/**', 'plugins/**']` avec les globales Node (`globals.node`). Ajouter `globals` en devDependency explicite.

#### 2. Prettier
- devDependencies : `prettier`, `eslint-config-prettier`.
- `.prettierrc.json` : réglages par défaut de Prettier (guillemets doubles, points-virgules, `printWidth` 80, `trailingComma` `all`), écrits explicitement pour la lisibilité.
- `.prettierignore` : `ios/`, `android/`, `.expo/`, `node_modules/`, `dist/`, `package-lock.json`, `*.md`, `locales/`, `lib/i18n/resources.ts` (fichier généré), `supabase/migrations/`, `supabase/.temp/`.
- `eslint.config.js` : ajouter `eslint-config-prettier` en dernier, pour désactiver les règles de style qui contrediraient Prettier.
- Formater tout le dépôt avec `npm run format`.

#### 3. Jest et Testing Library
- Installer avec `npx expo install --dev` (versions alignées sur Expo 56) : `jest`, `jest-expo`, `@types/jest`, `@testing-library/react-native`, et leurs pairs requis (`test-renderer`, `@react-native/jest-preset`).
- `jest.config.js` : `preset: 'jest-expo'`. Fichier de mise en place (`jest.setup.ts`) seulement si nécessaire, limité aux mocks officiels (par exemple celui d'AsyncStorage).
- Convention : tests à côté du fichier testé, en `*.test.ts(x)`.
- Premiers tests :
  - `lib/logger.test.ts` : `logger.warn` / `logger.error` appellent la console quand `__DEV__` est vrai, et ne l'appellent pas sinon ;
  - `components/headline.test.tsx` : rendu de `Headline` dans ses vrais fournisseurs (`ThemeContext`, `FontContext`), le titre et le sous-titre sont affichés. Ce test prouve que la chaîne React Native + Reanimated + fournisseurs fonctionne sous Jest. **Si faire tourner ces fournisseurs demande plus que des mocks officiels, s'arrêter et le signaler** au lieu de bricoler.

#### 4. Scripts `package.json`
- `typecheck` : `tsc --noEmit`
- `lint` : `eslint . --max-warnings 0` (couvre désormais `scripts/` et `plugins/`, contrairement à `expo lint`)
- `test` : `jest`
- `format` : `prettier --write .` (nécessaire pour le commit de formatage)
- `format:check` : `prettier --check .`
- `check` : `npm run typecheck && npm run lint && npm run format:check && npm run test`

#### 5. CI
- `.nvmrc` : `24`.
- `.github/workflows/ci.yml` : sur `pull_request` et sur `push` vers `master`. Un job `ubuntu-latest` : checkout, `actions/setup-node` avec `node-version-file: .nvmrc` et le cache npm, `npm ci`, `npm run check`. Aucun secret requis.

#### 6. Documentation
- `CLAUDE.md`, section « Vérification » : `npm run check` devient la vérification de référence (avec la liste de ce qu'il enchaîne). Retirer la mention des erreurs connues de `beta-signup`. Garder la consigne simulateur.
- `.claude/agents/implementeur.md` et le skill n'ont pas besoin de changer : ils renvoient à la section « Vérification » de `CLAUDE.md`.

#### 7. Organisation des commits (donnée à Yanis à la fin)
Le formatage doit tenir dans un commit à part. Les fichiers modifiés à la main (configs, `package.json`, `scripts/*.js` s'ils changent, tests, CI, `CLAUDE.md`, docs d'étape) sont tous distincts des fichiers seulement reformatés. Yanis fera donc trois commits :
1. `chore(P0-02): …` : les fichiers modifiés à la main (déjà formatés), ajoutés nommément ;
2. `style(P0-02): format repository with prettier` : tout le reste (`git add -A`), du formatage pur ;
3. `chore(P0-02): ignore formatting commit in git blame` : `.git-blame-ignore-revs` avec le hash du commit 2 (GitHub l'applique automatiquement ; la fusion sans squash conserve le hash).

L'implémenteur fournit la liste exacte des fichiers modifiés à la main dans son rapport.

### Critères d'acceptation

- **CA1** — `npm run typecheck` : 0 erreur. `tsconfig.json` exclut `supabase/functions` ; `supabase/functions/deno.json` existe.
- **CA2** — `npm run lint` (`eslint . --max-warnings 0`) : 0 erreur, 0 avertissement, `scripts/` et `plugins/` compris. `supabase/functions` est ignoré par ESLint.
- **CA3** — `npm run format:check` passe. `.prettierignore` exclut le Markdown, `locales/`, `lib/i18n/resources.ts` et les dossiers générés. `eslint-config-prettier` est le dernier élément de la config ESLint.
- **CA4** — Après `npm run i18n:generate`, `git status` ne montre aucun changement et `npm run format:check` passe toujours.
- **CA5** — `npm run test` : les tests de `lib/logger.test.ts` et `components/headline.test.tsx` passent, sans avertissement dans la sortie (ni `act(...)`, ni `console.error`).
- **CA6** — `package.json` contient `typecheck`, `lint`, `test`, `format`, `format:check` et `check`. `npm run check` enchaîne les quatre vérifications et sort en 0, sans aucun avertissement.
- **CA7** — `.nvmrc` vaut `24` ; `.github/workflows/ci.yml` déclenche sur les PR et sur `push` vers `master`, lance `npm ci` puis `npm run check`, sans secret.
- **CA8** — Un checkout propre (seulement les fichiers suivis ou à suivre, sans `.env`, `.expo/`, `expo-env.d.ts`, ni `node_modules`) passe `npm ci && npm run check`.
- **CA9** — Les fichiers qui ne sont pas dans la liste « modifiés à la main » ne contiennent que du formatage : pour chacun, `git show master:<f> | npx prettier --stdin-filepath <f>` est identique au fichier de la branche.
- **CA10** — La section « Vérification » de `CLAUDE.md` désigne `npm run check` comme vérification de référence.
- **CA11** — L'app démarre sur le simulateur iOS et l'accueil s'affiche, en clair et en sombre (contrôle de non-régression après le formatage global).

### Vérification

```bash
npm run check
```

```bash
npm run i18n:generate && git status --short
```

- **CA8** : copier les fichiers suivis et non ignorés dans le scratchpad (`git ls-files -co --exclude-standard` + `rsync`, sans `.env*`), puis `npm ci && npm run check` dans cette copie. Ça simule la CI.
- **CA9** : boucle sur les fichiers modifiés, hors liste « à la main », comparant la sortie de Prettier sur la version `master` au fichier de la branche.
- Simulateur iOS (build de dev, Metro sur le port 8082 comme en P0-01) : accueil, ouverture de la création de tâche, statistiques, réglages, en clair puis en sombre.
- La CI elle-même ne tournera qu'une fois la branche poussée par Yanis : à confirmer sur la PR.

### Questions et risques

- **Versions Jest / RNTL** : RNTL 14 dépend de `test-renderer` et `jest-expo` 56 de `@react-native/jest-preset` 0.85. `npx expo install` doit choisir les versions compatibles. Si la mise en place des fournisseurs dans le test de `Headline` dérape, l'implémenteur s'arrête et on décide ensemble (par exemple, un composant sans fournisseur).
- **Node 24 en CI, Node 25 en local** jusqu'au changement de version sur la machine de Yanis. Sans effet attendu sur `check`.
- **Taille du diff** : le formatage touche presque tous les fichiers de code, mais il est isolé dans le commit 2 et vérifié mécaniquement (CA9). La partie à relire reste petite : configs, scripts, deux tests, CI, `CLAUDE.md`.
- **`lint` passe de `expo lint` à `eslint .`** : même config, mais couverture élargie à `scripts/` et `plugins/`. Rien d'autre ne dépend du nom de la commande.
- **Roadmap** : la case CI parle de supprimer `quality.yml` et de « garder » `.nvmrc`, mais aucun des deux n'existe plus. On crée les fichiers neufs ; la case sera cochée telle quelle, avec la précision dans le fichier d'étape.
- Rien dans l'offre commerciale ne concerne cette étape.

## Revue — tour 1

L'implémenteur s'est arrêté sur CA5, comme le plan le prévoyait. Importer `lib/ThemeContext.tsx` ou `lib/FontContext.tsx` charge `lib/supabase.ts`, qui appelle `createClient` dès l'import (`lib/supabase.ts:8`). Sous Jest, l'URL est vide, d'où l'erreur `supabaseUrl is required.`

Décisions de Yanis à ce stade (amendements au plan) :
- **Test de `Headline`** : `jest.mock("@/lib/supabase")` dans le test, avec un faux `auth.getUser` qui ne renvoie aucun utilisateur. Aucun appel réseau n'est possible.
- **`assets/`** : exclu de Prettier. Prettier avait reformaté les JSON minifiés (animations Lottie, `assets/icon.icon/icon.json`), soit environ 23 000 lignes de plus. Ce sont des fichiers produits par des outils.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Bloquant | `components/headline.test.tsx` | CA5, CA6 et CA8 non atteints : le test ne se charge pas (`supabaseUrl is required.`), donc `npm run check` échoue. | Dans le test, `jest.mock("@/lib/supabase", …)` avec un `supabase.auth.getUser` qui résout `{ data: { user: null }, error: null }`. Ne rien ajouter d'autre au mock que ce qu'exige le rendu. Le test doit passer sans avertissement. |
| R1-2 | Bloquant | `.prettierignore`, `assets/**/*.json` | Les JSON de `assets/` sont reformatés (décision de Yanis : les exclure). | Ajouter `assets/` à `.prettierignore` et remettre les fichiers de `assets/` dans leur état de `master` (`git checkout master -- assets`). `git diff --stat -- assets` doit être vide. |
| R1-3 | Non bloquant | `tsconfig.json:11` | L'`exclude` remplace celui de `expo/tsconfig.base`, qui excluait aussi `babel.config.js`, `metro.config.js`, `jest.config.js`, `android` et `ios`. Sans effet aujourd'hui (aucun de ces fichiers n'entre dans `tsc`), mais l'écart vient du plan. | Reprendre la liste de la base et y ajouter `supabase/functions`. |
| R1-4 | Non bloquant | `.github/workflows/ci.yml:13,15` | `actions/checkout@v4` et `actions/setup-node@v4` ont deux versions majeures de retard (v7 sorties en 2026), et la v4 tourne sur le runtime Node 20 que GitHub retire. | Passer aux versions majeures courantes. |
| R1-5 | Non bloquant | `eslint.config.js:18` | `ignores: ["dist/*"]` est dans le même objet que `rules` : ce n'est pas un ignore global. Préexistant. | Le déplacer dans l'objet d'ignore global. |

Vérifié et correct :
- `npm run typecheck`, `npm run lint` et `npm run format:check` passent ; `lib/logger.test.ts` passe (4 tests).
- CA1 à CA4, CA7, CA9 et CA10, d'après le rapport, avec relecture des fichiers modifiés à la main : configs, scripts, CI, `CLAUDE.md`, tests et `deno.json`.
- Écarts acceptés :
  - `"types": ["jest"]` dans `tsconfig.json`, parce que TypeScript 6 ne charge plus les `@types` par défaut ;
  - l'ignore global d'ESLint dans un objet à part ;
  - `@react-native/jest-preset` aligné sur `0.85.3`, comme le demande `jest-expo` 56.

## Revue — tour 2

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème bloquant. | — |

Vérifié et correct :
- **R1-1 corrigé** : `components/headline.test.tsx` ne mocke que `supabase.auth.getUser` (aucun utilisateur), sans variable d'environnement factice.
- **R1-2 corrigé** : `assets/` est dans `.prettierignore`, et `git diff -- assets` est vide.
- `npm run check` (relancé par l'agent principal) sort en 0. Les 5 tests passent ; la sortie ne contient ni avertissement, ni `act(...)`, ni `console.error` (CA1, CA2, CA3, CA5, CA6).
- **CA4** : `npm run i18n:generate` ne change rien à `git status`.
- **CA8** : copie propre (fichiers suivis et non ignorés, sans `.env*`, `.expo/`, `expo-env.d.ts` ni `node_modules`), avec les variables `EXPO_PUBLIC_SUPABASE_*` retirées de l'environnement : `npm ci` puis `npm run check` passent.
- **CA9** : sur les 111 fichiers de formatage seul, `git show master:<f> | npx prettier --stdin-filepath <f>` est identique au fichier.
- **CA11** : sur l'iPhone 17 Pro, avec le build de dev et Metro sur le port 8082, l'app démarre. En clair puis en sombre, l'accueil, la feuille de création de tâche, les statistiques et les réglages (index, Affichage) s'affichent ; le thème a ensuite été remis sur « Clair ». Metro ne remonte aucune erreur. Le seul avertissement, `Linking found multiple possible URI schemes`, existait déjà.

Observé, sans lien avec l'étape :
- **R2-1 (non bloquant)** : sur l'écran Affichage, le titre « Affichage » chevauche son sous-titre. Prettier ne change pas la sémantique du code, et CA9 prouve que le fichier n'est que du formatage : le défaut existait donc avant l'étape.

## Revue — tour 3 (demande de Yanis)

Après la remise du travail, Yanis a suivi les recommandations sur les problèmes non bloquants : R1-3, R1-4 et R1-5 sont corrigés dans cette étape, et R2-1 est ajouté à la roadmap (phase 2). Ce tour ne compte pas dans la limite des 3 tours de correction.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-3 | Demande de Yanis | `tsconfig.json` | L'`exclude` remplace celui de `expo/tsconfig.base`. | Reprendre les exclusions de la base (`node_modules`, `babel.config.js`, `metro.config.js`, `jest.config.js`, `android`, `ios`) et y ajouter `supabase/functions`. |
| R1-4 | Demande de Yanis | `.github/workflows/ci.yml` | Actions en v4, sur le runtime Node 20. | `actions/checkout@v7` et `actions/setup-node@v7` : ces versions gardent les entrées `node-version-file` et `cache` et tournent sur `node24` (vérifié dans leur `action.yml`). |
| R1-5 | Demande de Yanis | `eslint.config.js` | `ignores: ["dist/*"]` n'est pas global. | Déplacer `dist/*` dans l'objet d'ignore global, à côté de `supabase/functions/**`. |

Vérifié et correct après correction :
- `tsconfig.json` : l'`exclude` reprend la liste de la base, plus `supabase/functions`. `tsc --listFilesOnly` ne remonte aucun fichier du projet sous `ios/` ou `android/`, ni aucune config JS. Il remonte seulement `node_modules/expo-symbols/build/android/*`, que les types d'`expo-symbols` importent : un fichier importé ne peut pas être exclu, et ce n'est pas le dossier natif du projet.
- `.github/workflows/ci.yml` : `actions/checkout@v7` et `actions/setup-node@v7` ; le reste est inchangé.
- `eslint.config.js` : `ignores: ["dist/*", "supabase/functions/**"]` est dans l'objet global, et l'objet qui porte les `rules` n'a plus d'`ignores`.
- `npm run check` : sortie 0, 5 tests, aucun avertissement. CA9 : 111 fichiers, 0 écart. CA8 (copie propre, sans variables Supabase) : `npm ci && npm run check` passe.
- R2-1 est ajouté à la phase 2 de `docs/roadmap.md`, juste après la case des réglages d'affichage.

## Résultat

### Ce qui a été fait
- **TypeScript et Deno** :
  - `tsconfig.json` exclut `supabase/functions` et charge les types `jest` ;
  - `supabase/functions/deno.json` est créé ;
  - `.vscode/settings.json` active Deno sur ce dossier.
- **ESLint** :
  - ignore global de `supabase/functions/**` ;
  - globales Node pour `scripts/` et `plugins/` ;
  - `eslint-config-prettier` en dernier.
  
  `npm run lint` passe à `eslint . --max-warnings 0`.
- **Prettier** :
  - configuration explicite (réglages par défaut) ;
  - `.prettierignore` exclut le Markdown, `locales/`, `assets/`, `lib/i18n/resources.ts` et les dossiers générés ;
  - 111 fichiers reformatés.
- **Jest** :
  - `jest-expo`, `@testing-library/react-native` et `test-renderer` ;
  - `jest.setup.ts`, qui ne contient que le mock officiel d'AsyncStorage ;
  - tests `lib/logger.test.ts` (4) et `components/headline.test.tsx` (1).
- **Scripts** : `typecheck`, `lint`, `test`, `format`, `format:check`, `check`.
- **CI** : `.nvmrc` (24) et `.github/workflows/ci.yml` (`npm ci`, puis `npm run check`, sur les PR et sur `push` vers `master`).
- **`CLAUDE.md`** : la section « Vérification » renvoie à `npm run check`.

### Vérification finale
- `npm run check` : sortie 0, aucun avertissement, 5 tests passent.
- Simulation de la CI sur une copie propre : `npm ci && npm run check` passe.
- Formatage pur vérifié sur les 111 fichiers (CA9).
- Simulateur iOS : aucune régression constatée, en clair et en sombre.
- La CI GitHub elle-même tournera sur la PR, une fois la branche poussée.

### Décisions
- `.nvmrc` à 24 (LTS) ; Prettier limité au code (JS, TS, JSON) ; une seule étape pour toute la section Outillage (Yanis, à la planification).
- Test de `Headline` : `@/lib/supabase` mocké dans le test (Yanis, tour 1).
- `assets/` exclu de Prettier (Yanis, tour 1).
- Écarts au plan acceptés :
  - `"types": ["jest"]`, nécessaire avec TypeScript 6 ;
  - ignore ESLint global dans un objet à part ;
  - `@react-native/jest-preset` aligné sur `0.85.3`.
- Roadmap, case CI : `quality.yml` et `.nvmrc` n'existaient plus. Les fichiers ont été créés neufs.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-3 | L'`exclude` du `tsconfig` remplace celui de `expo/tsconfig.base` | corrigé (tour 3) |
| R1-4 | `actions/checkout` et `actions/setup-node` en v4, alors que la v7 existe ; la v4 tourne sur Node 20, retiré par GitHub | corrigé (tour 3) |
| R1-5 | `ignores: ["dist/*"]` d'ESLint n'est pas un ignore global (préexistant) | corrigé (tour 3) |
| R2-1 | Titre « Affichage » qui chevauche son sous-titre (préexistant) | ajouté à la roadmap (phase 2, réglages d'affichage) |

## Pour l'étape suivante
- **Vérification** : `npm run check`, à faire passer sans avertissement. Pour corriger le formatage : `npm run format`.
- **Tests** :
  - à côté du fichier testé, en `*.test.ts(x)` ;
  - tout composant qui importe `ThemeContext` ou `FontContext` charge `lib/supabase.ts`, qui crée le client dès l'import : il faut le mocker comme dans `components/headline.test.tsx` ;
  - le problème disparaîtra quand la phase 2 retirera Supabase de ces fournisseurs.
- **TypeScript 6** ne charge plus les `@types` automatiquement : un nouveau paquet de types global doit être ajouté à `compilerOptions.types`.
- **Formatage** : le commit de formatage est listé dans `.git-blame-ignore-revs`. Garder la fusion par commit de merge, pour que son hash reste valide.
- **Node** : la CI tourne en Node 24 (`.nvmrc`). Passer la machine locale en Node 24 pour éviter les écarts.
- **Deno** : `supabase/functions` n'est ni typé, ni linté, ni testé en CI. À reprendre en phase 4 avec la fonction elle-même.
