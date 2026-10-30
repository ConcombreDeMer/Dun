# P2-03 — Repositories des tâches et des tags

- **Statut** : terminée
- **Branche** : `feat/p2-03-repositories-taches-tags`
- **Phase** : 2 — Données locales, app sans compte

## Plan validé

Plan validé par Yanis le 29 octobre 2026.

### Contexte
P2-01 a créé la base locale (`dun.db`, 8 tables, migrations appliquées au lancement), et P2-02 a aligné les dépendances. Aucun code n'écrit encore dans la base. Avant de reconstruire les écrans, il faut un **guichet par table** (repository) qui applique partout les mêmes règles : identifiant UUID v7 généré sur l'appareil, `created_at` et `updated_at`, suppression logique par `deleted_at` filtrée dans toutes les lectures, ordre fractionnaire.

**Découpage** (décision de Yanis, 29 octobre 2026) : la case est coupée en deux étapes.
- **P2-03** (celle-ci) : les outils communs, puis `tasks`, `tags` et `task_tags`.
- **P2-04** : `day_records`, `rest_periods`, `goal`, `settings` et `reminders`.

**Hooks de `features/`** (décision de Yanis, 29 octobre 2026) : chacun sera écrit avec son écran (Home, Box, Daily…). Aucun dans cette étape. Les lectures des repositories renvoient des requêtes Drizzle non exécutées, utilisables telles quelles par `useLiveQuery`.

Rien ne change dans l'app : aucun écran n'importe les repositories.

### Périmètre
Case de la roadmap, couverte **en partie** (`tasks`, `tags`, `task_tags`) :
- [ ] Écrire un repository par entité. Les écrans ne parlent qu'aux hooks de `features/`, qui appellent `domain/` et `data/`.

La case reste non cochée jusqu'à P2-04.

### Hors périmètre
- Repositories de `day_records`, `rest_periods`, `goal`, `settings` et `reminders` (P2-04).
- Les hooks de `features/` et tout branchement dans un écran. `lib/`, `components/` et `app/` restent inchangés.
- La clôture des journées, le refus des dates antérieures au premier jour et la validation des statuts lus en base : ce sont des cases à part.
- Le plafond de tags par offre (5 en gratuit, phase 3, `can()`), et `lib/plan.ts` (`FREE_TAG_LIMIT = 2`, `MAX_TAGS_PER_TASK`) : il disparaît avec les écrans.
- La validation des noms (longueur, nom vide) : c'est le rôle de l'interface reconstruite, sans règle de l'offre.
- `src/data/schema.test.ts` : il garde son propre code d'application des migrations.
- Toute modification du schéma (aucune migration nouvelle).

### Modifications

#### 1. Dépendance
- `npm install fractional-indexing@3.2.0`, en version exacte. Cette bibliothèque de Rocicorp est en pur JS, publiée en ESM uniquement. Aucun module natif : pas de `pod install`.
- `jest.config.js` : `transformIgnorePatterns` reprend la liste de `jest-expo` et y ajoute `fractional-indexing`, pour que Jest transforme ce paquet ESM. Un commentaire explique pourquoi.

#### 2. `src/data/ids.ts` : UUID v7
- `uuidV7(timeMs: number, random: Uint8Array): string` est une fonction pure. Elle suit la RFC 9562 :
  - 48 bits d'horodatage en millisecondes ;
  - version `7` ;
  - variant `10` ;
  - 74 bits aléatoires, pris dans 10 octets ;
  - le format `8-4-4-4-12` en minuscules.
- `newId(): string` vaut `uuidV7(Date.now(), getRandomBytes(10))`, avec `getRandomBytes` d'`expo-crypto` (déjà installé). Hermes n'a pas de `crypto.getRandomValues` global.
- Pas de compteur monotone dans une même milliseconde : aucune règle ne trie par `id`, puisque l'ordre passe par `order_key`.
- Tests :
  - format, version et variant ;
  - horodatage relu depuis les 12 premiers caractères hexadécimaux ;
  - deux `id` de la même milliseconde sont différents ;
  - `newId` avec `expo-crypto` mocké sur `node:crypto` ;
  - refus d'un `random` de mauvaise taille ou d'un horodatage hors bornes (`RangeError`).

#### 3. `src/data/orderKeys.ts` : ordre fractionnaire
Un fichier très court qui isole la bibliothèque : `orderKeyBetween(before: string | null, after: string | null): string`, qui appelle `generateKeyBetween`. `null` désigne le début ou la fin de la liste.

Tests :
- clé avant la première, après la dernière, entre deux voisines ;
- 50 insertions successives en tête et au même endroit restent dans l'ordre (comparaison de chaînes, comme `ORDER BY` de SQLite) ;
- erreur si `before >= after`.

#### 4. `src/domain/tags.ts` : règle « 3 tags maximum sur une tâche »
L'offre dit : « trois tags maximum sur une tâche ». La règle est la même en gratuit et en Dun+, donc c'est une règle métier, pas un droit.
- `MAX_TAGS_PER_TASK = 3`.
- `assertTaskTagIds(tagIds: readonly string[]): void` lève une `RangeError` si un `id` apparaît deux fois ou s'il y en a plus de 3.
- `src/domain/tags.test.ts` : 0, 3, 4 tags et un doublon, avec des tests nommés d'après la phrase de l'offre. La couverture reste à 100 %.

#### 5. `src/data/testing/testDatabase.ts` : base de test
- `createTestDatabase(): LocalDatabase` ouvre une base `node:sqlite` en mémoire, active `PRAGMA foreign_keys = ON` et applique `migrations.js`, comme `schema.test.ts`.
- Il l'enveloppe ensuite dans un petit adaptateur qui expose l'API synchrone d'`expo-sqlite` dont se sert le pilote Drizzle `drizzle-orm/expo-sqlite` :
  - `prepareSync(sql)` ;
  - `executeSync(params)`, qui renvoie `changes`, `lastInsertRowId`, `getAllSync()` et `getFirstSync()` ;
  - `executeForRawResultSync(params).getAllSync()`, en mode tableau (`setReturnArrays`).
- Il rend enfin `drizzle(adaptateur, { schema, casing: "snake_case" })`. Les tests exercent ainsi **le même pilote et les mêmes migrations que l'app**, sur un vrai SQLite.
- Il n'est importé que par les tests. `/// <reference types="node" />`, comme `schema.test.ts`. Un test vérifie l'adaptateur lui-même : insertion, lecture, transaction annulée.

#### 6. Forme commune des repositories (`src/data/repositories/`)
- Chaque repository est une fabrique : `createTaskRepository({ db, now = () => new Date(), newId = ids.newId })`. Les tests injectent une horloge et des `id` fixes.
- Chaque **lecture** renvoie la requête Drizzle sans l'exécuter. Les tests l'exécutent avec `.all()` ou `.get()` ; un hook la passera plus tard à `useLiveQuery`. Elle filtre toujours `deleted_at IS NULL`.
- Chaque **écriture** s'exécute de façon synchrone, comme le pilote. Elle remplit `updated_at = now()`, et à la création `created_at = updated_at`. Une écriture sur plusieurs lignes passe par `db.transaction`.
- **Supprimer** renseigne `deleted_at` et `updated_at` ; aucune ligne n'est effacée.
- **Erreurs** : `src/data/errors.ts` définit `DataError` avec un `code` (`"not_found"`, `"duplicate_tag_name"`, `"invalid_neighbors"`). Une ligne supprimée compte comme introuvable.
- Chaque fichier fait moins de 300 lignes, tests compris ; au-delà, on découpe.

#### 7. `src/data/repositories/tasks.ts`
Le type `Task` vient de `tasks.$inferSelect`.
| Fonction | Comportement |
|---|---|
| `listDay(key)` | Tâches non supprimées datées `key`, par `order_key` puis `id`. |
| `listBox()` | Même chose pour `date IS NULL`. |
| `listRange(startKey, endKey)` | Tâches datées entre les deux clés incluses, par `date`, `order_key` et `id` (pour le calendrier, les statistiques et la clôture). |
| `get(id)` | Une tâche non supprimée, ou `undefined`. |
| `create({ name, description?, date })` | `done = false`, `delay_count = 0`, placée **en tête** de sa journée (ou de la Box), comme aujourd'hui (`app/(tabs)/home.tsx:709` trie par `order` décroissant, la plus récente en haut). |
| `update(id, { name?, description?, done? })` | Ne change jamais la date : seul `move` le fait. |
| `move(id, targetKey, openKey)` | Applique `moveTask` (`src/domain/postpone.ts`) : nouvelle date, `delay_count` + 1 seulement pour un report. La tâche est placée en tête de la journée cible. Si la date ne change pas, il ne se passe rien. Les `DateKey` invalides remontent en `RangeError`, celle du domaine. |
| `place(id, previousId, nextId)` | Réordonne dans la même journée : la clé est calculée entre celles des voisines, et **une seule ligne** est modifiée. `DataError("invalid_neighbors")` si une voisine est d'un autre jour, supprimée ou mal ordonnée. |
| `remove(id)` | Dans une transaction, supprime logiquement la tâche et ses liens `task_tags` actifs. |

#### 8. `src/data/repositories/tags.ts`
| Fonction | Comportement |
|---|---|
| `list()` | Tags non supprimés, triés par nom, comme aujourd'hui (`lib/tags.ts`). |
| `create({ name, color })`, `update(id, { name?, color? })` | Un nom déjà porté par un tag actif donne `DataError("duplicate_tag_name")`. On traduit l'erreur de l'index unique, sans faire de lecture préalable. La comparaison tient compte de la casse, comme `UNIQUE (user_id, name)` dans Supabase. |
| `remove(id)` | Dans une transaction, supprime logiquement le tag et ses liens actifs. Le nom redevient disponible. |

#### 9. `src/data/repositories/taskTags.ts`
| Fonction | Comportement |
|---|---|
| `listForTasks(taskIds)` | Lignes `{ taskId, tag }` des liens actifs vers des tags actifs, jointes à `tags` et triées par nom de tag (pour afficher les tags d'une liste de tâches). |
| `setForTask(taskId, tagIds)` | Appelle `assertTaskTagIds`, puis vérifie que la tâche et chaque tag existent et ne sont pas supprimés (`not_found` sinon). Dans une transaction, il supprime logiquement les liens retirés, insère les nouveaux et laisse les liens conservés intacts, `updated_at` compris. |

#### 10. Tests des repositories
Un fichier de test par repository, sur `createTestDatabase()`, avec une horloge injectée. Ils couvrent chaque ligne des tableaux ci-dessus, en particulier :
- une tâche supprimée n'apparaît dans aucune lecture ;
- `create` place la nouvelle tâche en tête ;
- `place` ne modifie que la ligne déplacée (les `updated_at` des voisines sont inchangés) ;
- `move` d'une tâche non faite d'une journée close vers la journée ouverte : `delay_count` + 1 ;
- `move` depuis la Box, ou vers un jour clos : `delay_count` inchangé ;
- `remove` d'une tâche ou d'un tag : les liens disparaissent de `listForTasks` ;
- un nom de tag en double est refusé, puis accepté après suppression du premier ;
- `setForTask` refuse un quatrième tag, un doublon, un tag supprimé ou une tâche supprimée, sans rien modifier ;
- les horodatages valent l'horloge injectée.

Un test vérifie le type à la compilation : `useLiveQuery(repo.listDay(key))` est accepté par `tsc`, sans être exécuté.

#### 11. Documentation
- `README.md`, section « Base locale » : quelques lignes sur les repositories (fabrique, lectures sous forme de requêtes, suppression logique) et sur `createTestDatabase`.
- Fichier d'étape et roadmap (agent principal) : la case reste non cochée, et « État d'avancement » indique la partie faite et P2-04 comme prochaine étape.

### Critères d'acceptation
- **CA1** : `fractional-indexing@3.2.0` est la seule dépendance ajoutée. `package-lock.json` n'ajoute que ce paquet, sans changer de version ailleurs.
- **CA2** : `uuidV7` produit des UUID v7 conformes à la RFC 9562 (version, variant, horodatage), et `newId` tire son aléa d'`expo-crypto`. Les tests le prouvent.
- **CA3** : `orderKeyBetween` produit des clés qui se trient comme voulu en comparaison de chaînes, en tête, en fin et au milieu. Les tests le prouvent.
- **CA4** : `src/domain/tags.ts` applique « trois tags maximum sur une tâche » et refuse les doublons. `src/domain` reste couvert à 100 %.
- **CA5** : `createTestDatabase()` exécute le pilote `drizzle-orm/expo-sqlite` sur `node:sqlite` avec les migrations embarquées, et son propre test passe.
- **CA6** : le repository des tâches fait tout ce que décrit le tableau 7. Pour `move`, il passe par `moveTask`, et `delay_count` n'augmente que pour un report. Les tests le prouvent.
- **CA7** : les repositories des tags et des liens font tout ce que décrivent les tableaux 8 et 9 : unicité du nom, réutilisation après suppression, 3 tags maximum par tâche, liens retirés en cascade logique.
- **CA8** : toute lecture filtre `deleted_at IS NULL`. Toute écriture remplit `updated_at` (et `created_at` à la création) avec l'horloge injectée, et aucune ligne n'est jamais effacée.
- **CA9** : les lectures renvoient des requêtes acceptées par `useLiveQuery` (vérification de type).
- **CA10** : rien dans `app/`, `lib/` ni `components/` n'importe `src/data/repositories` ou `src/data/testing`. `src/domain` n'importe rien de `src/data`.
- **CA11** : `npm run check` passe sans erreur ni avertissement de lint. L'`ExperimentalWarning` de `node:sqlite` est déjà toléré (P2-01, R1-2).
- **CA12** : seuls les fichiers prévus sont modifiés :
  - `package.json`, `package-lock.json` et `jest.config.js` ;
  - `src/data/{ids,orderKeys,errors}.ts` et leurs tests ;
  - `src/data/testing/**` et `src/data/repositories/**` ;
  - `src/domain/tags{,.test}.ts` ;
  - `README.md`.

### Vérification
```bash
npm run check
npm run db:generate   # « No schema changes » : le schéma n'a pas bougé
git status --short
```
```bash
grep -rnE "src/data/(repositories|testing)" app lib components
```
Pas de vérification sur simulateur : l'interface ne change pas, et aucun écran n'importe le nouveau code.

### Questions et risques
1. **Position d'une nouvelle tâche** : en tête de sa journée, comme aujourd'hui. Une tâche déplacée (`move`) arrive elle aussi en tête de la journée cible. À amender si tu préfères la fin de liste.
2. **Noms de tags et casse** : « Sport » et « sport » peuvent coexister, comme dans Supabase aujourd'hui. À amender si tu veux une comparaison sans casse (il faudrait alors une migration de l'index).
3. **Risque ESM** : `fractional-indexing` est publié en ESM uniquement. Jest est réglé dans cette étape. Metro (SDK 56) gère les `exports`, mais l'app ne l'importera qu'au premier branchement d'un écran. Il faudra alors vérifier le build Debug. Je le note dans « Pour l'étape suivante ».
4. **Choix de `fractional-indexing@3.2.0`** plutôt que la 4.0.0, publiée en juin 2026 : la 3.2.0 est la version éprouvée, avec la même API (`generateKeyBetween`). On ne réécrit pas l'algorithme nous-mêmes.
5. **Adaptateur de test** : il imite une partie de l'API d'`expo-sqlite`. Si le pilote Drizzle appelle une méthode non prévue, le test de l'adaptateur échoue. Le pilote réel reste vérifié au premier branchement sur simulateur.
6. **`lib/plan.ts`** garde son propre `MAX_TAGS_PER_TASK` jusqu'à la reconstruction des tags. Le doublon est temporaire et voulu.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/data/repositories/tasks.ts` (`create`, `listRange`) | La `DateKey` reçue n'est pas validée : une date invalide peut être enregistrée. Seul `move` passe par la validation du domaine (`moveTask`). Le plan ne le demandait pas. | Valider la date à la création avec la case « Journées antérieures au premier jour d'utilisation », qui ajoute une règle de `src/domain` appelée par la création. |
| R1-2 | Non bloquant | `src/data/repositories/tasks.ts` (`place`) | `place(id, null, null)` est accepté même si la journée contient d'autres tâches. La tâche reçoit alors `a0`, qui peut égaler la clé d'une autre tâche. L'ordre se départage ensuite par `id` : rien n'est corrompu, mais la position devient arbitraire. | Refuser par `invalid_neighbors` quand la journée contient d'autres tâches. Quelques lignes et un test. |
| R1-3 | Non bloquant | `src/data/errors.ts` (`isUniqueViolation`) | Un nom de tag en double est reconnu au texte `UNIQUE constraint failed: tags.name`, cherché dans le message et ses `cause`. C'est vérifié sur `node:sqlite`, mais pas encore sur `expo-sqlite` dans l'app. | À vérifier au premier branchement de l'écran des tags sur simulateur. |
| R1-4 | Non bloquant | `src/data/testing/testDatabase.ts` (`executeSync`) | L'adaptateur distingue une écriture d'une lecture par `statement.columns()`. Une écriture avec `RETURNING` renverrait donc `changes = 0`. Aucun repository ne s'en sert aujourd'hui. | Rien pour l'instant. À reprendre si un repository utilise `.returning()` avec `.run()`. |

Vérifié et correct :
- **CA1** : `package.json` n'ajoute que `"fractional-indexing": "3.2.0"` (version exacte). `package-lock.json` ajoute seulement ce paquet (+10 lignes, aucune autre version changée).
- **CA2** : `uuidV7` place 48 bits d'horodatage, la version `7` (`0x70 | …`), le variant `10` (`0x80 | (… & 0x3f)`) et 74 bits aléatoires. `newId` prend 10 octets de `getRandomBytes` (`expo-crypto`). `ids.test.ts` couvre le format, l'horodatage relu, l'unicité dans une même milliseconde et les bornes.
- **CA3** : `orderKeyBetween` est l'unique point d'import de `fractional-indexing`. Il est testé en tête, en fin, au milieu, sur 50 insertions, et sur des voisines dans le désordre.
- **CA4** : `src/domain/tags.ts` est testé sous la phrase de l'offre. `src/domain` est à 100 % sur les 4 mesures, et aucun `istanbul ignore` n'est présent.
- **CA5** : `createTestDatabase()` fait tourner `drizzle-orm/expo-sqlite` sur `node:sqlite`, avec les migrations embarquées. `testDatabase.test.ts` passe ses 7 tests, dont la transaction annulée et les clés étrangères.
- **CA6** : `move` appelle `moveTask` et ne réécrit que la date, `delay_count` et `order_key`. Il est testé pour un report vers le jour ouvert ou plus tard (+1) et pour les cas sans report (Box, jour clos, tâche faite, vers la Box). Une même date ne change rien, et une clé invalide lève une `RangeError`. `place` ne modifie que la ligne déplacée : les `updated_at` des voisines restent à `T0`.
- **CA7** : un nom de tag en double est refusé à la création et à la modification, puis accepté après suppression du premier, et la casse est distinguée. `setForTask` refuse un 4ᵉ tag, un doublon, un tag ou une tâche absents ou supprimés, sans rien modifier. Un lien conservé garde son `updated_at`. Une liste vide retire tous les liens. Supprimer une tâche ou un tag supprime logiquement ses liens dans la même transaction.
- **CA8** : chaque lecture filtre `deleted_at IS NULL`. `listForTasks` filtre à la fois les liens et les tags supprimés. Les horodatages viennent de `now()`, et il n'y a aucun `.delete(` dans `src/data/repositories`.
- **CA9** : `useLiveQuery(repo.listDay(…))`, `listBox`, `listRange`, `get`, `tags.list` et `listForTasks` passent `tsc`, dans des fonctions jamais appelées.
- **CA10** : `grep -rnE "src/data/(repositories|testing)" app lib components` ne renvoie rien, et `src/domain` n'importe rien de `src/data`.
- **CA11** : `npm run check` sort avec le code 0 (relancé par l'agent principal) : 28 suites, 431 tests, et seulement l'`ExperimentalWarning` déjà toléré. `npm run db:generate` répond « No schema changes ».
- **CA12** : `git status` ne liste que les fichiers prévus. Trois fichiers d'aide s'ajoutent dans les dossiers autorisés : `repositories/repository.ts`, `testing/testClock.ts` et `testing/expectDataError.ts`. `tasks.test.ts` est découpé en deux (`tasks.move.test.ts`) pour rester sous 300 lignes.
- Conventions : fichiers de moins de 300 lignes, aucun `any`, aucun `console.log`, aucun texte visible (donc pas de traduction).

Aucun problème bloquant : pas de tour de correction.

## Revue — tour 2

Correction demandée par Yanis après la remise : R1-2, traitée comme bloquante. R1-1 et R1-3 sont reportés (cases « Journées antérieures au premier jour d'utilisation » et « Tags » de la roadmap), et R1-4 est ignoré.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème. | — |

Vérifié et correct :
- **R1-2 corrigé** (`src/data/repositories/tasks.ts:186-199`) : quand les deux voisines valent `null`, `place` cherche une autre tâche non supprimée de la même journée (ou de la Box). S'il en trouve une, il lève `invalid_neighbors` avant toute écriture. Une tâche seule garde le comportement d'avant. La JSDoc est à jour.
- Deux tests dans `tasks.move.test.ts` :
  - un refus dans une journée non vide, la ligne relue restant identique (`order_key` et `updated_at` compris) ;
  - une acceptation quand la tâche est seule dans sa journée, alors qu'une autre tâche existe un autre jour.
- `npm run check` sort avec le code 0 (relancé par l'agent principal) : 28 suites, 433 tests, `src/domain` à 100 %.
- Le diff du tour ne touche que `tasks.ts` et `tasks.move.test.ts`.

Aucun problème bloquant restant.

## Revue — tour 3

Revue de code de la PR #46 (30 octobre 2026). Yanis demande de corriger ses points 1 et 2 dans cette PR, traités comme bloquants. Les autres points de cette revue ne sont pas transmis.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R3-1 | Bloquant | `src/data/repositories/tasks.ts:169` (`place`) | `place` ne vérifie pas que les voisines se suivent. Journée C, B, A : `place(C, B, null)` alors que B n'est pas la dernière donne à C la clé `a0`, celle de A. Les deux tâches sont ensuite départagées par `id`, et plus aucune tâche ne peut être placée entre elles. Même défaut avec une seule voisine en tête, ou deux voisines séparées par une autre tâche. | Un contrôle général : aucune autre tâche non supprimée de la même journée (ou de la Box), hors la tâche placée, ne doit avoir une `order_key` strictement comprise entre celle de `previousId` et celle de `nextId` (`null` = pas de borne de ce côté). Sinon `invalid_neighbors`, avant toute écriture. |
| R3-2 | Bloquant | `src/data/repositories/tasks.ts:186-199` (`place`) | La correction de R1-2 traite à part le cas où les deux voisines valent `null`. C'est un cas particulier du contrôle de R3-1. | Supprimer ce cas particulier : le contrôle général de R3-1 le couvre (sans bornes, toute autre tâche de la journée est « entre »). Les deux tests de R1-2 doivent continuer à passer. Mettre la JSDoc de `place` à jour. |

Tests attendus dans `tasks.move.test.ts`, chacun vérifiant que la ligne relue est inchangée :
- une seule voisine `previousId` qui n'est pas la dernière de la journée ;
- une seule voisine `nextId` qui n'est pas la première ;
- deux voisines séparées par une autre tâche ;
- une tâche supprimée entre les deux voisines ne bloque pas le placement ;
- la tâche placée elle-même, située entre les voisines, ne bloque pas le placement (déjà couvert par « places a task at the head and at the end », à garder).

Les autres points de la revue de code ne sont pas transmis. Ils attendent la décision de Yanis :
- copie à la main de la liste `transformIgnorePatterns` de `jest-expo` ;
- application des migrations en double entre `testDatabase.ts` et `schema.test.ts` (voulu par le plan) ;
- `isUniqueViolation` sans garde contre une chaîne de `cause` circulaire ;
- `listRange` silencieux sur des bornes inversées ou invalides ;
- le message `not_found` de `setForTask` liste tous les tags demandés.

### Vérification du tour 3

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème. | — |

Vérifié et correct :
- **R3-1 corrigé** (`src/data/repositories/tasks.ts:198-221`). Après la validation des deux voisines, une seule requête cherche une autre tâche non supprimée de la même journée (ou de la Box), hors la tâche placée, avec `gt(order_key, before)` et `lt(order_key, after)`. Une borne `null` est omise, ce qu'`and()` de Drizzle accepte. Si la requête trouve une tâche, `place` lève `invalid_neighbors` avant toute écriture. Des voisines dans le désordre ne trouvent aucune tâche « entre », puis échouent comme avant dans `orderKeyBetween`.
- **R3-2 corrigé** : le cas particulier des deux `null` est supprimé, et la JSDoc décrit la règle générale. Les deux tests de R1-2 passent sans modification.
- Tests ajoutés dans `tasks.move.test.ts`. Pour chaque refus, la ligne relue reste identique alors que l'horloge a avancé :
  - `place(C, B, null)` est refusé : c'est l'exemple du bug ;
  - `place(A, null, B)` est refusé ;
  - D, C, B, A puis `place(D, C, A)` est refusé ;
  - avec B supprimée, `place(D, C, A)` est accepté et donne C, D, A.
- `npm run check` sort avec le code 0 (relancé par l'agent principal) : 28 suites, 437 tests, `src/domain` à 100 %.
- Le diff du tour ne touche que `tasks.ts` (258 lignes) et `tasks.move.test.ts` (252 lignes).

Aucun problème bloquant restant.

## Résultat

### Ce qui a été fait
- **Dépendance** : `fractional-indexing@3.2.0` (pur JS, ESM). `jest.config.js` reprend la liste `transformIgnorePatterns` de `jest-expo` et y ajoute ce paquet.
- **`src/data/ids.ts`** : `uuidV7` (RFC 9562) et `newId()`, qui tire son aléa d'`expo-crypto`.
- **`src/data/orderKeys.ts`** : `orderKeyBetween`, le seul point d'entrée de l'ordre fractionnaire.
- **`src/data/errors.ts`** : `DataError` (`not_found`, `duplicate_tag_name`, `invalid_neighbors`) et `isUniqueViolation`.
- **`src/domain/tags.ts`** : `MAX_TAGS_PER_TASK = 3` et `assertTaskTagIds` (« trois tags maximum sur une tâche »).
- **`src/data/repositories/`** :
  - `createTaskRepository` : `listDay`, `listBox`, `listRange`, `get`, `create` (en tête), `update`, `move` (par `moveTask`), `place` (les voisines doivent se suivre : aucune autre tâche de la journée entre elles, R1-2 puis R3-1) et `remove` ;
  - `createTagRepository` : `list`, `create`, `update` et `remove` ;
  - `createTaskTagRepository` : `listForTasks` et `setForTask` ;
  - les options communes sont dans `repository.ts`.
- **`src/data/testing/`** : `createTestDatabase()` (le pilote Drizzle d'expo-sqlite sur `node:sqlite`, avec les migrations embarquées), une horloge et des `id` de test, et l'assertion `expectDataError`.
- **Tests** : `ids`, `orderKeys`, `errors`, `domain/tags`, `testDatabase`, `tasks`, `tasks.move`, `tags` et `taskTags`.
- **`README.md`** : section « Base locale » complétée (repositories, `createTestDatabase`).

### Vérification finale
- `npm run check` : succès (typecheck, ESLint sans avertissement, Prettier, 28 suites et 437 tests). `src/domain` est à 100 %. Seul l'`ExperimentalWarning` de `node:sqlite`, déjà toléré (P2-01, R1-2), apparaît.
- `npm run db:generate` : « No schema changes, nothing to migrate ».
- Pas de vérification sur simulateur : aucun écran n'importe le nouveau code, et l'interface ne change pas.

### Décisions
- Décisions de Yanis à la planification :
  - la case « un repository par entité » est coupée en deux, P2-03 (tâches, tags, liens) puis P2-04 (journées enregistrées, Repos, objectif, réglages, rappel) ;
  - les hooks de `features/` seront écrits avec leur écran.
- Repris du comportement actuel, sans amendement de Yanis : une nouvelle tâche, ou une tâche déplacée, va en tête de sa journée ; les noms de tags distinguent la casse.
- `fractional-indexing` 3.2.0 plutôt que la 4.0.0, en version exacte.
- `isUniqueViolation` lit le message et ses `cause` sans `instanceof Error` : une erreur de `node:sqlite` vient d'un autre contexte que celui de Jest.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | `create` ne valide pas la `DateKey`. | reporté : à traiter avec la case « Journées antérieures au premier jour d'utilisation » |
| R1-2 | `place(id, null, null)` accepté dans une journée non vide. | corrigé (tour 2), puis généralisé par R3-1 (tour 3) |
| R1-3 | Détection du nom de tag en double non vérifiée sur `expo-sqlite`. | reporté : à vérifier au premier branchement de l'écran des tags |
| R1-4 | L'adaptateur de test compterait `changes = 0` pour une écriture avec `RETURNING`. | ignoré |

## Pour l'étape suivante
- **P2-04** : appliquer la même forme aux repositories de `day_records`, `rest_periods`, `goal`, `settings` et `reminders` :
  - une fabrique avec `RepositoryOptions` (`src/data/repositories/repository.ts`) ;
  - des lectures sous forme de requêtes non exécutées, filtrées sur `deleted_at IS NULL` ;
  - des écritures synchrones avec `now()` ;
  - pour les tests, `createTestDatabase()` et `testRepositoryOptions()`.
- **`settings_key_unique` et `day_records_key_unique` ne sont pas partiels** (pas de `WHERE deleted_at IS NULL`) : une clé supprimée logiquement ne peut pas être recréée par un `INSERT`. Il faut réutiliser la ligne existante (mise à jour, `deleted_at` remis à `null`).
- **Premier branchement d'un écran sur les repositories** :
  - vérifier le build Debug (Metro et `fractional-indexing` en ESM) ;
  - vérifier la détection du nom de tag en double sur `expo-sqlite` (R1-3) ;
  - vérifier `newId` sous Hermes (`expo-crypto`).
- **Jest** : un paquet publié en ESM uniquement s'ajoute à `transformIgnorePatterns` dans `jest.config.js`. Si `jest-expo` change sa liste, il faut la recopier.
- **`lib/plan.ts`** garde son propre `MAX_TAGS_PER_TASK` jusqu'à la reconstruction des tags. La source à utiliser est `src/domain/tags.ts`.
