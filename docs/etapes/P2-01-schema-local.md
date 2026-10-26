# P2-01 — Schéma Drizzle et base locale

- **Statut** : terminée
- **Branche** : `feat/p2-01-schema-local`
- **Phase** : 2 — Données locales, app sans compte

## Plan validé

Plan validé par Yanis le 26 octobre 2026.

### Contexte
La phase 1 est close : `src/domain` contient toutes les règles, testées à 100 %, mais rien n'est branché. La phase 2 commence par la base locale, dont tout le reste dépend (repositories, clôture des journées, écrans). Aujourd'hui l'app n'a aucune base locale : les données sont dans Supabase (`Tasks`, `Tags`, `Task_Tags`, `Profiles`, `Days`), quelques préférences dans AsyncStorage (`theme`, `colorTheme`, `fontSize`, langue). Ni `expo-sqlite` ni Drizzle ne sont installés.

Cette étape pose le socle : dépendances, schéma, migrations embarquées, ouverture de la base et application des migrations au lancement, et des tests qui prouvent que les migrations correspondent au schéma. **Aucun écran ne lit ni n'écrit encore dans la base.**

**Découpage** : la case « Écrire un repository par entité » (et la génération des UUID v7, l'indexation fractionnaire) fera P2-02.

### Périmètre
Case de la roadmap couverte, recopiée mot pour mot :
- [ ] Écrire le schéma Drizzle : `tasks` (date nulle = Box), `tags`, `task_tags`, `day_records` (avec la photo des tâches de `closeDay` : nom, état, tags avec nom et couleur), `rest_periods`, `goal`, `settings`, `reminders`, `outbox`. Toutes les tables ont `id` UUID, `created_at`, `updated_at` et `deleted_at`.

Sauf `outbox`, reportée en phase 4 (décision de Yanis, voir Questions). Plus l'ouverture de la base et l'application des migrations au lancement (« migrations embarquées », Architecture cible).

### Hors périmètre
- Repositories, hooks de `features/`, génération des UUID v7, clés d'ordre fractionnaires (P2-02).
- Toute lecture ou écriture de la base depuis l'app ; Supabase, AsyncStorage, Zustand et React Query restent inchangés.
- La liste des clés de `settings` (définie par chaque fonctionnalité branchée).
- Les plafonds de tags (3 par tâche, 5 en gratuit) : règles de domaine / droits, pas de contrainte SQL.
- La clôture des journées, l'ancrage de l'onboarding, la validation des statuts lus en base (cases suivantes).
- La logique de synchronisation (phase 4), Drizzle Studio.

### Modifications

#### 1. Dépendances
- `npx expo install expo-sqlite` (version du SDK 56).
- `npm install drizzle-orm@^0.45` ; `npm install -D drizzle-kit@^0.31 babel-plugin-inline-import@^3`.
- `cd ios && pod install` (module natif), puis rebuild Debug.
- **Pas de pilote SQLite natif pour les tests** : ils utilisent `node:sqlite`, intégré à Node 24 (`.nvmrc`). Vérifié : Jest 29 le charge (`jest-runtime` fait `require("node:sqlite")`). Si ça échoue malgré tout, l'implémenteur s'arrête et le signale (pas de `better-sqlite3` improvisé).

#### 2. Configuration
- `drizzle.config.ts` : `dialect: "sqlite"`, `driver: "expo"`, `schema: "./src/data/schema.ts"`, `out: "./src/data/migrations"`, `casing: "snake_case"`.
- `package.json` : script `db:generate` = `drizzle-kit generate`.
- `babel.config.js` : plugin `["inline-import", { extensions: [".sql"] }]` (les `.sql` deviennent des chaînes, dans l'app comme dans Jest).
- `metro.config.js` : ajouter `sql` à `resolver.sourceExts`.
- `.prettierignore` et `eslint.config.js` (ignores) : `src/data/migrations/` (code généré par drizzle-kit, jamais modifié à la main).
- Déclaration `declare module "*.sql"` si `tsc` en a besoin.

#### 3. `src/data/schema.ts` : le schéma
Noms SQL en snake_case. Colonnes communes à toutes les tables (une aide `baseColumns`) :
- `id` : `text` clé primaire (UUID, fourni par le repository en P2-02, pas de valeur par défaut) ;
- `created_at`, `updated_at` : `integer` horodatage en millisecondes, non nuls ;
- `deleted_at` : `integer` horodatage en millisecondes, nullable (suppression logique).

Les dates de journée sont des `DateKey` (`text`, `YYYY-MM-DD`), comme dans `src/domain`.

| Table | Colonnes propres | Contraintes |
|---|---|---|
| `tasks` | `name` text, `description` text (défaut `''`), `done` booléen, `date` text **nullable** (null = Box), `order_key` text, `delay_count` integer (défaut 0) | `delay_count >= 0` ; index `(date, order_key)` |
| `tags` | `name` text, `color` text | unique `name` parmi les lignes non supprimées (comme `UNIQUE (user_id, name)` dans Supabase) |
| `task_tags` | `task_id` → `tasks.id`, `tag_id` → `tags.id` | unique `(task_id, tag_id)` parmi les lignes non supprimées ; index sur `tag_id` |
| `day_records` | `key` text, `status` text, `tasks` text JSON (`RecordedTask[]` de `closeDay` : `id`, `name`, `done`, `tags` `{name, color}`) | unique `key` ; `status IN ('success','failed','empty','rest')` |
| `rest_periods` | `start_key` text, `end_key` text | `start_key <= end_key` |
| `goal` | `target` integer, `confirmed_key` text | `target IN (1,2,3,4,7,14)` |
| `settings` | `key` text, `value` text JSON | unique `key` |
| `reminders` | `enabled` booléen, `hour` 0-23, `minute` 0-59, `weekdays` text JSON (rangs 1-7 de `weekday`, pour « aux jours choisis, week-end compris »), `repeat_enabled` booléen, `repeat_count` 1-3, `repeat_delay_minutes` 15-240 | bornes en `CHECK` (celles de `lib/notificationLimits.ts`) |

Toutes les colonnes sont non nulles sauf `tasks.date` et `deleted_at`. 8 tables : `outbox` est reportée en phase 4. Les types TS des colonnes JSON et de `status` / `target` réutilisent ceux du domaine (`ClosedDayStatus`, `RecordedTask`, `GoalTarget`) via `$type<…>()`.

Non repris de Supabase, faute de règle qui s'en serve : `completed_at`, `resolved_at`, `resolution`, `carried_from_id`, `late_adjusted_at`, la table `Days` (remplacée par `day_records`).

`settings` en clé / valeur : une ligne par réglage, pour que la synchronisation « dernière écriture gagne par ligne » (phase 4) ne fasse pas perdre un réglage changé sur un autre appareil.

#### 4. `src/data/migrations/` (généré)
`npm run db:generate` produit `0000_*.sql`, `meta/` et `migrations.js`. Jamais édité à la main.

#### 5. `src/data/database.ts` : ouverture
- `openDatabaseSync("dun.db", { enableChangeListener: true })` (pour `useLiveQuery` plus tard).
- `PRAGMA foreign_keys = ON` et `PRAGMA journal_mode = WAL` à l'ouverture.
- `export const db = drizzle(sqlite, { schema, casing: "snake_case" })`.

#### 6. `src/data/useLocalDatabase.ts` et `app/_layout.tsx`
- Le hook enveloppe `useMigrations(db, migrations)` et renvoie `{ ready, error }`.
- `app/_layout.tsx` : le splash reste affiché tant que les migrations ne sont pas appliquées (même mécanisme que les polices, `SplashScreen.hideAsync` attend aussi `ready`). En cas d'échec : `logger.error` + `Sentry.captureException`, splash masqué, et l'écran d'erreur ci-dessous à la place du `Stack`. Aucune donnée n'est effacée.
- `src/ui/DatabaseErrorScreen.tsx` (nouveau, < 100 lignes) : titre et texte centrés, couleurs de `useTheme`, polices de l'app. Textes dans `locales/fr.yaml` et `locales/en.yaml` puis `npm run i18n:generate` :
  - FR : « Impossible d'ouvrir tes données » / « Redémarre Dun. Si le problème continue, contacte le support. »
  - EN : « Couldn't open your data » / « Restart Dun. If the problem continues, contact support. »
- Un test Jest rend l'écran et vérifie que les deux textes s'affichent.

#### 7. Tests : `src/data/schema.test.ts` (et un second fichier si > 300 lignes)
Base `node:sqlite` en mémoire, `PRAGMA foreign_keys = ON`, migrations appliquées depuis `migrations.js` (le fichier embarqué dans l'app, découpé sur `--> statement-breakpoint`).
- **Schéma = migrations** : pour chaque table de `schema.ts`, `PRAGMA table_info` donne exactement les colonnes de `getTableConfig(table)` (nom, type, non-nul, clé primaire).
- **Colonnes communes** : chaque table a `id` clé primaire, `created_at` et `updated_at` non nuls, `deleted_at` nullable.
- **Contraintes**, un test chacune : une tâche sans date est acceptée (Box) ; `delay_count` négatif refusé ; deux `day_records` à la même date refusés ; statut `provisional` refusé ; `goal.target = 5` refusé ; Repos avec `start_key > end_key` refusé ; bornes de `reminders` ; doublon actif dans `task_tags` refusé mais accepté après suppression logique du premier ; `task_tags` vers une tâche inexistante refusé (clé étrangère).

#### 8. Documentation
- `README.md` : section « Base locale » (`npm run db:generate` après toute modification de `schema.ts`, migrations jamais éditées, `pod install` après l'ajout d'`expo-sqlite`) ; arborescence avec `src/data`.
- Fichier d'étape et roadmap (agent principal) : cocher la case, retirer `outbox` de sa liste et l'ajouter à la case « Push » de la phase 4 (« … l'outbox locale (table `outbox`, créée à ce moment) … »), mettre à jour « État d'avancement ».

### Critères d'acceptation
- **CA1** : `expo-sqlite` (version SDK 56), `drizzle-orm`, `drizzle-kit` et `babel-plugin-inline-import` sont installés ; `npx expo install --check` ne signale aucun écart.
- **CA2** : `src/data/schema.ts` déclare les 8 tables de la case (sans `outbox`), avec `id`, `created_at`, `updated_at` et `deleted_at` sur chacune, `tasks.date` nullable et les contraintes du tableau.
- **CA3** : `src/data/migrations/` est généré par `npm run db:generate`, et une seconde exécution répond qu'il n'y a aucun changement.
- **CA4** : les tests de `src/data` appliquent `migrations.js` sur une base `node:sqlite` et prouvent que les colonnes correspondent au schéma et que chaque contrainte du tableau est appliquée.
- **CA5** : au lancement sur simulateur (Debug), les migrations s'appliquent avant que le splash ne disparaisse ; la base `dun.db` du conteneur de l'app contient les 8 tables ; l'app fonctionne comme avant, en clair et en sombre.
- **CA6** : un échec de migration est journalisé, envoyé à Sentry, masque le splash et affiche `DatabaseErrorScreen` (textes FR et EN), vérifié par le test Jest de l'écran et, sur simulateur, en forçant l'erreur temporairement (modification non conservée), en clair et en sombre.
- **CA7** : aucun écran, `lib/` ni `components/` n'importe `src/data` hormis `app/_layout.tsx` ; `src/domain` n'importe rien de `src/data`.
- **CA8** : `npm run check` passe sans erreur ni avertissement ; `src/domain` reste à 100 %.
- **CA9** : seuls sont modifiés les fichiers listés ci-dessus : `package.json`, `package-lock.json`, `drizzle.config.ts`, `babel.config.js`, `metro.config.js`, `.prettierignore`, `eslint.config.js`, `src/data/**`, `src/ui/DatabaseErrorScreen{,.test}.tsx`, `app/_layout.tsx`, `locales/{fr,en}.yaml`, `lib/i18n/resources.ts` (généré), `ios/Podfile.lock`, `README.md`, et éventuellement un fichier de déclaration `*.sql`.

### Vérification
```bash
npm run check
npm run db:generate   # doit répondre « No schema changes »
npx expo install --check
```
- Simulateur (Debug, après `pod install`) : lancement, splash puis écran habituel, en clair et en sombre ; puis
  `sqlite3 "$(xcrun simctl get_app_container booted com.dunapp.Dun data)/Documents/SQLite/dun.db" ".tables"` liste les 8 tables et `__drizzle_migrations`.
- Écran d'erreur : forcer temporairement l'erreur dans `useLocalDatabase`, capture en clair et en sombre, puis annuler la modification.
- Relancer l'app : les migrations ne se rejouent pas (une seule ligne dans `__drizzle_migrations`).
- `git status --short` pour le périmètre.

### Questions et risques
Réponses de Yanis (26 octobre 2026) :
1. **Périmètre** : schéma + ouverture de la base ; les repositories font P2-02.
2. **`outbox`** : reportée en phase 4 ; la mention passe de la case du schéma à la case « Push ».
3. **Échec des migrations** : écran d'erreur simple, FR/EN, sans effacer de données.

Points restants, sur lesquels je propose sans trancher le produit :
- **Textes de l'écran d'erreur** (ci-dessus) : à amender si besoin.
- **Colonnes non reprises** de Supabase (`completed_at`, `resolved_at`, `resolution`, `carried_from_id`, `late_adjusted_at`, `Days`) : aucune règle ne s'en sert ; le verrouillage est supprimé par sa propre case.
- **`description`** des tâches : gardée, c'est une fonction existante de la fiche tâche.
- **Rappels** : `weekdays` stocke des jours au choix, comme le dit l'offre, alors que l'app ne propose aujourd'hui que « week-end oui / non ». L'écran sera adapté par la case « Rappel quotidien local ».
- **Plafond gratuit des tags** : l'app applique 2 (`lib/plan.ts:19`), l'offre dit 5. Rien à faire ici (phase 3, `can()`), signalé pour mémoire.
- **Risque natif** : `expo-sqlite` est un module natif ; il faut `pod install` et un rebuild Debug. Rappel du README : les pods peuvent garder la variante Release (P0-04, R1-1).
- **Risque `node:sqlite`** dans Jest : vérifié par lecture de `jest-runtime`, pas encore exécuté. En cas d'échec, l'implémenteur s'arrête et je reviens vers toi (alternative : `better-sqlite3` en devDependency, module natif compilé en CI).
- **Synchronisation schéma / migrations** : le test « colonnes = schéma » ne couvre pas les index et `CHECK` ; ceux-ci sont couverts par les tests de contraintes. Pas de contrôle `drizzle-kit` en CI dans cette étape.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/data/database.ts:13-16` | La base s'ouvre à l'import du module (`openDatabaseSync` et les deux `PRAGMA`). Si l'ouverture échoue (fichier corrompu, disque plein), l'exception part au chargement de `app/_layout.tsx` : l'app plante au lieu d'afficher `DatabaseErrorScreen`. Le commentaire de l'écran (« cannot be opened or migrated ») promet plus que le code. CA6 ne vise que l'échec des migrations, donc le critère est atteint. | Ouvrir la base paresseusement dans `useLocalDatabase` (un `try`, l'erreur passe par le même chemin), maintenant ou en P2-02. |
| R1-2 | Non bloquant | `src/data/schema.test.ts:12` | Node affiche `ExperimentalWarning: SQLite is an experimental feature` pendant `npm run check`. Le code de sortie vaut 0, mais `CLAUDE.md` demande une vérification « sans aucun avertissement ». | Décision de Yanis : tolérer (avertissement d'exécution, pas de lint), ou le masquer, par exemple avec `NODE_OPTIONS=--disable-warning=ExperimentalWarning` dans le script `test:coverage`. Ce réglage masque aussi les autres avertissements expérimentaux. |
| R1-3 | Non bloquant | `src/data/schema.test.ts:1` | `/// <reference types="node" />` rend les types globaux de Node (`process`, `Buffer`…) visibles dans tout le programme `tsc`, l'app comprise. Ces types viennent de `@types/node@25`, dépendance transitive de Jest, et non d'une dépendance déclarée. | Ajouter `@types/node` en devDependency (version de Node 24), ou un `tsconfig` propre aux tests. |
| R1-4 | Non bloquant | `src/data/schema.ts:23` | `src/data` importe `lib/notificationLimits.ts`. C'est voulu par le plan (une seule source pour les bornes), mais `lib/` doit disparaître au fil de la phase 2. | Déplacer les bornes des rappels dans `src/domain` avec la case « Rappel quotidien local ». |
| R1-5 | Non bloquant | `package.json` | CA1 n'est atteint qu'en partie : `npx expo install --check` signale 6 correctifs publiés depuis pour des paquets que l'étape ne touche pas (`expo`, `expo-auth-session`, `expo-linking`, `expo-router`, `expo-splash-screen`, `jest-expo`). `expo-sqlite` est conforme. Les mettre à jour sortirait du périmètre. | Une petite étape `chore` à part, ou les aligner avec P2-02. |
| R1-6 | Non bloquant | `src/ui/DatabaseErrorScreen.tsx` | Le rendu en sombre de l'écran d'erreur n'a pas pu être vérifié. Sans session, `_layout` redirige vers `/onboarding/start`, et `ThemeContext` force les couleurs claires sur l'onboarding (comportement existant). Un utilisateur non connecté verrait donc l'écran en clair, même en mode sombre. | À vérifier avec une session connectée. Le thème de l'onboarding relève de sa propre case de la phase 2. |

Vérifié et correct :
- **CA1** (partiel, voir R1-5) : `expo-sqlite ~56.0.6`, `drizzle-orm ^0.45.4`, `drizzle-kit ^0.31.11`, `babel-plugin-inline-import ^3.0.0`. Comparaison de `package-lock.json` avec `master` par script : 89 paquets ajoutés, aucun retiré, aucune version changée. Le gros diff textuel n'est qu'un réalignement.
- **CA2** : 8 tables, `baseColumns()` partagé, `tasks.date` nullable, `CHECK` et index uniques partiels (`WHERE deleted_at IS NULL`) conformes au tableau du plan. La migration générée (`0000_ambiguous_saracen.sql`) a été relue.
- **CA3** : `npm run db:generate` répond « No schema changes, nothing to migrate ».
- **CA4** : `schema.test.ts` applique `migrations.js` sur `node:sqlite`. Il compare `PRAGMA table_info` à `getTableConfig`, vérifie les colonnes communes et teste chaque contrainte, plus les doublons de nom de tag et de clé de réglage.
- **CA5** : simulateur iPhone 17 Pro, Debug avec Metro, revérifié par l'agent principal. En clair puis en sombre : splash, puis l'onboarding habituel. En sombre, la mascotte devient blanche sur fond clair, défaut déjà connu (P0-04, R1-2). `dun.db` contient les 8 tables et `__drizzle_migrations`, en `journal_mode = wal`. Après relance, `__drizzle_migrations` compte toujours 1 ligne.
- **CA6** : `_layout` journalise l'erreur (`logger.error`), l'envoie à Sentry, masque le splash et rend `DatabaseErrorScreen`. Le test Jest vérifie les textes FR et EN. L'erreur forcée sur simulateur a été vérifiée par l'implémenteur, en clair seulement (R1-6), puis la modification a été annulée.
- **CA7** : seul `app/_layout.tsx` importe `src/data` ; `src/domain` n'importe rien de `src/data`.
- **CA8** : `npm run check` passe (17 suites, 321 tests). `src/domain` est à 100 % sur les 4 mesures, et `grep -rn "istanbul ignore" src` ne renvoie rien. Avertissement de Node : voir R1-2.
- **CA9** : `git status` ne liste que les fichiers prévus. `app.json`, modifié automatiquement par `npx expo install`, a été remis dans son état d'origine : le plugin `expo-sqlite` ne sert qu'à des options (FTS, SQLCipher), et le build fonctionne sans lui. `ios/` est ignoré par Git, donc `Podfile.lock` n'apparaît pas.

Aucun problème bloquant : pas de tour de correction.

## Revue — tour 2

Corrections demandées par Yanis après la remise : R1-1 et R1-3, traités comme bloquants.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème. | — |

Vérifié et correct :
- **R1-1 corrigé** :
  - `src/data/database.ts` n'a plus d'effet de bord à l'import. `openLocalDatabase()` ouvre la base au premier appel puis la réutilise. Si un `PRAGMA` échoue, il ferme le fichier puis relance l'erreur ; l'appel suivant réessaie.
  - `useLocalDatabase` exécute l'ouverture et `migrate()` dans un même `try` : toute erreur suit le chemin de `_layout`, qui journalise, envoie à Sentry et affiche l'écran d'erreur. `_layout` n'a pas changé.
  - Tests : `useLocalDatabase.test.ts` (5 tests, avec `./database` mocké) et `database.test.ts` (5 tests, avec `expo-sqlite` mocké). Le chemin « ouverture impossible → `error` » est donc couvert en deux maillons. Un test unique n'était pas possible : `jest.isolateModules` charge React en double.
- **R1-3 corrigé** : `@types/node ^24.19.2` est déclaré en devDependency, et la référence du test est conservée. Comparaison de `package-lock.json` avec `master` : aucun paquet retiré. Seuls `@types/node` (25.5.0 → 24.19.2, la copie déclarée remplace la copie transitive) et sa dépendance `undici-types` (7.18.2 → 7.24.6) changent de version.
- `npm run check` passe (19 suites, 331 tests). `src/domain` est à 100 %, et aucun `istanbul ignore` n'est présent.
- Simulateur, Debug sans rebuild natif, revérifié par l'agent principal : lancement en clair et en sombre, puis l'onboarding habituel, sans erreur dans Metro. `dun.db` contient les 8 tables, et une seule migration est enregistrée.

Aucun problème bloquant restant.

## Résultat

### Ce qui a été fait
- Dépendances : `expo-sqlite`, `drizzle-orm` ; en dev, `drizzle-kit` et `babel-plugin-inline-import`. Script `npm run db:generate`.
- Configuration : `drizzle.config.ts`, plugin Babel `inline-import` pour les `.sql`, extension `sql` dans Metro, `src/data/migrations/` ignoré par Prettier et ESLint.
- `src/data/schema.ts` : 8 tables (`tasks`, `tags`, `task_tags`, `day_records`, `rest_periods`, `goal`, `settings`, `reminders`), colonnes communes, contraintes et index ; types du domaine via `$type`.
- `src/data/migrations/` : migration initiale générée, avec `migrations.js` embarqué dans l'app.
- `src/data/database.ts` : `openLocalDatabase()` ouvre `dun.db` au premier appel (écouteur de changements, clés étrangères, WAL), sans effet de bord à l'import. `src/data/useLocalDatabase.ts` : ouverture et application des migrations au lancement, dans un même `try`.
- `app/_layout.tsx` : le splash attend la base ; en cas d'échec, l'erreur est journalisée et envoyée à Sentry, puis `src/ui/DatabaseErrorScreen.tsx` s'affiche (textes FR et EN).
- Tests : `src/data/schema.test.ts` (43 tests sur `node:sqlite`), `src/data/database.test.ts`, `src/data/useLocalDatabase.test.ts` et `src/ui/DatabaseErrorScreen.test.tsx`.
- `@types/node` (Node 24) déclaré en devDependency (R1-3).
- README : section « Base locale », commande `db:generate`, arborescence.

### Vérification finale
- `npm run check` : succès (typecheck, ESLint sans avertissement, Prettier, 19 suites et 331 tests). `src/domain` est à 100 %. Node affiche un `ExperimentalWarning` pour `node:sqlite` (R1-2).
- `npm run db:generate` : « No schema changes, nothing to migrate ».
- `npx expo install --check` : `expo-sqlite` est conforme ; 6 correctifs sont disponibles sur d'autres paquets (R1-5).
- Simulateur iPhone 17 Pro, Debug :
  - lancement en clair et en sombre, `dun.db` avec les 8 tables, migration non rejouée à la relance ;
  - écran d'erreur forcé, vérifié en clair (R1-6).

### Décisions
- Décisions de Yanis à la planification : schéma et ouverture seulement (repositories en P2-02) ; `outbox` reportée en phase 4 ; écran d'erreur simple en cas d'échec des migrations.
- `app.json` est inchangé : le plugin `expo-sqlite` ajouté par `npx expo install` est retiré, car il ne sert qu'aux options FTS et SQLCipher.
- Horodatages en `integer({ mode: "timestamp_ms" })` : stockés en millisecondes, lus comme des `Date`.
- `migrations.js` est typé `any` par TypeScript ; le test le transtype, et aucune déclaration `*.sql` n'a été nécessaire.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | Une base impossible à ouvrir fait planter l'app au lieu d'afficher l'écran d'erreur. | corrigé (tour 2) |
| R1-2 | `ExperimentalWarning` de Node pendant `npm run check`. | gardé tel quel : avertissement de Node à l'exécution, pas de lint |
| R1-3 | `/// <reference types="node" />` et `@types/node` transitif. | corrigé : `@types/node` déclaré en devDependency (tour 2) |
| R1-4 | `src/data` importe `lib/notificationLimits.ts`. | ajouté à la roadmap, case « Rappel quotidien local » (phase 2) |
| R1-5 | 6 correctifs Expo signalés par `npx expo install --check`. | ajouté à la roadmap, étape `chore` à part (phase 2, « Base locale ») |
| R1-6 | Écran d'erreur non vérifié en sombre (onboarding forcé en clair). | à vérifier par Yanis avec une session connectée |

## Pour l'étape suivante
- **P2-02, repositories** :
  - générer les `id` en UUID v7 et les clés d'ordre fractionnaires ;
  - remplir `created_at` et `updated_at` (des `Date`, stockées en millisecondes) ;
  - supprimer par `deleted_at`, et filtrer `deleted_at IS NULL` dans toutes les lectures ;
  - limiter à 3 tags par tâche et à un seul `goal` actif (ce ne sont pas des contraintes SQL) ;
  - obtenir la base par `openLocalDatabase()` (`src/data/database.ts`), et seulement après `ready` de `useLocalDatabase`.
- **Modifier le schéma** : `npm run db:generate`, puis committer la nouvelle migration ; `schema.test.ts` échoue si on l'oublie. Une migration déjà livrée ne se modifie jamais.
- **`day_records.tasks` et `status`** sont lus en JSON et en texte : valider le statut avant `streak` et `goalProgress` (case « Valider les statuts de journée lus en base »).
- **Build** : `expo run:ios` relance `pod install`, qui échoue sans `LANG=en_US.UTF-8` (Ruby 4). Utiliser `--no-install`, ou exporter `LANG` et `LC_ALL`. Après l'ajout d'`expo-sqlite`, un `rm -rf ios/Pods && pod install` a été nécessaire (`Sealable::Sealable()`, cas décrit dans le README).
- **`outbox`** : à concevoir en phase 4, avec la case « Push ».
