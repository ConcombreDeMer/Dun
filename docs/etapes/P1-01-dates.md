# P1-01 — Clés de date et journées à minuit

- **Statut** : terminée
- **Branche** : `feat/p1-01-dates`
- **Phase** : 1 — Noyau métier testé

## Plan validé

### Contexte

La phase 0 est terminée :
- CI verte sur `master` (`337ed99`, dernier run `ok`) ;
- `npm run check` vert ;
- build Release installé sur l'iPhone de Yanis le 16 octobre, sans problème constaté. Ce build remplace le build TestFlight de fin de phase 0 (décision de Yanis).

La phase 1 commence par « Dates et journées ». Aujourd'hui :
- `src/` n'existe pas. Les dates passent par `lib/date.ts` : `toAppDateKey` donne la date locale de l'appareil ;
- `toDailyDateKey` décale l'heure de 4 h (`DAILY_ROLLOVER_HOUR = 4`). Il sert à 4 endroits : `app/index.tsx:33` (déclencher le Daily), `lib/daily.ts:154`, `:240` et `:375`. Le Daily bascule donc à 4 h du matin, ce qui contredit l'offre (« Une journée se clôt à minuit ») ;
- aucun calcul côté serveur ne dépend de cette heure (vérifié dans `supabase/`).

**Découpage.** La section « Dates et journées » compte 3 cases. `dayStatus` dépend des périodes de Repos (`isRestDay`). Il sera traité dans P1-02, avec le Repos. Cette étape couvre les 2 premières cases.

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] `dateKey(date, timeZone)` : clé `YYYY-MM-DD` de la journée locale, clôture à minuit. Supprimer `DAILY_ROLLOVER_HOUR`.
- [ ] Une nouvelle journée suit le fuseau de l'iPhone ; une journée déjà enregistrée garde sa date. Tests avec un passage de Paris à New York et retour.

À cela s'ajoutent deux éléments, validés par Yanis pendant la planification :
- la règle du voyage vers l'ouest (voir Décisions) ;
- un seuil de couverture de 100 % sur `src/domain`, vérifié par `npm run check`.

### Décisions de Yanis (planification)

- **Voyage vers l'ouest.** Une journée close ne se rouvre jamais. La journée ouverte est la plus tardive de ces deux dates :
  - la date locale dans le fuseau de l'iPhone ;
  - le lendemain de la dernière journée close.

  Exemple : à Paris, le 15 est clos à minuit et le 16 s'ouvre. Arrivé à New York, où il est 18 h 30 le 15, l'utilisateur reste sur le 16. Le 16 dure jusqu'à minuit heure de New York. La journée suivante suit ensuite le fuseau de l'iPhone.
- **Couverture.** Le seuil de 100 % sur `src/domain` s'applique dès cette étape.
- **Build de fin de phase 0.** Le build Release sur l'iPhone personnel de Yanis tient lieu de build TestFlight.

### Hors périmètre

- `dayStatus`, `isRestDay`, la série et l'objectif : ce sont les étapes suivantes de la phase 1.
- Le stockage des journées closes (`day_records`) et leur clôture au lancement : phase 2. Cette étape fournit seulement les fonctions pures dont la phase 2 aura besoin.
- Le branchement des écrans sur `src/domain` : `lib/date.ts` (`toAppDateKey`, `fromAppDateKey`, `isPastAppDateKey`…) garde son code et ses appelants. Il n'est pas réécrit par-dessus `dateKey`.
- Le déplacement de `app/`, `lib/` et `components/` vers l'architecture cible.
- Les autres calculs de date de l'app (`calculateStats`, `home.tsx`, `textCalendar`…).

### Modifications

#### 1. `src/domain/date.ts` (nouveau)

Ce fichier contient du TypeScript pur : ni React, ni stockage, ni `new Date()` implicite. L'heure courante et le fuseau sont toujours passés en paramètres.

- `type DateKey = string` : une clé `YYYY-MM-DD`, documentée comme telle.
- `isDateKey(value: string): boolean` :
  - le format doit être `YYYY-MM-DD` ;
  - la date doit exister dans le calendrier : `2026-02-30` est refusé, `2028-02-29` est accepté.
- `dateKey(date: Date, timeZone: string): DateKey` :
  - la date locale de `date` dans le fuseau IANA `timeZone`, calculée avec `Intl.DateTimeFormat(…, { timeZone }).formatToParts`, sans dépendre de la locale ;
  - lève une `RangeError` si la date est invalide ou si le fuseau est inconnu.
- `addDays(key: DateKey, days: number): DateKey` :
  - arithmétique calendaire en UTC, donc insensible aux changements d'heure ;
  - lève une `RangeError` si la clé est invalide ou si `days` n'est pas un entier.
- `openDayKey(now: Date, timeZone: string, lastClosedKey: DateKey | null): DateKey` : applique la règle du voyage, soit `max(dateKey(now, timeZone), addDays(lastClosedKey, 1))`.
- `dayKeysToClose(lastClosedKey: DateKey | null, openKey: DateKey): DateKey[]` :
  - renvoie les journées à clore, de `lastClosedKey + 1` à `openKey - 1`, dans l'ordre ;
  - renvoie `[]` si `lastClosedKey` vaut `null` ou si rien n'est à clore.

Les clés `YYYY-MM-DD` se comparent comme des chaînes. On n'ajoute pas de fonction de comparaison.

#### 2. `src/domain/date.test.ts` (nouveau)

Les tests sont **nommés d'après les puces de l'offre**, en français, pour préparer le critère de fin de la phase 1. Par exemple :
- `describe("Une journée se clôt à minuit")` :
  - 23:59:59.999 et 00:00:00.000 donnent deux clés différentes ;
  - à 04:00, c'est déjà la nouvelle clé : la bascule n'a plus lieu à 4 h.
- `describe("Les nouvelles journées suivent le fuseau de l'iPhone")` : un même instant donne des clés différentes à Paris, New York et Tokyo.
- `describe("Une journée déjà enregistrée garde sa date et ne se rouvre pas lors d'un voyage")` : le scénario Paris → New York → Paris, déroulé pas à pas.
  - **Paris, le 15 à 23 h** : `openDayKey` renvoie le 15.
  - **Paris, le 16 à 00 h 30** : le 15 est clos, `openDayKey` renvoie le 16.
  - **Arrivée à New York, le 15 à 18 h 30 heure locale** : `openDayKey` renvoie encore le 16, et `dayKeysToClose` renvoie `[]`.
  - **New York, le 16 à 23 h 59** : on reste sur le 16.
  - **New York, le 17 à 00 h 01** : on passe au 17, et le 16 est à clore.
  - **Retour à Paris, le 18 à 08 h** : `openDayKey` renvoie le 18, et le 17 est à clore.
- Les changements d'heure : la nuit du 25 octobre 2026 à Paris, et `addDays` de part et d'autre.
- Les cas limites :
  - fin de mois, fin d'année et 29 février ;
  - clé, date et fuseau invalides ;
  - `lastClosedKey` à `null` ;
  - `days` négatif ou non entier.

Il faut 100 % des lignes, branches, fonctions et instructions. Les commentaires `istanbul ignore` sont interdits.

#### 3. Suppression de `DAILY_ROLLOVER_HOUR`

- `lib/date.ts` : supprimer `DAILY_ROLLOVER_HOUR` et `toDailyDateKey`.
- `app/index.tsx:33`, `lib/daily.ts:154`, `:240` et `:375` : remplacer `toDailyDateKey(new Date())` par `getTodayAppDateKey()`, déjà présent dans `lib/date.ts`.
- Effet visible : le Daily se déclenche à minuit au lieu de 4 h.

#### 4. Couverture dans la vérification

- `jest.config.js` :
  - `collectCoverageFrom: ["src/domain/**/*.ts", "!src/domain/**/*.test.ts"]` ;
  - `coverageThreshold` à 100 % (branches, functions, lines, statements) pour `./src/domain/` ;
  - un rapporteur texte suffit.
- `package.json` : le script `test` devient `jest --coverage`.
- `coverage/` est ajouté à `.gitignore`, à `.prettierignore` et aux `ignores` d'`eslint.config.js`.

#### 5. Documentation du code

- `CLAUDE.md`, section Vérification : `npm run test` lance `jest --coverage`, avec un seuil de 100 % sur `src/domain` et sans `istanbul ignore`.
- `README.md` :
  - dans le tableau des commandes, la ligne `test` mentionne la couverture ;
  - dans l'architecture, ajouter `src/domain/` (règles métier pures et testées), avec le lien existant vers l'architecture cible.

#### 6. Documentation de l'étape (agent principal)

- Le fichier `docs/etapes/P1-01-dates.md`.
- Dans `docs/roadmap.md` :
  - cocher les 2 cases ;
  - mettre à jour « État d'avancement » (phase 1 en cours ; build de fin de phase 0 fait en Release sur iPhone) ;
  - proposer à Yanis d'y reporter la règle du voyage, ou de la reporter dans l'offre.

### Critères d'acceptation

- **CA1** : `src/domain/date.ts` exporte `DateKey`, `isDateKey`, `dateKey`, `addDays`, `openDayKey` et `dayKeysToClose`. Le fichier n'importe ni React, ni React Native, ni Expo, ni Supabase, ni `lib/`. Il n'appelle ni `new Date()` sans argument ni `Date.now()`.
- **CA2** : `dateKey` clôt la journée à minuit dans le fuseau passé en paramètre. Les tests le montrent à 23:59:59.999 et 00:00, et à 04:00, qui donne déjà la nouvelle clé.
- **CA3** : le scénario Paris → New York → Paris est testé pas à pas. Le 16 ne revient pas au 15 à New York. Le 17 s'ouvre à minuit heure de New York. Au retour, le 18 s'ouvre et le 17 est à clore.
- **CA4** : les tests portent dans leur nom les puces de l'offre qu'ils couvrent : « Une journée se clôt à minuit », « Les nouvelles journées suivent le fuseau de l'iPhone » et « Une journée déjà enregistrée garde sa date et ne se rouvre pas lors d'un voyage ».
- **CA5** : `grep -rn "DAILY_ROLLOVER_HOUR\|toDailyDateKey" app components lib store src` ne renvoie rien.
- **CA6** : `npm run test` lance la couverture, et le seuil de 100 % sur `src/domain` est actif. Retirer un test fait échouer `npm run check` (constaté une fois pendant la revue, puis annulé). `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA7** : `coverage/` est ignoré par Git, Prettier et ESLint : `git status` reste propre après `npm run check`.
- **CA8** : `CLAUDE.md` (Vérification) et `README.md` (commandes, architecture) reflètent ces changements, et leurs liens restent valides.
- **CA9** : `npm run check` passe sans erreur ni avertissement.
- **CA10** : aucun fichier modifié hors de ceux listés dans ce plan.

### Vérification

```bash
npm run check
```

```bash
grep -rn "DAILY_ROLLOVER_HOUR\|toDailyDateKey\|istanbul ignore" app components lib store src
```

```bash
git status --short
```

Le seuil de couverture se vérifie ainsi : désactiver temporairement un test (`it.skip`), constater l'échec, puis annuler.

**Simulateur iOS**, en clair et en sombre : lancer l'app en Debug et vérifier que le routage initial (Daily ou Home) fonctionne comme avant. Le passage du Daily de 4 h à minuit n'est pas reproductible facilement sur simulateur. Il est couvert par la lecture du diff : le remplacement est mécanique.

### Questions et risques

- **Hermes et `Intl` avec `timeZone`** : Jest tourne sous Node, avec l'ICU complète. Dans l'app, ce sera Hermes. `dateKey` n'est pas encore branchée sur l'app dans cette étape, donc rien ne casse. Il faudra vérifier sur simulateur, au premier branchement en phase 2, que `formatToParts` avec `timeZone` fonctionne. Je le noterai dans « Pour l'étape suivante ».
- **Deux implémentations de la date locale coexistent** (`lib/date.ts` et `src/domain/date.ts`) jusqu'à la phase 2. C'est une dette voulue, notée pour l'étape suivante.
- **Règle du voyage dans les documents de référence** : elle sera écrite dans le fichier d'étape. Faut-il aussi l'ajouter à l'offre ou à la roadmap ? Je te le proposerai en fin d'étape, sans le faire de moi-même.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/domain/date.test.ts` | Le fichier fait 315 lignes, un peu au-delà du repère « environ 300 lignes » de `CLAUDE.md`. Le plan prévoyait un seul fichier de test. | Décision de Yanis : laisser tel quel, ou découper par fonction (`dateKey`, `addDays`/`isDateKey`, voyage) quand P1-02 ajoutera ses propres fichiers. |
| R1-2 | Non bloquant | `src/domain/date.ts:52`, `:94` | Les plages ne sont pas tout à fait alignées : `addDays` accepte l'année `0000` (`addDays("0000-01-02", -1)`), alors que `dateKey` ne produit jamais une date avant `0001-01-01`. Aucun effet pour des dates réelles. | Ignorer, ou aligner les deux bornes plus tard. |

Écarts de l'implémenteur au plan, jugés conformes : ils restent à l'intérieur des fonctions prévues et rendent les erreurs explicites.
- `dateKey` refuse les dates hors de `[0001-01-02, 9999-12-31[` UTC. Sinon, `formatToParts` renverrait une année d'ère (av. J.-C.) ou à 5 chiffres, sans erreur.
- `addDays` refuse un résultat hors des années 0000 à 9999.
- `dayKeysToClose` valide `openKey`, ce qui évite une boucle jusqu'à l'an 9999 sur une clé invalide.
- La locale de `formatToParts` est fixe (`en-US-u-ca-gregory-nu-latn`), et les parties sont lues par type.

Vérifié et correct :
- **CA1** : `src/domain/date.ts` n'a aucun `import`. `grep -nE "^import|new Date\(\)|Date\.now"` ne renvoie rien ; le seul `new Date(0)` sert de base aux calculs UTC. Les 6 exports sont présents.
- **CA2** : tests « Une journée se clôt à minuit » :
  - 23:59:59.999 donne le 15, 00:00 donne le 16 ;
  - 03:59:59.999 donne déjà le 16 (l'ancienne règle aurait donné le 15) ;
  - minuit est aussi vérifié à New York et en UTC.
- **CA3** : le test « Paris → New York → Paris, pas à pas » suit les 6 étapes du plan, avec `dayKeysToClose` à chaque étape. Le cas Pago Pago (UTC-11) le complète.
- **CA4** : les trois `describe` reprennent mot pour mot les puces de l'offre.
- **CA5** : `grep -rn "DAILY_ROLLOVER_HOUR\|toDailyDateKey\|istanbul ignore" app components lib store src` sort en 1, sans résultat. Les 4 appels sont remplacés par `getTodayAppDateKey()`, sans autre changement (`app/index.tsx:33`, `lib/daily.ts:154`, `:240` et `:375`).
- **CA6** : le seuil est actif. `npx jest --coverage src/domain -t "isDateKey"` (3 tests sur 26) sort en 1, avec `coverage threshold for statements (100%) not met: 27.27%`. Cette méthode ne modifie aucun fichier.
- **CA7** : avec le rapporteur `text`, aucun dossier `coverage/` n'est créé. `coverage/` est ignoré dans `.gitignore`, `.prettierignore` et `eslint.config.js`.
- **CA8** : `CLAUDE.md:50` et `README.md:67` décrivent la couverture. `README.md:148` ajoute `src/domain/`.
- **CA9** : `npm run check` sort en 0 (4 suites, 36 tests, `src/domain` à 100 % sur les 4 mesures).
- **CA10** : `git status` ne liste que les fichiers du plan, plus `src/` et ce fichier d'étape.
- **Qualité des tests** : les instants ont un décalage explicite, donc les tests ne dépendent pas du fuseau de la machine. L'implémenteur les a relancés avec `TZ=Pacific/Auckland`, `America/Los_Angeles` et `UTC`.
- **Simulateur iOS** (iPhone 17 Pro, Debug), en clair et en sombre :
  - l'app compile, charge le bundle et démarre sur l'onboarding, puisqu'aucune session n'est ouverte ;
  - seul l'avertissement Linking, déjà connu, apparaît (P0-04, R1-3) ;
  - en sombre, l'onboarding garde ses couleurs claires : dette connue, prévue dans la roadmap (phase 2) ;
  - le routage d'un utilisateur connecté (Daily ou Home), seul code d'écran touché, n'a pas pu être testé sans compte. Il reste à tester par Yanis.
- **Incident de test, sans rapport avec l'étape** : le Metro déjà lancé sur le port 8081 (`expo start --clear`) répondait `Unable to resolve module ./node_modules/expo-router/entry`, alors que le fichier existe. Un Metro neuf sur le port 8082 compile le même code sans erreur : son index de fichiers était périmé. La vérification s'est faite sur le port 8082 (avec `RCT_jsLocation`, retiré ensuite).

Aucun problème bloquant : pas de tour de correction.

## Résultat

### Ce qui a été fait
- **`src/domain/date.ts`** (nouveau) : premier module du noyau métier, en TypeScript pur, sans aucun import. Il contient :
  - `DateKey` et `isDateKey` ;
  - `dateKey(date, timeZone)`, qui clôt la journée à minuit dans le fuseau IANA donné ;
  - `addDays`, en arithmétique UTC ;
  - `openDayKey` (règle du voyage : une journée close ne se rouvre jamais) et `dayKeysToClose`.
- **`src/domain/date.test.ts`** (nouveau) : 26 tests, dont trois `describe` nommés d'après les puces de l'offre et le scénario Paris → New York → Paris.
- **`DAILY_ROLLOVER_HOUR` et `toDailyDateKey` supprimés** (`lib/date.ts`). Les 4 appels passent à `getTodayAppDateKey()` (`app/index.tsx`, `lib/daily.ts`). Le Daily se déclenche maintenant à minuit, et non plus à 4 h.
- **Couverture** :
  - `npm run test:coverage` lance `jest --coverage`, et c'est lui que lance `npm run check`. `npm run test` reste `jest`, pour les exécutions partielles (tour Yanis 1) ;
  - seuil de 100 % sur `src/domain` dans `jest.config.js` ;
  - `coverage/` ignoré par Git, Prettier et ESLint.
- **Documentation du code** : `CLAUDE.md` (Vérification) et `README.md` (commande `test`, `src/domain/` dans l'arborescence).

### Vérification finale
- `npm run check` sort en 0 : 4 suites, 38 tests après le tour Yanis 1, `src/domain` couvert à 100 % (instructions, branches, fonctions, lignes).
- Seuil actif : `npx jest --coverage src/domain -t "isDateKey"` sort en 1.
- `grep -rn "DAILY_ROLLOVER_HOUR\|toDailyDateKey\|istanbul ignore" app components lib store src` : aucun résultat.
- `git status` : aucun fichier de couverture.
- Simulateur : voir la revue du tour 1.

### Décisions
- **Voyage vers l'ouest** (Yanis, planification) : la journée ouverte est la plus tardive entre la date locale et le lendemain de la dernière journée close. Une journée close ne se rouvre jamais.
- **Couverture à 100 % sur `src/domain` dès P1-01** (Yanis, planification).
- **Build de fin de phase 0** : le build Release installé sur l'iPhone de Yanis le 16 octobre tient lieu de build TestFlight (Yanis, planification).
- **Découpage** : `dayStatus` passe à P1-02, avec `isRestDay` dont il dépend.
- **Plages de dates** : les bornes ajoutées par l'implémenteur (années 0001 à 9999) sont acceptées en revue.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | `date.test.ts` fait 315 lignes (repère : environ 300) | laissé tel quel |
| R1-2 | `addDays` accepte l'année 0000, `dateKey` commence en 0001 | ignoré |

### Décisions de Yanis après la main rendue
- R1-1 : laissé tel quel ; R1-2 : ignoré.
- La règle du voyage est ajoutée à l'offre (`offre-commerciale-v1-pour-agents.md`, section « Objectif, journées et Repos »), à la suite de la puce sur le fuseau de l'iPhone.

## Pour l'étape suivante
- **P1-02** : `isRestDay` et `dayStatus(tasks, restPeriods, dateKey, now)`. Pour calculer la journée ouverte, réutiliser `openDayKey` et `dateKey` de `src/domain/date.ts` ; ne pas recalculer de date à la main.
- **Nommage des tests** : les `describe` reprennent mot pour mot les puces de l'offre, pour préparer le critère de fin de phase 1. Les tests sont en français.
- **Couverture** : tout nouveau fichier de `src/domain` doit être couvert à 100 %, sinon `npm run check` échoue (via `npm run test:coverage`). `istanbul ignore` est interdit. Pour lancer un seul fichier de test, utiliser `npm run test -- <fichier>`.
- **Hermes** : `dateKey` utilise `Intl.DateTimeFormat#formatToParts` avec `timeZone` et la locale `en-US-u-ca-gregory-nu-latn`. Ce n'est vérifié que sous Node. Il faudra le vérifier sur simulateur au premier branchement dans l'app (phase 2).
- **Dette voulue** : deux calculs de la date locale coexistent, `lib/date.ts` (heure locale de l'appareil) et `src/domain/date.ts` (fuseau explicite). La phase 2 branchera les écrans sur le domaine et supprimera `lib/date.ts`.
- **Fuseau de l'iPhone** : aucun module ne le lit encore. En phase 2, `Intl.DateTimeFormat().resolvedOptions().timeZone` (ou `expo-localization`) le fournira, hors de `src/domain`.
- **Constats de la revue de la PR #33 non corrigés dans cette étape** (décision de Yanis : les noter ici) :
  - `app/index.tsx:79` : le routage du Daily compare `last_opened !== today`. Après un voyage vers l'ouest, il relance le Daily d'une journée close et réécrit `last_opened` en arrière. À corriger en branchant `openDayKey` (phase 2, clôture des journées). **Ajouté à la roadmap, phase 2 (décision de Yanis).**
  - `app/index.tsx:43` : le Repos se termine à l'horodatage exact (`restEndDate > now`, fixé à maintenant + 24 h), pas à minuit avec la date de fin incluse. À traiter avec `isRestDay` (P1-02), puis avec l'écran Repos (phase 2).
  - `lib/daily.ts:154` : le passage de 4 h à minuit se fait sans migration. Les `last_opened` et les revues Daily écrits avec l'ancienne règle peuvent déclencher un Daily de plus une fois. Sans effet réel, puisqu'il n'y a pas d'utilisateurs.
  - `src/domain/date.ts` : `formatToParts` avec `timeZone` et la locale `-u-ca-gregory-nu-latn` n'est vérifié que sous Node. Il faudra le vérifier sous Hermes au premier branchement (voir plus haut). **Ajouté à la roadmap, phase 2 (décision de Yanis).**
  - `lib/daily.ts:76` : `addDays` et `getDateDiffInDays` en double avec `addDays` du domaine. À remplacer quand le Daily sera reconstruit (phase 2).
  - `lib/date.ts:32` : le passage du Daily à minuit, qui passe par `getTodayAppDateKey` et `lib/daily.ts`, n'a pas de test. Il sera couvert quand les écrans liront `src/domain` (phase 2).
  - `src/domain/date.ts:157` : `dayKeysToClose` revalide chaque clé deux fois par jour parcouru. C'est négligeable aujourd'hui ; à simplifier si la clôture devient coûteuse.
- **Metro** : si l'app affiche `Unable to resolve module ./node_modules/expo-router/entry`, relancer Metro avec `npx expo start --clear`.

## Revue de la PR #33 et corrections demandées par Yanis — tour 1

La revue de code de la PR #33 (commit `e5ebdc9`) a relevé 9 constats. Yanis a demandé d'en corriger 2. Les 7 autres sont notés dans « Pour l'étape suivante ».

| ID | Fichier | Problème | Correction | Vérification |
|---|---|---|---|---|
| Y1-1 | `package.json:13` | Avec `test` = `jest --coverage`, toute exécution partielle échouait sur le seuil de couverture. | `test` redevient `jest`. Le nouveau script `test:coverage` lance `jest --coverage`, et `check` le lance à la place de `test`. `CLAUDE.md`, `README.md` et le commentaire de `jest.config.js` sont mis à jour. | `npm run test -- components/headline.test.tsx` sort en 0. `npx jest --coverage src/domain -t isDateKey` sort en 1 : le seuil reste actif. |
| Y1-2 | `src/domain/date.ts:72` | `dateKey` construisait un `Intl.DateTimeFormat` à chaque appel. | Cache privé `formatterFor(timeZone)`, avec un formateur par fuseau. Un fuseau inconnu lève toujours une `RangeError` et n'est pas mis en cache. 2 tests ajoutés. | `npm run check` sort en 0 : 38 tests, `src/domain` à 100 %. |

Vérifié et correct :
- le diff ne touche que `package.json`, `jest.config.js`, `CLAUDE.md`, `README.md` et `src/domain/` ;
- la CI lance `npm run check`, donc le seuil s'applique toujours aux PR ;
- aucun fichier de couverture dans `git status`.

Le fichier de test fait maintenant 333 lignes. Yanis a déjà choisi de le laisser tel quel (R1-1).
