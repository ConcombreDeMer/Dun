# P2-05 — Clôture des journées

- **Statut** : terminée
- **Branche** : `feat/p2-05-cloture-journees`
- **Phase** : 2 — Données locales, app sans compte

## Plan validé

Plan validé par Yanis le 2 novembre 2026, sans amendement.

### Contexte
P2-03 et P2-04 ont écrit un repository par table. `dayRecords` sait enregistrer un lot de journées (`record`, atomique, `already_recorded` en cas de doublon) et donner la dernière journée enregistrée (`lastKey`). Le domaine fournit `openDayKey`, `dayKeysToClose` (`src/domain/date.ts`) et `closeDay` (`src/domain/dayRecord.ts`). Il manque ce qui les assemble : savoir quelles journées clore, quand, et avec quelles données.

P2-04 a signalé que `lastKey()` ne connaît pas l'ancrage (la veille de l'installation, sans enregistrement). Il faut le stocker, puis prendre le plus tardif des deux.

Aucun écran ne lit encore la base locale : les tâches sont toujours dans Supabase.

**Décisions de Yanis (2 novembre 2026), prises avant le plan :**
1. **Ancrage automatique.** La première clôture qui ne trouve ni ancrage ni enregistrement pose l'ancrage à la veille de la journée ouverte. L'onboarding n'a rien à faire.
2. **Pas de branchement dans l'app à cette étape.** P2-05 livre le mécanisme testé, sans le monter. Le monter maintenant enregistrerait chaque journée comme vide (donc en échec) dans la base locale, puisque les tâches sont encore dans Supabase. Le montage se fera avec la Home.

### Périmètre
Case de la roadmap, recopiée mot pour mot :
- [ ] Clôturer les journées : au lancement, au retour au premier plan **et avant toute écriture**, enregistrer les journées closes depuis la dernière ouverture dans `day_records`, avec `closeDay`. Sans la clôture avant écriture, une tâche cochée à 0 h 01 sur un écran resté ouvert entrerait dans l'enregistrement de la veille. Rafraîchir l'écran à minuit. La dernière journée close est ancrée à la veille de l'installation par l'onboarding : `dayKeysToClose(null, …)` renvoie `[]`, donc sans cet ancrage aucune journée ne serait jamais enregistrée (constaté en [P1-04](P1-04-verrouillage-report.md)).

Découpage : les quatre déclencheurs (lancement, premier plan, minuit, avant écriture) sont écrits et testés dans un provider React, mais celui-ci n'est monté nulle part (décision 2).

### Hors périmètre
- Monter le provider dans `app/` : case « Home ». `app/`, `lib/` et `components/` restent inchangés.
- Le déclenchement du Daily et le remplacement de `last_opened` dans `app/index.tsx` (case dédiée). `close()` renvoie quand même les journées closes au passage, ce qui servira au Daily.
- La vérification de `dateKey` sous Hermes : elle se fera au premier montage.
- Les journées antérieures au premier jour d'utilisation, la validation des statuts lus en base, l'export de l'ancrage : cases dédiées.
- Le typage des clés de `settings` : case « Réglages d'affichage ».
- Toute modification du schéma, toute nouvelle dépendance (pas d'`expo-localization` : le fuseau vient de `Intl.DateTimeFormat().resolvedOptions().timeZone`).
- Aucun texte visible, donc pas de modification de `locales/`.

### Modifications

#### 1. `src/domain/dayClosing.ts` (nouveau, testé à 100 %)
Fonctions pures, même style que `date.ts` et `dayRecord.ts` (pas d'heure implicite, `RangeError` sur une clé invalide) :

| Fonction | Comportement |
|---|---|
| `lastClosedKey(anchorKey, lastRecordedKey)` | La plus tardive des deux clés (`null` si les deux le sont). `RangeError` si une clé non nulle est invalide. |
| `closeDays(tasks, restPeriods, lastClosedKey, openKey)` | `dayKeysToClose(lastClosedKey, openKey).map((key) => closeDay(tasks, restPeriods, key, openKey))` : les enregistrements des journées à clore, dans l'ordre. `[]` s'il n'y a rien à clore. |
| `nextDayStart(now, timeZone)` | Le premier instant après `now` dont la journée locale (`dateKey`) est postérieure à celle de `now`. Le calcul se fait par dichotomie à la milliseconde sur `]now, now + 48 h]`, donc il gère les changements d'heure, y compris ceux qui tombent à minuit. Si l'heure recule à minuit, l'instant renvoyé peut être le second passage à minuit, jamais un instant plus tôt que le premier. `RangeError` comme `dateKey`. |

Tests : Paris (jour normal, jours de changement d'heure), un fuseau où l'heure change à minuit (par exemple `America/Santiago`), un passage de Paris à New York, et les clés invalides.

#### 2. `src/data/dayClosing.ts` (nouveau)
`createDayClosing(options: RepositoryOptions & { timeZone?: () => string })`. Il assemble les repositories existants (`settings`, `dayRecords`, `tasks`, `taskTags`, `restPeriods`), sans recopier leurs requêtes. Le fuseau par défaut est `Intl.DateTimeFormat().resolvedOptions().timeZone`, relu à chaque appel, pour suivre un voyage.

L'ancrage est stocké dans `settings`, sous la clé exportée `DAY_CLOSING_ANCHOR_KEY = "day_closing.anchor"`, avec une `DateKey` pour valeur.

| Fonction | Comportement |
|---|---|
| `close(): { openKey, closedKeys }` | 1. Lit l'ancrage : une valeur qui n'est pas une `DateKey` lève une `RangeError`, et rien n'est écrit. 2. Lit `dayRecords.lastKey()`. 3. **Sans ancrage ni enregistrement**, écrit l'ancrage à la veille de `openDayKey(now, tz, null)`, puis renvoie `closedKeys: []`. 4. Sinon, `last = lastClosedKey(…)`, `openKey = openDayKey(now, tz, last)`. S'il y a des journées à clore : lit les tâches de la plage (`tasks.listRange`), leurs tags (`taskTags.listForTasks`) et les Repos (`restPeriods.list`), construit les `ClosingTask`, appelle `closeDays`, puis `dayRecords.record` (un seul lot). `now()` n'est lu qu'une fois par appel. |
| `msUntilRefresh(): number` | `nextDayStart(now(), tz()) - now()` : le délai jusqu'au prochain minuit local, pour le rafraîchissement. |

Les API sont synchrones et JavaScript n'a qu'un fil d'exécution : deux clôtures ne peuvent pas s'entrelacer. Un second `close()` juste après le premier ne trouve donc rien à clore, sans `already_recorded`.

#### 3. `src/features/days/` (nouveau dossier)
- **`DayProvider.tsx`** : contexte React. Il reçoit `closing` (un `DayClosing`) en prop, ce qui permet de l'injecter dans les tests et de le monter plus tard avec la base de l'app. La valeur du contexte est `{ openKey: DateKey | null, write }`.
  - **Lancement** : `close()` au montage. `openKey` vaut `null` jusqu'à la première clôture réussie.
  - **Premier plan** : `close()` quand `AppState` passe à `"active"`.
  - **Minuit** : un `setTimeout(msUntilRefresh())`, reprogrammé après chaque clôture, quel que soit son déclencheur. `openKey` change, donc l'écran se met à jour.
  - **Avant écriture** : `write<T>(fn: (openKey: DateKey) => T): T` lance `close()`, puis `fn(openKey)`, met à jour `openKey`, et renvoie le résultat de `fn`. Une erreur de `close()` remonte à l'appelant, et `fn` n'est pas appelée.
  - Une erreur d'un déclencheur automatique est journalisée par `logger.error` (`lib/logger.ts`). `openKey` garde alors sa valeur, et le déclencheur suivant réessaie.
  - Au démontage, l'abonnement `AppState` est retiré et le minuteur annulé.
- **`useOpenDay.ts`** : lit le contexte, et lève une erreur hors du provider.
- Règle pour la suite, écrite dans l'en-tête du provider : toute écriture d'un hook de `features/` passe par `write`.

#### 4. Tests
- `src/domain/dayClosing.test.ts` : chaque ligne du tableau 1.
- `src/data/dayClosing.test.ts`, sur `createTestDatabase()` et une horloge réglable :
  - la première clôture pose l'ancrage à la veille, n'enregistre rien et renvoie la date locale ;
  - trois jours plus tard, elle enregistre les journées depuis le lendemain de l'ancrage : statut, photo, tags, une journée vide en échec ;
  - un Repos donne le statut `rest` ;
  - les tâches de la Box et les tâches supprimées sont exclues ;
  - un second `close()` est sans effet ;
  - après un voyage vers l'ouest, la journée ouverte reste en avance ;
  - un ancrage corrompu lève une `RangeError` sans rien écrire ;
  - `msUntilRefresh`.
  - **Le cas qui motive la case** : une tâche non faite le jour J, l'horloge passe à J+1 0 h 01, puis `close()` suivi de `tasks.update(id, { done: true })`. L'enregistrement de J garde `done: false` et le statut `failed`.
- `src/features/days/DayProvider.test.tsx` : avec un `closing` simulé, chaque déclencheur (montage, `"active"` mais pas `"background"`, minuteur puis reprogrammation), `write` (ordre `close` puis `fn`, valeur renvoyée, erreur sans appel de `fn`), l'erreur journalisée, le nettoyage au démontage, et `useOpenDay` hors du provider. Un test d'intégration avec le vrai `createDayClosing` sur la base de test, sous `jest.useFakeTimers`, rejoue le cas de 0 h 01 avec `write`.

#### 5. Documentation (agent principal)
Fichier d'étape, case cochée, « État d'avancement ». Pour reporter les décisions 1 et 2 dans la roadmap, j'amende ces phrases :
- **« Clôturer les journées »** : « ancrée à la veille de l'installation par l'onboarding » devient « ancrée à la veille de la première clôture, posée automatiquement (décision de Yanis en P2-05) ».
- **« Onboarding »** : la mention « et ancre la dernière journée close à la veille de l'installation » est retirée.
- **« Journées antérieures… »** : « l'ancrage de l'onboarding » devient « l'ancrage ».
- **« Home »** : ajouter « Monter `DayProvider` (`src/features/days`) : clôture au lancement, au premier plan et à minuit, avec la vérification de `dateKey` sous Hermes. »

### Critères d'acceptation
- **CA1** : `src/domain/dayClosing.ts` fait ce que décrit le tableau 1. `src/domain` reste couvert à 100 %.
- **CA2** : `createDayClosing().close()` pose l'ancrage à la première clôture, puis enregistre exactement les journées de `dayKeysToClose`, avec `closeDay` (statut, photo, tags), en un seul appel à `dayRecords.record`. Il renvoie `{ openKey, closedKeys }`. Les tests du point 4 le prouvent.
- **CA3** : le cas de 0 h 01 est testé (service et provider) : une tâche cochée après minuit n'entre pas dans l'enregistrement de la veille.
- **CA4** : `DayProvider` clôt au montage, au retour à `"active"`, au minuteur de minuit (reprogrammé) et dans `write`, avant `fn`. Il nettoie au démontage. Les tests le prouvent.
- **CA5** : aucune règle n'est recopiée. Le choix des journées, le statut et la photo passent par `dayKeysToClose`, `openDayKey` et `closeDay`, les lectures et écritures par les repositories existants.
- **CA6** : rien dans `app/`, `lib/` ni `components/` n'importe `src/features/days` ni `src/data/dayClosing`. `src/domain` n'importe rien de `src/data` ni de `src/features`.
- **CA7** : `npm run check` passe sans erreur ni avertissement (l'`ExperimentalWarning` de `node:sqlite` est déjà toléré). `npm run db:generate` répond « No schema changes ».
- **CA8** : seuls les fichiers prévus sont modifiés : les trois modules, leurs tests, le fichier d'étape et la roadmap. Aucun fichier ne dépasse environ 300 lignes, aucun `any` ni `console` n'est ajouté.

### Vérification
```bash
npm run check
npm run db:generate   # « No schema changes »
git status --short
grep -rnE "src/(features/days|data/dayClosing)" app lib components
grep -rnE "from \"\.\./(data|features)" src/domain
```
Pas de vérification sur simulateur : aucun écran ne change, et rien n'est monté (décision 2).

### Questions et risques
1. **Cocher la case** : je propose de la cocher. Le mécanisme est complet, et son montage devient une ligne explicite de la case « Home » (point 5). Tu peux aussi préférer la laisser ouverte jusqu'au montage.
2. **Ancrage dans `settings`** : la table est synchronisée en phase 4 et sera exportée. C'est voulu, puisque la restauration doit le connaître. La clé `day_closing.anchor` sera à intégrer au typage de la case « Réglages d'affichage ».
3. **« Avant toute écriture » repose sur une convention** : les hooks de `features/` devront passer par `write`. Rien ne l'impose techniquement. Je le noterai dans « Pour l'étape suivante » ; une règle de lint pourrait venir plus tard si besoin.
4. **Volume** : après une longue absence, `close()` lit toutes les tâches de la plage et passe leurs identifiants à `listForTasks` (`inArray`). Cela reste raisonnable pour un an de tâches, puisque SQLite accepte environ 32 000 paramètres. À surveiller avec la case « Performance » de la phase 5.
5. **Changement d'heure à minuit** : `nextDayStart` peut rafraîchir avec une heure de retard dans les rares fuseaux où l'heure recule à minuit. C'est sans conséquence sur les données : `write` clôt avant chaque écriture.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/features/days/DayProvider.tsx:56-66` (`close`) | Le minuteur de minuit n'est reprogrammé qu'après une clôture réussie. Si la clôture de minuit échoue (erreur passagère), un écran resté ouvert ne se rafraîchit plus avant le retour au premier plan ou la prochaine écriture. | Reprogrammer le minuteur même après un échec : `msUntilRefresh` ne dépend pas de la base. |
| R1-2 | Non bloquant | `src/features/days/DayProvider.tsx:85` (`write`) | `openKey` est mis à jour avant `fn`, et non après comme le disait le plan. C'est un écart signalé par l'implémenteur : `openKey` reste juste si `fn` lève une erreur. | Garder. |
| R1-3 | Non bloquant | `src/data/dayClosing.ts:98-108` (`repositories`) | `close()` recrée les cinq repositories à chaque appel, donc avant chaque écriture, pour figer l'horloge. Le coût est faible : ce sont des objets, aucune requête n'est lancée. | Garder. |
| R1-4 | Non bloquant | `src/features/days/DayProvider.tsx:68-82` | Si le parent recrée `closing` à chaque rendu, l'effet se relance et clôt à chaque rendu (sans boucle, puisque `setOpenKey` reçoit la même valeur). | Au montage (case « Home »), créer `closing` une seule fois (`useMemo`). À noter dans « Pour l'étape suivante ». |

Vérifié et correct :
- **CA1** : `lastClosedKey`, `closeDays` et `nextDayStart` (`src/domain/dayClosing.ts`) suivent le tableau 1. Les tests couvrent Paris (jour normal, 29 mars et 25 octobre 2026), Santiago (heure avancée à minuit, puis reculée : second minuit), le passage de Paris à New York, les clés et dates invalides, et un fuseau inconnu. `src/domain` est couvert à 100 % sur les quatre mesures.
- **CA2** : `close()` (`src/data/dayClosing.ts:117-163`) pose l'ancrage à la veille de la journée ouverte, sans rien enregistrer. Ensuite, il enregistre les journées de `dayKeysToClose` en un seul `dayRecords.record` et renvoie `{ openKey, closedKeys }`. Les tests couvrent la photo, les tags, une journée vide (`empty`), le Repos, la Box et les tâches supprimées (avec `listForTasks([])`), une seconde clôture sans effet, le départ du dernier enregistrement, le voyage vers l'ouest, quatre ancrages corrompus sans écriture, et l'horloge lue une seule fois.
- **CA3** : le cas de 0 h 01 est testé dans le service (`src/data/dayClosing.test.ts:202`) et dans le provider, sur la vraie base (`src/features/days/DayProvider.test.tsx:198`). La journée du 29 garde `done: false` et le statut `failed`.
- **CA4** : le provider clôt au montage, au passage à `"active"` (mais pas `"background"` ni `"inactive"`), au minuteur (reprogrammé après chaque clôture) et dans `write`, avant `fn`. Il nettoie au démontage. `useOpenDay` lève une erreur hors du provider.
- **CA5** : les règles viennent de `openDayKey`, `dayKeysToClose` et `closeDay`. Les lectures et écritures passent par les repositories, sans requête recopiée.
- **CA6** : `grep -rnE "src/(features/days|data/dayClosing)" app lib components` et `grep -rnE "from \"\.\./(data|features)" src/domain` ne renvoient rien.
- **CA7** : `npm run check` sort avec le code 0 (relancé par l'agent principal) : 36 suites et 551 tests, `src/domain` à 100 %. `npm run db:generate` répond « No schema changes, nothing to migrate ».
- **CA8** : seuls 7 fichiers nouveaux s'ajoutent au fichier d'étape, et aucun fichier existant n'est modifié. Le plus long fait 271 lignes. Ni `any` ni `console` dans le code livré.

Aucun problème bloquant. R1-1 a été corrigé ensuite, à la demande de Yanis (tour 2).

## Revue — tour 2

Correction demandée par Yanis après la remise du résumé (2 novembre 2026) : R1-1, traité comme bloquant. Ce tour ne compte pas dans la limite de trois.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème. | — |

Vérifié et correct :
- **R1-1 corrigé** (`src/features/days/DayProvider.tsx:63-87`) : `close` reprogramme le minuteur (`schedule`) même quand `closing.close()` lève une erreur, puis relance cette erreur. Si `schedule` échoue à son tour, l'erreur est seulement journalisée : elle ne masque jamais celle de la clôture. Une clôture réussie se comporte comme avant, et `write` aussi : son erreur remonte et `fn` n'est pas appelée. L'en-tête du fichier est à jour.
- Trois tests (`DayProvider.test.tsx:175-218`) :
  - un échec au montage, suivi d'une clôture réussie au minuteur, qui est ensuite reprogrammé ;
  - un `write` en échec qui laisse un minuteur programmé ;
  - une erreur de `close()` qui n'est pas masquée par celle du minuteur.

  L'implémenteur a vérifié que ces tests échouent sur l'ancienne version.
- `npm run check` sort avec le code 0 (relancé par l'agent principal) : 36 suites et 554 tests, `src/domain` à 100 %.
- Le diff du tour ne touche que `DayProvider.tsx` (124 lignes) et son test (276 lignes).

Aucun problème bloquant restant.

## Revue — tour 3

Revue de code de la branche (2 novembre 2026), à la demande de Yanis. Il a demandé de corriger les points 2, 3 et 4 (R3-1 à R3-3), traités comme bloquants. Ce tour et le suivant ne comptent pas dans la limite de trois.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R3-1 | Bloquant (demandé) | `src/features/days/DayProvider.tsx` (`close`) | Chaque `write` recalcule `msUntilRefresh` (environ 28 `formatToParts`), puis reprogramme le minuteur, même sans changement de journée. | Ne reprogrammer que si aucun minuteur n'est en attente, ou si la journée ouverte a changé. |
| R3-2 | Bloquant (demandé) | `src/features/days/DayProvider.tsx` (`write`) | Après le démontage, `write` fait `setOpenKey` et arme un minuteur que plus rien n'annule. | Après le démontage : clore puis écrire, sans état ni minuteur. |
| R3-3 | Bloquant (demandé) | `src/domain/dayClosing.ts` (`closeDays`) | Chaque journée refiltre toutes les tâches, en O(journées × tâches), au lancement après une longue absence. | Regrouper les tâches par date une seule fois. |
| R3-4 | Bloquant | `src/features/days/DayProvider.test.tsx` | Après R3-1 et R3-2, le fichier fait 326 lignes. Convention de `CLAUDE.md` : « au-delà d'environ 300 lignes, découper ». | Déplacer le test d'intégration dans `DayProvider.database.test.tsx`. |
| R3-5 | Non bloquant | `src/features/days/DayProvider.tsx` (en-tête) | « Avant toute écriture » repose sur une convention. Un hook qui écrirait directement avec un repository contournerait la clôture sans que rien ne le signale. | Faire passer les repositories d'écriture par `write`, par exemple `write((openKey, repos) => …)`, avec le premier hook qui écrit. |
| R3-6 | Non bloquant | `src/features/days/DayProvider.tsx` (minuteur) | Après un voyage vers l'ouest, le minuteur de minuit déclenche une clôture qui ne change pas la journée ouverte. Les données ne sont pas touchées. | Préciser le commentaire si besoin. |

### Vérification du tour 3

Vérifié et correct :
- **R3-1 corrigé** : le ref `timerKey` garde la journée ouverte du minuteur en attente, et un minuteur qui se déclenche n'est plus considéré comme en attente. Après une clôture en échec, un minuteur est posé s'il n'y en a aucun (R1-1 conservé). `msUntilRefresh` est calculé avant `clearTimeout`, pour ne pas perdre le minuteur en attente. Trois tests de l'ancien comportement (« toujours reprogrammer ») ont été réécrits, et des tests ajoutés : un retour au premier plan et deux `write` ne recalculent rien, un changement de journée reprogramme, un échec sans minuteur en pose un.
- **R3-2 corrigé** : le ref `mounted` est remis à zéro au nettoyage, avec `timer.current`, ce qui couvre le remontage sous StrictMode. Une fois le provider démonté, `write` clôt puis appelle `fn`, sans minuteur (test avec `jest.getTimerCount()`).
- **R3-3 corrigé** (`src/domain/dayClosing.ts:52-73`) : une `Map` par date, puis `closeDay(tasksByDate.get(key) ?? [], …)`. Les tests du domaine et du service passent sans changement.
- **R3-4 corrigé** : `DayProvider.test.tsx` fait 287 lignes et `DayProvider.database.test.tsx` 71. Le test d'intégration est déplacé sans modification.
- `npm run check` sort avec le code 0 (relancé par l'agent principal) : 37 suites et 557 tests, `src/domain` à 100 %.

Aucun problème bloquant restant.

## Résultat

### Ce qui a été fait
- **`src/domain/dayClosing.ts`** : `lastClosedKey` (le plus tardif de l'ancrage et du dernier enregistrement), `closeDays` (`dayKeysToClose` puis `closeDay`), `nextDayStart` (prochain minuit local, par dichotomie, changements d'heure compris).
- **`src/data/dayClosing.ts`** : `createDayClosing` avec `close()` (ancrage automatique à la première clôture, puis enregistrement des journées closes en un lot ; renvoie `openKey` et `closedKeys`) et `msUntilRefresh()`. L'ancrage est stocké dans `settings` sous `day_closing.anchor`. Le fuseau vient de `Intl.DateTimeFormat().resolvedOptions().timeZone`, relu à chaque appel.
- **`src/features/days/`** : `DayProvider` (clôture au montage, au premier plan, à minuit et avant chaque écriture via `write` ; le minuteur de minuit est reprogrammé même après un échec, et seulement quand la journée ouverte change ou qu'aucun n'est en attente ; rien n'est armé après le démontage) et `useOpenDay`. Le provider n'est monté nulle part.
- **Tests** : un fichier par module, dont le cas de 0 h 01 sur la vraie base de test.

### Vérification finale
- `npm run check` : succès (typecheck, ESLint sans avertissement, Prettier, 37 suites et 557 tests). `src/domain` est à 100 %. Seul l'`ExperimentalWarning` de `node:sqlite`, déjà toléré, apparaît.
- `npm run db:generate` : « No schema changes, nothing to migrate ».
- Les deux `grep` de la vérification ne renvoient rien.
- Pas de vérification sur simulateur : rien n'est monté dans l'app (décision 2).

### Décisions
- Ancrage automatique à la première clôture, à la veille de la journée ouverte ; l'onboarding n'a rien à faire (décision 1 de Yanis). La roadmap est amendée en conséquence (« Clôturer les journées », « Journées antérieures… », « Onboarding »).
- Pas de montage dans l'app avant la Home (décision 2 de Yanis). Le montage est ajouté à la case « Home ».
- La case « Clôturer les journées » est cochée : le mécanisme est complet, et son montage devient une ligne explicite de la case « Home ».
- `close()` fige l'horloge pour tout l'appel. `write` met `openKey` à jour avant `fn` (R1-2).

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | Minuteur de minuit non reprogrammé après un échec de clôture. | corrigé (tour 2, à la demande de Yanis) |
| R1-2 | `openKey` mis à jour avant `fn` dans `write`. | gardé tel quel |
| R1-3 | Repositories recréés à chaque `close()`. | gardé tel quel |
| R1-4 | `closing` recréé à chaque rendu du parent ⇒ clôture à chaque rendu. | noté pour le montage (case « Home », voir « Pour l'étape suivante ») |
| R3-5 | « Avant toute écriture » repose sur une convention. | ajouté à la roadmap (phase 2, case « Home ») |
| R3-6 | Clôture sans effet au minuit local après un voyage vers l'ouest. | ignoré |

## Pour l'étape suivante
- **Montage (case « Home »)** : monter `DayProvider` une fois la base prête (`useLocalDatabase`), avec un `closing` créé **une seule fois** (`useMemo(() => createDayClosing({ db: openLocalDatabase() }), [])`), sinon l'effet clôt à chaque rendu (R1-4). Vérifier alors `dateKey` et `nextDayStart` sous Hermes (case dédiée), sur simulateur et sur iPhone.
- **Avant toute écriture** : c'est une convention, rien ne l'impose (R3-5, à traiter avec la case « Home »). Chaque hook de `src/features` qui écrit doit passer par `useOpenDay().write`, qui fournit aussi `openKey` à `tasks.move` et aux fonctions du Repos.
- **Base de dev** : au premier montage, la première clôture pose l'ancrage à la veille. Une base locale déjà ancrée plus tôt (par un essai) enregistrerait des journées vides en échec : repartir d'une base neuve si besoin.
- **Daily** : `close()` renvoie `closedKeys`, les journées closes à ce passage. Le provider ne les expose pas encore ; le Daily devra décider comment proposer « une seule fois » leurs tâches non faites, sachant qu'une clôture peut se produire avant écriture, hors de l'écran du Daily.
- **Export et restauration** : l'ancrage (`settings`, `day_closing.anchor`) fait partie de l'état à exporter, avec `day_records`.
- **Volume** : après une longue absence, `close()` passe tous les identifiants de la plage à `listForTasks` (`inArray`). À mesurer avec la case « Performance » (phase 5).
