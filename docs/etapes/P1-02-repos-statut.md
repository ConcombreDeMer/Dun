# P1-02 — Repos et statut d'une journée

- **Statut** : terminée
- **Branche** : `feat/p1-02-repos-statut`
- **Phase** : 1 — Noyau métier testé

## Plan validé

### Contexte

P1-01 a posé `src/domain/date.ts` : `DateKey`, `isDateKey`, `dateKey`, `addDays`, `openDayKey` (règle du voyage) et `dayKeysToClose`. La couverture de `src/domain` est à 100 % et vérifiée par `npm run check`.

`dayStatus` avait été reporté de P1-01 parce qu'il dépend du Repos. Cette étape termine donc « Dates et journées » et traite la section « Repos ». Ensuite viendra « Série et objectif » (P1-03), qui consommera `dayStatus`.

Dans l'app actuelle, le Repos est un horodatage `Profiles.restEndDate` (fixé à maintenant + 24 h dans `app/settings/index.tsx:226`, puis comparé à `now` dans `app/index.tsx:43`). Il n'y a ni date de fin incluse ni journée entière neutre. Les statistiques devinent le Repos à partir de 7 champs possibles (`lib/calculateStats.ts:59`). Rien de cela n'est branché dans cette étape (voir Hors périmètre).

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] `dayStatus(tasks, restPeriods, dateKey, now)` → `success | failed | empty | rest | provisional` :
  - seule une journée **close** à 100 % est un succès ;
  - une journée en cours à 100 % est provisoire ;
  - une journée vide hors Repos est un échec, de même qu'une journée incomplète.
- [ ] `isRestDay(restPeriods, dateKey)` :
  - un Repos activé pendant une journée ouverte rend toute la journée neutre ;
  - la date de fin est incluse ;
  - une annulation avant minuit rend la journée en cours normale ;
  - aucun Repos n'est appliqué rétroactivement à une journée close.

### Décisions de Yanis (planification)

- **Signature** : `dayStatus(tasks, restPeriods, key, openKey)`. L'appelant calcule `openKey` avec `openDayKey`. Une journée est close si `key < openKey`. L'intitulé de la case de la roadmap sera corrigé au moment de la cocher.
- **Statuts** :
  - Repos (passé, présent ou futur) → `rest`, même si toutes les tâches sont faites ;
  - journée pas encore close (`key >= openKey`) hors Repos → `provisional`, à 0 %, à 40 % ou à 100 % ;
  - journée close hors Repos :
    - sans tâche → `empty`. Pour la série, c'est un échec, mais l'étiquette reste distincte pour les statistiques ;
    - toutes les tâches faites → `success` ;
    - sinon → `failed`.
- **Repos dans le domaine** : activer, annuler et repousser la date de fin sont des fonctions pures du domaine, qui appliquent seules les règles de l'offre :
  - un Repos commence toujours le jour ouvert ;
  - pendant un Repos en cours, on peut **choisir une nouvelle date de fin**, plus tardive ou plus proche, à condition qu'elle soit au plus tôt le jour ouvert. Les journées closes ne changent jamais. Choisir le jour ouvert comme fin le garde en Repos : seule l'annulation rend la journée en cours normale.
    Exemple : un Repos du mardi 13 au dimanche 18. Le jeudi 15, on peut fixer la fin au mardi 20 ou au vendredi 16, mais pas au mercredi 14 ;
  - en V1, on ne peut pas programmer un Repos qui commencerait plus tard.

### Hors périmètre

- Brancher l'app sur ces fonctions. `app/index.tsx`, `app/rest.tsx`, `app/settings/index.tsx` et `lib/calculateStats.ts` (avec son `isRestDay` maison) gardent leur code. Le Repos à l'horodatage exact (`app/index.tsx:43`, noté en P1-01) sera corrigé quand l'écran Repos passera sur la base locale (phase 2).
- Le stockage des périodes de Repos (`rest_periods`) et des journées closes (`day_records`) : phase 2.
- La série, l'objectif et les statistiques (P1-03 et suivantes). Cette étape ne dit pas comment `empty` et `failed` rompent la série.
- **Terminer une tâche en retard** (Daily) : savoir si cela change le statut d'une journée close relève de la case « Verrouillage des jours passés » et de `day_records`. `dayStatus` calcule le statut à partir des tâches qu'on lui passe.
- Le découpage de `src/domain/date.test.ts` (333 lignes), que Yanis a choisi de laisser tel quel.

### Modifications

#### 1. `src/domain/rest.ts` (nouveau)

C'est du TypeScript pur, comme `date.ts` : aucun import hors de `./date`, ni `new Date()` ni `Date.now()`. Les entrées invalides lèvent une `RangeError` avec un message préfixé par le nom de la fonction, comme dans `date.ts`. Le fichier réutilise `isDateKey` et `addDays` de `./date`, sans recalculer de date à la main.

- `type RestPeriod = { startKey: DateKey; endKey: DateKey }` : les deux bornes sont incluses, et `startKey <= endKey`.
- `isRestDay(restPeriods: readonly RestPeriod[], key: DateKey): boolean` : vrai si une période contient `key`, bornes incluses. Elle lève une erreur si `key` ou une période est invalide (clé invalide, ou `startKey > endKey`).
- `currentRest(restPeriods, openKey): RestPeriod | null` : la période qui couvre la journée ouverte, ou `null`. L'écran Repos s'en servira en phase 2 (« consulter la date de fin »).
- `startRest(restPeriods, openKey, endKey): RestPeriod` :
  - renvoie `{ startKey: openKey, endKey }` ;
  - erreur si `endKey < openKey` ;
  - erreur si une période existante chevauche `[openKey, endKey]`.
- `cancelRest(period, openKey): RestPeriod | null` :
  - erreur si la période ne couvre pas `openKey` : une période déjà finie ne s'annule pas, car cela modifierait des journées closes ;
  - si `startKey === openKey`, renvoie `null` : le Repos disparaît ;
  - sinon, renvoie `{ startKey, endKey: addDays(openKey, -1) }` : les journées closes restent en Repos, et la journée en cours redevient normale.
- `changeRestEnd(period, newEndKey, openKey): RestPeriod` :
  - erreur si la période ne couvre pas `openKey` ;
  - erreur si `newEndKey < openKey` ;
  - renvoie `{ startKey, endKey: newEndKey }`. La nouvelle date peut être plus tardive ou plus proche que l'ancienne.

Ces fonctions ne modifient jamais leurs arguments : elles renvoient de nouveaux objets.

#### 2. `src/domain/dayStatus.ts` (nouveau)

- `type DayStatus = "success" | "failed" | "empty" | "rest" | "provisional"`.
- `type DayTask = { date: DateKey | null; done: boolean }`. C'est le minimum utile : une date `null` désigne une tâche de la Box, qui ne compte pour aucune journée. Les tâches supprimées sont exclues par l'appelant.
- `dayStatus(tasks: readonly DayTask[], restPeriods: readonly RestPeriod[], key: DateKey, openKey: DateKey): DayStatus` :
  1. lève une erreur si `key` ou `openKey` est invalide ;
  2. renvoie `rest` si `isRestDay(restPeriods, key)` ;
  3. renvoie `provisional` si `key >= openKey` ;
  4. ne garde que les tâches où `task.date === key`, puis renvoie `empty` s'il n'y en a aucune, `success` si toutes sont faites, `failed` sinon.

#### 3. Tests : `src/domain/rest.test.ts` et `src/domain/dayStatus.test.ts` (nouveaux)

Comme en P1-01, les `describe` reprennent **mot pour mot** les phrases de l'offre (section « Objectif, journées et Repos »), et les tests sont en français. Les dates suivent un scénario lisible, par exemple un Repos du mardi 2026-10-13 au jeudi 2026-10-15.

`rest.test.ts` :
- `describe("Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques.")` : `startRest` commence le jour ouvert, et `isRestDay` est vrai pour ce jour, quelle que soit l'heure d'activation, puisqu'on travaille sur des clés.
- `describe("Sa date de fin est incluse.")` : le dernier jour est en Repos, le lendemain non.
- `describe("Une annulation avant minuit rend la journée en cours normale, sans modifier les jours déjà clos.")` :
  - une annulation le mercredi garde mardi en Repos et rend mercredi normal ;
  - une annulation le jour de l'activation fait disparaître le Repos.
- `describe("Aucun Repos ne s'ajoute rétroactivement à une journée close.")` :
  - `startRest` ne couvre jamais une clé antérieure à `openKey` ;
  - `cancelRest` et `changeRestEnd` refusent une période déjà finie ;
  - après une annulation ou un changement de date de fin, aucune journée close ne change d'état.
- Changer la date de fin (décision de Yanis), sur l'exemple du mardi 13 au dimanche 18, au jeudi 15 :
  - repousser au mardi 20 ;
  - avancer au vendredi 16 ;
  - fixer la fin au jeudi 15, qui garde jeudi en Repos ;
  - le mercredi 14 est refusé.
- `currentRest`, les chevauchements refusés par `startRest`, et les entrées invalides (clé, période inversée).

`dayStatus.test.ts` :
- `describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.")` :
  - une journée close à 100 % → `success` ;
  - la même journée encore ouverte → `provisional` ;
  - une journée future → `provisional`.
- `describe("Une journée vide hors Repos ou incomplète rompt la série.")` :
  - une journée close sans tâche → `empty` ;
  - une journée close incomplète → `failed` ;
  - une journée vide en Repos → `rest`.
- Repos prioritaire : une journée close à 100 % en Repos → `rest`.
- Seules les tâches du jour comptent : les tâches d'autres jours et de la Box (`date: null`) sont ignorées.
- Les entrées invalides.
- Un cas qui enchaîne avec `openDayKey`, après le voyage vers l'ouest de P1-01 : le 16 reste `provisional` à New York, même si l'horloge locale affiche le 15.

La couverture de `src/domain` reste à 100 % sur les 4 mesures, sans `istanbul ignore`.

#### 4. Documentation de l'étape (agent principal)

- `docs/etapes/P1-02-repos-statut.md`.
- `docs/roadmap.md` :
  - cocher les 2 cases, en corrigeant la signature de `dayStatus` (`openKey` au lieu de `now`) ;
  - mettre à jour « État d'avancement » ;
  - proposer à Yanis d'ajouter « changer la date de fin » à la case Repos de la phase 2, sans le faire de moi-même.

### Critères d'acceptation

- **CA1** : `src/domain/rest.ts` exporte `RestPeriod`, `isRestDay`, `currentRest`, `startRest`, `cancelRest` et `changeRestEnd`. `src/domain/dayStatus.ts` exporte `DayStatus`, `DayTask` et `dayStatus`. Les deux fichiers n'importent que `./date` ou `./rest`, et n'appellent ni `new Date()`, ni `Date.now()`, ni `Intl`.
- **CA2** : `isRestDay` inclut les deux bornes. Le test le montre sur le dernier jour, qui est en Repos, et sur le lendemain, qui ne l'est pas.
- **CA3** : `startRest` démarre toujours au jour ouvert et refuse `endKey < openKey` ainsi que les chevauchements.
- **CA4** : `cancelRest` rend `null` le jour de l'activation. Un autre jour, il rend une période qui finit la veille. Il refuse une période qui ne couvre pas le jour ouvert. Les journées closes gardent leur état, ce qui est vérifié par `isRestDay` avant et après l'annulation.
- **CA5** : `changeRestEnd` accepte toute nouvelle fin au plus tôt le jour ouvert, qu'elle soit plus tardive ou plus proche. Il refuse une fin antérieure au jour ouvert, ainsi qu'une période qui ne couvre pas le jour ouvert.
- **CA6** : `dayStatus` respecte la table des statuts décidée par Yanis : `rest` prioritaire, `provisional` pour `key >= openKey`, puis `empty`, `success` ou `failed`. Chaque branche a son test.
- **CA7** : les `describe` reprennent mot pour mot les phrases de l'offre citées au §3 (vérifiable avec `grep` dans les deux fichiers de test).
- **CA8** : aucune fonction ne modifie ses arguments. Un test le vérifie pour `cancelRest` et `changeRestEnd` (avec `Object.freeze` ou une comparaison avant et après l'appel).
- **CA9** : `npm run check` passe sans erreur ni avertissement, avec `src/domain` couvert à 100 % ; `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA10** : aucun fichier modifié hors de `src/domain/rest*.ts`, `src/domain/dayStatus*.ts`, du fichier d'étape et de `docs/roadmap.md`.

### Vérification

```bash
npm run check
```

```bash
grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/rest.ts src/domain/dayStatus.ts
```

```bash
git status --short
```

Pas de test sur simulateur : aucune modification d'interface ni de code de l'app.

### Questions et risques

- **Dans quel document écrire le changement de date de fin ?** L'offre ne dit rien sur le fait de changer la fin d'un Repos, et la roadmap (phase 2) ne prévoit que « activer, annuler, consulter la date de fin ». La décision sera écrite dans le fichier d'étape. En fin d'étape, je te proposerai de l'ajouter aussi à la roadmap, ou à l'offre, sans le faire de moi-même.
- **`empty` et la série** : `empty` est un échec pour la série, mais c'est P1-03 (`streak`) qui l'appliquera. Je le noterai dans « Pour l'étape suivante ».
- **Terminer une tâche en retard** : voir Hors périmètre. Si une tâche terminée en retard ne doit pas faire passer une journée close à `success`, il faudra le traiter à l'étape du verrouillage ou au moment de la clôture (`day_records`).

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/domain/rest.ts:72` | `currentRest` renvoie la première période qui couvre le jour ouvert. Si deux périodes se chevauchaient, le choix serait arbitraire. `startRest` refuse les chevauchements, donc cela n'arrive pas avec des périodes créées par le domaine. | Ignorer, ou refuser les chevauchements au chargement des périodes en phase 2. |
| R1-2 | Non bloquant | `src/domain/dayStatus.ts:41` | `dayStatus` valide ses clés avec deux `if` en ligne, alors que `rest.ts` a un `assertDateKey` interne. Ce n'est qu'une petite duplication. | Ignorer, ou partager un `assertDateKey` dans `date.ts` à la prochaine étape qui en a besoin. |

Écart de l'implémenteur au plan, jugé conforme : l'exemple du plan disait « vendredi 17 », mais le 17 octobre 2026 est un samedi. Le test utilise le vendredi 16, et l'exemple est corrigé dans ce fichier.

Vérifié et correct :
- **CA1** : les exports sont présents. `grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/rest.ts src/domain/dayStatus.ts` ne trouve que les imports de `./date` et `./rest`.
- **CA2** : « Sa date de fin est incluse. » Le jeudi 15 est en Repos, le vendredi 16 ne l'est pas. Le test couvre aussi deux périodes, bornes incluses.
- **CA3** : `startRest` commence au jour ouvert. Il refuse une fin antérieure au jour ouvert et trois cas de chevauchement, et accepte une période qui suit immédiatement la précédente.
- **CA4** : `cancelRest` renvoie `null` le jour de l'activation, et une période qui finit la veille les autres jours. Il refuse le lendemain de la fin comme la veille du début. Le test compare `isRestDay` avant et après l'annulation sur les journées closes.
- **CA5** : `changeRestEnd` repousse la fin au mardi 20, l'avance au vendredi 16 ou la fixe au jeudi 15 (jeudi reste en Repos). Il refuse le mercredi 14, ainsi qu'une période finie ou pas encore commencée.
- **CA6** : chaque branche de `dayStatus` a son test. `rest` passe avant tout le reste, y compris à 100 % et un jour futur.
- **CA7** : les 6 `describe` tirés de l'offre s'y retrouvent à l'identique (`grep -F` sur `offre-commerciale-v1-pour-agents.md` : 6 sur 6).
- **CA8** : `Object.freeze` sur les arguments de `startRest`, `cancelRest` et `changeRestEnd`. Les arguments sont inchangés après l'appel.
- **CA9** : `npm run check` sort en 0 (6 suites, 84 tests). `date.ts`, `dayStatus.ts` et `rest.ts` sont à 100 % sur les 4 mesures. `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA10** : `git status` ne liste que les 4 fichiers de `src/domain` et ce fichier d'étape.
- Le scénario de voyage vers l'ouest, enchaîné avec `openDayKey`, est testé : le 16 reste `provisional` à New York.
- Simulateur : sans objet, ni l'interface ni le code de l'app ne sont modifiés.

Aucun problème bloquant : pas de tour de correction.

## Résultat

### Ce qui a été fait
- **`src/domain/rest.ts`** (nouveau) : `RestPeriod` (bornes incluses) et `isRestDay`, plus les fonctions qui font respecter l'offre :
  - `currentRest` : le Repos en cours ;
  - `startRest` : toujours depuis le jour ouvert, sans chevauchement ;
  - `cancelRest` : la journée en cours redevient normale, les journées closes ne bougent pas ;
  - `changeRestEnd` : toute nouvelle fin au plus tôt le jour ouvert.
- **`src/domain/dayStatus.ts`** (nouveau) : `DayStatus`, `DayTask` et `dayStatus(tasks, restPeriods, key, openKey)`. L'ordre des règles est : `rest`, puis `provisional`, puis `empty`, `success` ou `failed`.
- **Tests** (nouveaux) : `rest.test.ts` et `dayStatus.test.ts`, avec 6 `describe` qui reprennent mot pour mot les phrases de l'offre.

### Vérification finale
- `npm run check` sort en 0 : 6 suites, 84 tests, `src/domain` couvert à 100 % (instructions, branches, fonctions, lignes).
- Recherche d'imports et d'appels interdits : seulement `./date` et `./rest`.
- `grep -rn "istanbul ignore" src` : aucun résultat.

### Décisions
- **Signature** (Yanis) : `dayStatus(tasks, restPeriods, key, openKey)`. L'appelant calcule `openKey` avec `openDayKey`.
- **Statuts** (Yanis) :
  - toute journée pas encore close, hors Repos, est `provisional`, quel que soit son avancement ;
  - `empty` désigne une journée close sans tâche. C'est un échec pour la série, mais l'étiquette reste distincte pour les statistiques.
- **Repos dans le domaine** (Yanis) :
  - un Repos commence toujours le jour ouvert, on ne peut pas le programmer pour plus tard ;
  - pendant un Repos en cours, on peut choisir une nouvelle date de fin, plus tardive ou plus proche, au plus tôt le jour ouvert ;
  - seule l'annulation rend la journée en cours normale.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | `currentRest` choisit la première période si deux se chevauchaient | ignoré |
| R1-2 | Validation des clés dupliquée dans `dayStatus.ts` | ignoré |

### Décisions de Yanis après la main rendue
- R1-1 et R1-2 : ignorés.
- La case Repos de la phase 2 de la roadmap mentionne maintenant le changement de date de fin, pour correspondre à `changeRestEnd`.

## Pour l'étape suivante
- **P1-03 (`streak`, `goalProgress`)** : partir de `dayStatus` (`src/domain/dayStatus.ts`) :
  - `rest` est neutre : il ne compte pas, mais ne rompt pas la série ;
  - `empty` et `failed` rompent la série ;
  - `provisional` ne compte pas encore. La journée de confirmation de l'objectif compte si elle se clôt à 100 %.
- **Signature à respecter** : `dayStatus` attend `openKey`, et non `now`. L'appelant le calcule avec `openDayKey(now, timeZone, lastClosedKey)`.
- **Repos en phase 2** :
  - l'écran Repos appellera `currentRest`, `startRest`, `cancelRest` et `changeRestEnd` ;
  - le stockage `rest_periods` n'enregistre que les périodes renvoyées par ces fonctions ;
  - un `cancelRest` qui renvoie `null` supprime la période (suppression logique) ;
  - le Repos actuel (`Profiles.restEndDate`, à l'horodatage exact, `app/index.tsx:43`) et l'`isRestDay` maison de `lib/calculateStats.ts:59` restent à remplacer.
- **Terminer une tâche en retard** : `dayStatus` calcule le statut à partir des tâches qu'on lui passe. Si une tâche terminée en retard dans le Daily ne doit pas faire passer une journée close à `success`, il faudra le décider avec la case « Verrouillage des jours passés », ou figer le statut à la clôture (`day_records`).
- **Taille des tests** : `date.test.ts` fait 332 lignes (laissé tel quel), `rest.test.ts` 267.
