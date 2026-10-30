# P2-04 — Repositories des journées, du Repos, de l'objectif, des réglages et du rappel

- **Statut** : terminée
- **Branche** : `feat/p2-04-repositories-journees-reglages`
- **Phase** : 2 — Données locales, app sans compte

## Plan validé

Plan validé par Yanis le 30 octobre 2026, sans amendement.

### Contexte
P2-03 a posé la forme commune des repositories (fabrique avec `RepositoryOptions`, lectures renvoyées sous forme de requêtes Drizzle non exécutées et filtrées sur `deleted_at IS NULL`, écritures synchrones avec `now()`, `DataError`, `createTestDatabase()` et `testRepositoryOptions()`). Elle a écrit `tasks`, `tags` et `task_tags`. La case « Écrire un repository par entité » avait été coupée en deux (décision de Yanis, 29 octobre 2026) : P2-04 la termine avec les cinq tables restantes. Aucun écran n'importe encore les repositories, et cette étape n'en branche aucun. Les hooks de `features/` viendront avec leur écran (décision de P2-03).

Piège signalé par P2-03 : `settings_key_unique` et `day_records_key_unique` ne sont **pas partiels**. Une clé supprimée logiquement ne peut pas être recréée par un `INSERT` : il faut réutiliser la ligne existante (`deleted_at` remis à `null`).

### Périmètre
Case de la roadmap, terminée par cette étape (`day_records`, `rest_periods`, `goal`, `settings`, `reminders`) :
- [ ] Écrire un repository par entité. Les écrans ne parlent qu'aux hooks de `features/`, qui appellent `domain/` et `data/`.

La case sera cochée à la fin de l'étape, avec des liens vers P2-03 et P2-04.

### Hors périmètre
- Tout branchement dans un écran, les hooks de `features/`. `app/`, `lib/` et `components/` restent inchangés.
- La clôture des journées (quand appeler `record`, l'ancrage de l'onboarding, le rafraîchissement à minuit) : case « Clôturer les journées ». Le repository fournit seulement `record` et `lastKey`.
- La validation des statuts lus en base avant `streak` et `goalProgress` : case à part.
- Le déplacement de `NOTIFICATION_REMINDER_LIMITS` dans `src/domain` et la validation des jours du rappel (`weekdays` : rangs 1 à 7, sans doublon) : case « Rappel quotidien local ». Les bornes restent garanties par les `CHECK` SQL.
- La liste des clés de `settings` et le typage de leurs valeurs : case « Réglages d'affichage ».
- Les droits Dun+ (répétitions du rappel) : phase 3.
- Toute modification du schéma (aucune migration nouvelle), et toute nouvelle dépendance.
- Les points non bloquants de P2-03 laissés de côté (copie de `transformIgnorePatterns`, `cause` circulaire, etc.).

### Modifications

Tous les repositories suivent la forme de P2-03 (voir `src/data/repositories/tags.ts` et `tasks.ts`) : `createXRepository(options: RepositoryOptions)`, `repositoryDefaults`, type de ligne tiré de `$inferSelect`, lectures non exécutées, écritures synchrones qui remplissent `updated_at` (et `created_at` à la création), suppression logique, `db.transaction` pour toute écriture qui lit puis écrit ou touche plusieurs lignes. Moins de 300 lignes par fichier, tests compris.

### 1. `src/data/errors.ts`
Ajouter le code `"already_recorded"` : une journée déjà enregistrée (non supprimée) ne s'enregistre pas une seconde fois.

### 2. `src/data/repositories/dayRecords.ts`
L'enregistrement d'une journée close « ne change plus » (offre) : pas de `update` ni de `remove`.

| Fonction | Comportement |
|---|---|
| `list()` | Enregistrements non supprimés, par `key` croissante. |
| `listRange(startKey, endKey)` | Même chose entre les deux clés incluses (statistiques, calendrier). |
| `get(key)` | L'enregistrement de la journée `key`, ou `undefined`. |
| `lastKey()` | Requête de la plus grande `key` enregistrée (pour `openDayKey` et `dayKeysToClose`). |
| `record(records: readonly DayRecord[])` | Dans **une transaction**, enregistre les journées reçues (le `DayRecord` de `closeDay`, `src/domain/dayRecord.ts`). Si une clé est déjà enregistrée et non supprimée : `DataError("already_recorded")`, et rien n'est écrit. Une ligne de même clé supprimée logiquement est réutilisée : nouveau statut, nouvelles tâches, `deleted_at = null`, même `id`. Moyen suggéré : `insert … onConflictDoUpdate({ target: dayRecords.key, set, setWhere: deleted_at IS NOT NULL })`, puis `changes === 0` ⇒ `already_recorded`. |

### 3. `src/data/repositories/restPeriods.ts`
Les règles du Repos restent dans `src/domain/rest.ts` ; le repository les applique, comme `tasks.move` applique `moveTask`.

| Fonction | Comportement |
|---|---|
| `list()` | Périodes non supprimées, par `start_key` puis `id` (pour `isRestDay`, `currentRest`, `closeDay`). |
| `start(openKey, endKey)` | Dans une transaction : lit les périodes actives, appelle `startRest`, insère la période. Renvoie la ligne créée. Les `RangeError` du domaine remontent telles quelles (chevauchement, fin avant le jour ouvert, clé invalide). |
| `cancel(id, openKey)` | Appelle `cancelRest`. Résultat `null` (Repos commencé le jour ouvert) ⇒ suppression logique ; sinon `end_key` devient la veille du jour ouvert. `not_found` si la période est absente ou supprimée. |
| `changeEnd(id, newEndKey, openKey)` | Appelle `changeRestEnd`, puis met à jour `end_key`. `not_found` comme ci-dessus. |

### 4. `src/data/repositories/goal.ts`
Un seul objectif actif.

| Fonction | Comportement |
|---|---|
| `get()` | Requête de l'objectif actif : la ligne non supprimée la plus récente (`updated_at` décroissant, puis `id`), `limit 1`. L'ordre rend la lecture déterministe même si deux lignes actives coexistaient un jour (synchronisation, phase 4). |
| `set({ target, confirmedKey })` | Dans une transaction : met à jour l'objectif actif s'il existe (même `id`), sinon en crée un. Renvoie la ligne. Une cible hors `GOAL_TARGETS` est refusée par le type et par le `CHECK`. |

### 5. `src/data/repositories/settings.ts`
Une ligne par réglage (clé / valeur JSON), valeur de type `unknown` : le typage par clé viendra avec la case « Réglages d'affichage ».

| Fonction | Comportement |
|---|---|
| `list()` | Réglages non supprimés, par `key`. |
| `get(key)` | Le réglage `key`, ou `undefined`. |
| `set(key, value)` | Crée ou remplace la valeur. Une ligne de même clé supprimée logiquement est réutilisée (`deleted_at = null`, même `id` et même `created_at`). Moyen suggéré : `onConflictDoUpdate` sur `settings.key`. |
| `remove(key)` | Suppression logique (retour à la valeur par défaut de l'app). `not_found` si la clé est absente ou déjà supprimée. |

### 6. `src/data/repositories/reminders.ts`
Un seul rappel quotidien (offre : « Rappel quotidien à l'heure et aux jours choisis »), même forme que `goal`.

| Fonction | Comportement |
|---|---|
| `get()` | Le rappel actif, même règle que `goal.get()`. |
| `set(values)` | `values` = toutes les colonnes métier (`enabled`, `hour`, `minute`, `weekdays`, `repeatEnabled`, `repeatCount`, `repeatDelayMinutes`). Met à jour le rappel actif ou le crée, dans une transaction. Les bornes sont garanties par les `CHECK` SQL. |

### 7. Tests
Un fichier de test par repository, sur `createTestDatabase()` et `testRepositoryOptions()`. Ils couvrent chaque ligne des tableaux, en particulier :
- une ligne supprimée logiquement n'apparaît dans aucune lecture ;
- les horodatages valent l'horloge injectée, et `created_at` ne change pas lors d'une mise à jour ;
- `dayRecords.record` : plusieurs journées dans une transaction ; une clé déjà enregistrée ⇒ `already_recorded` et **aucune** journée du lot écrite ; réutilisation d'une ligne supprimée (supprimée à la main dans le test) ; `lastKey` vide puis renseigné ; la photo des tâches (JSON) relue à l'identique ;
- `restPeriods` : `start` refuse un chevauchement sans rien écrire ; `cancel` le jour du début supprime la période, `cancel` un jour suivant la raccourcit à la veille ; `changeEnd` plus tôt et plus tard ; `not_found` sur une période supprimée ;
- `goal` et `reminders` : premier `set` crée, second `set` met à jour la même ligne (une seule ligne en base) ; `get()` choisit la ligne la plus récente si deux lignes actives existent (insérées à la main) ; une valeur hors bornes est refusée par la base ;
- `settings` : `set` crée puis remplace ; `remove` puis `set` réutilise la même ligne ; `remove` d'une clé absente ⇒ `not_found` ;
- vérification de type : `useLiveQuery(repo.list())`, `get`, `lastKey`, etc. passent `tsc` dans des fonctions jamais appelées, comme en P2-03.

### 8. Documentation (agent principal)
Fichier d'étape et roadmap : case cochée avec liens vers P2-03 et P2-04, « État d'avancement » mis à jour. Le README (« un repository par table ») reste exact : pas de modification.

### Critères d'acceptation
- **CA1** : `createDayRecordRepository` fait tout ce que décrit le tableau 2 ; `record` est atomique, refuse une journée déjà enregistrée par `already_recorded` et réutilise une ligne supprimée. Les tests le prouvent.
- **CA2** : `createRestPeriodRepository` fait tout ce que décrit le tableau 3, en passant par `startRest`, `cancelRest` et `changeRestEnd` de `src/domain/rest.ts`, sans recopier leurs règles. Les tests le prouvent.
- **CA3** : `createGoalRepository` et `createReminderRepository` gardent une seule ligne active : `set` met à jour la ligne existante ou en crée une, et `get` est déterministe. Les tests le prouvent.
- **CA4** : `createSettingsRepository` fait tout ce que décrit le tableau 5, y compris la réutilisation d'une clé supprimée malgré l'index unique non partiel.
- **CA5** : toute lecture filtre `deleted_at IS NULL`. Toute écriture remplit `updated_at` (et `created_at` à la création) avec l'horloge injectée. Aucun `.delete(` dans `src/data/repositories`.
- **CA6** : les lectures renvoient des requêtes acceptées par `useLiveQuery` (vérification de type).
- **CA7** : rien dans `app/`, `lib/` ni `components/` n'importe `src/data/repositories` ou `src/data/testing`. `src/domain` n'importe rien de `src/data`.
- **CA8** : `npm run check` passe sans erreur ni avertissement de lint (l'`ExperimentalWarning` de `node:sqlite` est déjà toléré, P2-01 R1-2). `src/domain` reste à 100 %. `npm run db:generate` répond « No schema changes ».
- **CA9** : seuls les fichiers prévus sont modifiés : `src/data/errors.ts` (et son test si besoin), `src/data/repositories/{dayRecords,restPeriods,goal,settings,reminders}.ts` et leurs tests, éventuellement un utilitaire de test dans `src/data/testing/`, plus le fichier d'étape et la roadmap.

### Vérification
```bash
npm run check
npm run db:generate   # « No schema changes »
git status --short
grep -rnE "src/data/(repositories|testing)" app lib components
grep -rn "\.delete(" src/data/repositories
```
Pas de vérification sur simulateur : l'interface ne change pas, et aucun écran n'importe le nouveau code.

### Questions et risques
1. **Journée déjà enregistrée** : je propose de **refuser** (`already_recorded`, lot entier annulé) plutôt que d'ignorer en silence. Un doublon signalerait un bug de la clôture, et l'enregistrement « ne change plus ». À amender si tu préfères qu'un second enregistrement soit ignoré.
2. **Objectif et rappel uniques** : `set` met à jour la ligne active au lieu d'en créer une nouvelle (pas d'historique des objectifs). Le changement d'objectif lui-même (quand, avec quelle `confirmedKey`) sera décidé avec l'écran Profil, en phase 3.
3. **Synchronisation (phase 4)** : deux appareils peuvent créer chacun leur ligne `goal`, `reminders` ou `settings` (même clé, `id` différents). En « dernière écriture gagne par ligne », cela donnerait deux objectifs actifs, ou un conflit sur `settings_key_unique`. `get()` reste déterministe, mais la vraie règle est à définir en phase 4. Je propose de le noter dans « Pour l'étape suivante », sans modifier la roadmap.
4. **`onConflictDoUpdate` et l'adaptateur de test** : l'adaptateur de `createTestDatabase()` distingue lecture et écriture par `statement.columns()` (P2-03, R1-4). Un upsert sans `RETURNING` reste une écriture, donc `changes` est juste. À surveiller si l'implémenteur utilise `.returning()`.
5. **Rien ne vérifie `weekdays`** (doublons, valeurs hors 1 à 7) en dehors du type TypeScript : ce sera traité par la case « Rappel quotidien local », qui déplacera aussi les bornes dans `src/domain`.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Bloquant | `src/data/repositories/settings.ts:48` (`set`) | `value: unknown` accepte `null` et `undefined`, mais la colonne `value` est `NOT NULL` et Drizzle n'encode pas `null` en `"null"` : `set(key, null)` échoue en `NOT NULL constraint failed` (constaté par l'implémenteur). L'API accepte donc une valeur qui plante, ce qui est un bug du code neuf. Le défaut vient du plan, qui demandait `unknown`. | Typer le paramètre `value` par une valeur JSON non nulle, par exemple `type SettingValue = string \| number \| boolean \| readonly SettingValue[] \| { readonly [key: string]: SettingValue }`, exportée depuis `settings.ts`. Ne pas toucher au schéma. Ajouter un test de type (`// @ts-expect-error` sur `set("k", null)` et `set("k", undefined)`, dans une fonction jamais appelée). |
| R1-2 | Non bloquant | `src/domain/rest.ts` (`changeRestEnd`) | Allonger un Repos ne vérifie pas le chevauchement avec les autres périodes. C'est sans effet aujourd'hui, puisqu'un Repos commence toujours le jour ouvert, mais deux appareils synchronisés pourraient le contourner. | À noter pour la phase 4 (synchronisation). |
| R1-3 | Non bloquant | `goal.ts`, `reminders.ts` (`newestFirst`) | Second critère de tri : `id` décroissant. Le plan disait seulement « puis `id` ». Ce choix reste cohérent avec « la plus récente », puisque les UUID v7 suivent le temps. | Garder. |
| R1-4 | Non bloquant | `dayRecords.record`, `restPeriods.cancel` et `changeEnd`, `settings.set` et `remove` | Ces fonctions ne renvoient rien : le plan ne précisait pas de retour. Les lectures en direct suffisent aux écrans. | Garder. |

Vérifié et correct :
- **CA1** : `record` fait un `insert … onConflictDoUpdate` par journée (cible `key`, `setWhere: deleted_at IS NOT NULL`), dans une seule transaction, et lève `already_recorded` quand `changes === 0` (`dayRecords.ts:72-108`). Les tests couvrent le lot, le refus sans aucune écriture, le doublon dans un même lot, la réutilisation d'une ligne supprimée (même `id` et même `created_at`), la photo JSON relue à l'identique, `lastKey` vide puis renseigné, et `listRange` avec ses deux bornes.
- **CA2** : `restPeriods.ts` importe `startRest`, `cancelRest` et `changeRestEnd`, sans recopier leurs règles. Chaque écriture lit puis écrit dans une transaction. Les tests couvrent le chevauchement refusé sans écriture, l'annulation le jour du début (suppression logique) et un jour suivant (fin à la veille), `changeEnd` plus tôt et plus tard, `not_found`, et les `RangeError` du domaine.
- **CA3** : `goal.set` et `reminders.set` mettent à jour la ligne active la plus récente ou en créent une, dans une transaction. `get` est déterministe (testé avec deux lignes actives et un `updated_at` égal). Les valeurs hors bornes sont refusées par les `CHECK`. `reminders.set` ignore les colonnes non métier.
- **CA4** : `settings.set` est un upsert sur `key` qui réutilise une clé supprimée (même `id` et même `created_at`). `remove` d'une clé absente ou déjà supprimée lève `not_found`.
- **CA5** : chaque lecture filtre `deleted_at IS NULL`, et chaque fichier de test a un cas « absent de toute lecture ». Les horodatages valent l'horloge injectée. `grep -rn "\.delete(" src/data/repositories` ne renvoie rien.
- **CA6** : `useLiveQuery` est appliqué à chaque lecture, dans des fonctions jamais appelées, et `tsc` l'accepte.
- **CA7** : `grep -rnE "src/data/(repositories|testing)" app lib components` ne renvoie rien, et `src/domain` n'importe rien de `src/data`.
- **CA8** : `npm run check` sort avec le code 0 (relancé par l'agent principal) : 33 suites et 497 tests, `src/domain` à 100 %. `npm run db:generate` répond « No schema changes ».
- **CA9** : `git status` ne liste que `src/data/errors.ts`, les cinq repositories, leurs tests et le fichier d'étape. Tous les fichiers font moins de 210 lignes.

### Vérification du tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème. | — |

Vérifié et correct :
- **R1-1 corrigé** (`src/data/repositories/settings.ts:17-24` et `:53`) : `SettingValue` (une valeur JSON non nulle) est exporté, et `set(key, value: SettingValue)` remplace `unknown`. L'en-tête du fichier explique pourquoi `null` est exclu. Le schéma n'a pas changé.
- Un test de type dans `settings.test.ts:83-86` : `set("k", null)` et `set("k", undefined)` sont placés sous `// @ts-expect-error`. Une directive inutile ferait échouer `tsc`, donc le refus est bien vérifié.
- `npm run check` réussit (relancé par l'agent principal) : 33 suites et 498 tests, `src/domain` à 100 %.
- Le diff du tour ne touche que `settings.ts` et `settings.test.ts`.

Aucun problème bloquant restant.

## Résultat

### Ce qui a été fait
- **`src/data/errors.ts`** : nouveau code `already_recorded`.
- **`src/data/repositories/`**, même forme que P2-03 (fabrique, lectures non exécutées et filtrées sur `deleted_at IS NULL`, écritures synchrones avec `now()`) :
  - `createDayRecordRepository` : `list`, `listRange`, `get`, `lastKey` et `record` (lot atomique, `already_recorded` si une journée est déjà enregistrée, réutilisation d'une ligne supprimée par `onConflictDoUpdate … setWhere`) ;
  - `createRestPeriodRepository` : `list`, `start`, `cancel` et `changeEnd`, qui appliquent `startRest`, `cancelRest` et `changeRestEnd` de `src/domain/rest.ts` ;
  - `createGoalRepository` et `createReminderRepository` : `get` (ligne active la plus récente, `updated_at` puis `id` décroissants) et `set` (mise à jour de la ligne active, ou création) ;
  - `createSettingsRepository` : `list`, `get`, `set` (upsert sur `key`, valeur `SettingValue`, réutilisation d'une clé supprimée) et `remove`.
- **Tests** : un fichier par repository, sur `createTestDatabase()` et `testRepositoryOptions()`.

### Vérification finale
- `npm run check` : succès (typecheck, ESLint sans avertissement, Prettier, 33 suites et 498 tests). `src/domain` est à 100 %. Seul l'`ExperimentalWarning` de `node:sqlite`, déjà toléré (P2-01, R1-2), apparaît.
- `npm run db:generate` : « No schema changes, nothing to migrate ».
- `grep -rnE "src/data/(repositories|testing)" app lib components` et `grep -rn "\.delete(" src/data/repositories` ne renvoient rien.
- Pas de vérification sur simulateur : aucun écran n'importe le nouveau code.

### Décisions
- Plan validé sans amendement : une journée déjà enregistrée est refusée (`already_recorded`, lot entier annulé) ; l'objectif et le rappel ont une seule ligne active, mise à jour en place, sans historique.
- `SettingValue` exclut `null` : la colonne est `NOT NULL`, et Drizzle n'encode pas `null` en JSON (R1-1).
- Le suffixe `Row` (`DayRecordRow`, `RestPeriodRow`, `GoalRow`) évite le conflit avec les types de `src/domain`.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-2 | `changeRestEnd` ne vérifie pas le chevauchement quand on allonge un Repos. | ajouté à la roadmap (phase 4, « Compte et synchronisation ») |
| R1-3 | Second critère de tri `id` décroissant dans `goal.get` et `reminders.get`. | gardé tel quel |
| R1-4 | `record`, `cancel`, `changeEnd`, `settings.set` et `remove` ne renvoient rien. | gardé tel quel |

## Pour l'étape suivante
- **La case « Écrire un repository par entité » est close.** Les hooks de `features/` s'écrivent avec leur écran, sur les fabriques de `src/data/repositories/`.
- **Clôture des journées** : `dayRecords.lastKey()` donne la dernière journée enregistrée, mais pas l'ancrage de l'onboarding (la veille de l'installation, sans enregistrement). Il faudra le stocker, par exemple dans `settings`, et prendre le plus tardif des deux pour `openDayKey` et `dayKeysToClose`. `record` refuse une journée déjà enregistrée : en cas de clôtures concurrentes (lancement et retour au premier plan), relire `lastKey` dans la même passe.
- **Statuts lus en base** : `dayRecords` renvoie le `status` tel qu'il est stocké. La validation avant `streak` et `goalProgress` reste à faire (case dédiée).
- **Synchronisation (phase 4)** : deux appareils peuvent créer chacun leur ligne `goal`, `reminders` ou `settings` (`id` différents). `get()` reste déterministe, mais il donnerait deux objectifs actifs en base, et un conflit sur `settings_key_unique`. La règle est à définir avec les cases « Push » et « Pull ». Même chose pour l'allongement d'un Repos (R1-2).
- **`settings`** : le typage par clé (et les valeurs par défaut) vient avec la case « Réglages d'affichage ». `SettingValue` exclut `null` : pour « pas de valeur », utiliser `remove`.
- **Premier branchement d'un écran** : les vérifications listées en P2-03 restent à faire (Metro et `fractional-indexing`, `isUniqueViolation` sur `expo-sqlite`, `newId` sous Hermes). S'y ajoute `onConflictDoUpdate … setWhere` sur `expo-sqlite`, testé seulement sous `node:sqlite`.
