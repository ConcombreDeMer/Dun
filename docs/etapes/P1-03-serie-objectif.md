# P1-03 — Série et objectif

- **Statut** : terminée
- **Branche** : `feat/p1-03-serie-objectif`
- **Phase** : 1 — Noyau métier testé

## Plan validé

### Contexte

P1-01 a posé `src/domain/date.ts` (`DateKey`, `isDateKey`, `addDays`, `openDayKey`, `dayKeysToClose`). P1-02 a posé `src/domain/rest.ts` et `src/domain/dayStatus.ts` : chaque journée a un statut `success | failed | empty | rest | provisional`. `src/domain` est couvert à 100 %.

Cette étape traite la section « Série et objectif » de la phase 1, qui consomme `dayStatus`. Le fichier P1-02 (« Pour l'étape suivante ») fixe la règle : `rest` est neutre, `empty` et `failed` rompent la série, `provisional` ne compte pas encore.

Dans l'app actuelle, l'objectif n'est pas enregistré : l'onboarding affiche une carte (`components/onboarding/ObjectiveCard.tsx`) et un bouton « Accepter ». La série est calculée deux fois, avec deux codes distincts : `calculateCurrentStreak` dans `app/(tabs)/stats/index.tsx:104` et `computeBaseStreak` dans `lib/daily.ts:135`, utilisé par `app/daily.tsx` (le mock de `lib/dailyMock.ts` est désactivé : `useMock = false`). Rien de cela n'est branché dans cette étape.

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] `streak(dayStatuses)` : **une seule règle**, utilisée par l'objectif et par les statistiques. Le Repos est neutre : il ne compte pas, mais ne rompt pas la série.
- [ ] `goalProgress(goal, dayStatuses)` :
  - cibles 1, 2, 3, 4, 7 ou 14 ;
  - la journée de confirmation compte si elle se clôt à 100 %, même si des tâches ont été faites avant la confirmation ;
  - la première réussite datée et la série en cours sont distinctes.

### Décisions de Yanis (planification)

- **Objectif = série** : un objectif de N est atteint quand N journées réussies **d'affilée** sont atteintes (Repos neutre), avec la même règle de série que les statistiques.
- **Première réussite datée** : c'est le jour où la série atteint N pour la première fois. L'objectif reste atteint, avec cette date, même si la série casse ensuite. La série en cours est donnée à part.
- **Avant la confirmation** : les journées antérieures au jour de confirmation ne comptent pas pour l'objectif. Le jour de confirmation compte s'il se clôt à 100 %. Les statistiques, elles, appliquent `streak` à toutes les journées qu'on leur passe.

### Hors périmètre

- Brancher l'app : `app/(tabs)/stats/index.tsx` (`calculateCurrentStreak`), `app/daily.tsx` et `lib/daily.ts` (`computeBaseStreak`), l'onboarding et `components/statsStreak.tsx` gardent leur code (phase 2).
- Le stockage de l'objectif (table `goal`) : phase 2.
- Ce qui suit un objectif atteint (objectif suivant, paliers « Flow » et « Maîtrise » affichés par `ObjectiveCard`) : l'offre ne parle que du premier objectif.
- La plus longue série d'une période et les autres statistiques : case « Statistiques de la semaine, du mois et de l'année ».
- Les textes d'explication de la série (`locales/*.yaml`, `streakExplain`).

### Modifications

Même règle que P1-01 et P1-02 : TypeScript pur, aucun import hors de `./date`, `./dayStatus` et `./streak`, ni `new Date()`, ni `Date.now()`, ni `Intl`. Les entrées invalides lèvent une `RangeError` avec un message préfixé par le nom de la fonction. Aucune fonction ne modifie ses arguments.

#### 1. `src/domain/streak.ts` (nouveau)

- `type DatedStatus = { key: DateKey; status: DayStatus }`.
- `nextStreak(previous: number, status: DayStatus): number` : **la règle unique**, appliquée jour après jour :
  - `success` → `previous + 1` ;
  - `rest` et `provisional` → `previous` (neutres : ne comptent pas, ne rompent pas) ;
  - `empty` et `failed` → `0`.
  Erreur si `previous` n'est pas un entier positif ou nul.
- `streak(days: readonly DatedStatus[]): number` : la série en cours à la fin de la liste, obtenue en appliquant `nextStreak` à chaque jour depuis 0. Liste vide → 0.
  - Erreur si une clé est invalide ou si les jours ne se suivent pas exactement (chaque clé = `addDays(précédente, 1)`) : un jour manquant fausserait la série sans bruit.

#### 2. `src/domain/goal.ts` (nouveau)

- `GOAL_TARGETS = [1, 2, 3, 4, 7, 14] as const` et `type GoalTarget`.
- `type Goal = { target: GoalTarget; confirmedKey: DateKey }` : `confirmedKey` est le jour où l'objectif est accepté.
- `type GoalProgress = { target: GoalTarget; streak: number; achievedKey: DateKey | null }` :
  - `streak` : la série en cours, comptée à partir de `confirmedKey` ;
  - `achievedKey` : le premier jour où cette série atteint `target`, ou `null`.
- `goalProgress(goal: Goal, days: readonly DatedStatus[]): GoalProgress` :
  1. erreur si `target` n'est pas dans `GOAL_TARGETS` ou si `confirmedKey` est invalide ;
  2. ignore les jours antérieurs à `confirmedKey` ;
  3. s'il reste des jours, le premier doit être `confirmedKey` (sinon erreur : jour manquant), et la suite est validée comme dans `streak` ;
  4. parcourt ces jours avec `nextStreak` ; `achievedKey` est la clé du premier jour où la série vaut `target`, et ne change plus ensuite ;
  5. renvoie la série finale (la même valeur que `streak` sur ces jours) et `achievedKey`.

La validation « jours consécutifs » n'est écrite qu'une fois (dans `streak.ts`, réutilisée par `goal.ts`, par un export ou en appelant `streak`).

#### 3. Tests : `src/domain/streak.test.ts` et `src/domain/goal.test.ts` (nouveaux)

Comme en P1-01 et P1-02 : tests en français, `describe` qui reprennent **mot pour mot** les phrases de l'offre (section « Objectif, journées et Repos »), scénario lisible d'octobre 2026 (mardi 13, mercredi 14…). La phrase de la cible est recopiée sans les astérisques du gras markdown.

`streak.test.ts` :
- `describe("L'objectif et les statistiques utilisent la même règle de série.")` : `streak` et la série de `goalProgress` donnent le même résultat sur une même suite de jours commençant au jour de confirmation.
- `describe("Une journée vide hors Repos ou incomplète rompt la série.")` : `empty` et `failed` remettent à 0 ; une réussite après la rupture repart à 1.
- `describe("Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques.")` : réussite, Repos, réussite → 2 ; Repos seul → 0 ; Repos en fin de liste ne casse pas.
- `describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.")` : une journée `provisional` en fin de liste ne compte pas et ne casse pas.
- `nextStreak` sur chaque statut, liste vide, entrées invalides (clé invalide, jour manquant, ordre inversé, doublon, `previous` négatif ou non entier).
- Un cas enchaîné avec `dayStatus` (tâches et Repos réels → statuts → `streak`).

`goal.test.ts` :
- `describe("Le premier objectif correspond à la cible choisie à l'onboarding : 1, 2, 3, 4, 7 ou 14 journées réussies.")` : chaque cible est acceptée et atteinte au bon jour ; 0, 5 et 15 sont refusés.
- `describe("La journée où l'objectif est confirmé peut compter si elle se clôt à 100 %, même si des tâches ont été faites avant cette confirmation.")` : objectif de 1 confirmé le jeudi 15, jeudi `success` → `achievedKey` = jeudi 15. Enchaîné avec `dayStatus` sur des tâches du jeudi déjà cochées. Les jours antérieurs à la confirmation, même réussis, ne comptent pas.
- `describe("La première réussite datée et la série courante sont distinctes.")` : objectif de 2 atteint le mercredi, échec le jeudi → `achievedKey` reste mercredi, `streak` vaut 0 ; puis la série reprend sans changer `achievedKey`.
- `describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.")` : la journée ouverte `provisional` n'atteint pas l'objectif.
- Repos neutre entre deux réussites pour un objectif de 2.
- Entrées invalides : clé de confirmation invalide, premier jour après `confirmedKey` (jour de confirmation manquant), jours non consécutifs.

La couverture de `src/domain` reste à 100 % sur les 4 mesures, sans `istanbul ignore`.

#### 4. Documentation de l'étape (agent principal)

- `docs/etapes/P1-03-serie-objectif.md`.
- `docs/roadmap.md` : cocher les 2 cases avec le lien, mettre à jour « État d'avancement » (prochaine étape : « Tâches et statistiques »).

### Critères d'acceptation

- **CA1** : `streak.ts` exporte `DatedStatus`, `nextStreak` et `streak` ; `goal.ts` exporte `GOAL_TARGETS`, `GoalTarget`, `Goal`, `GoalProgress` et `goalProgress`. Les deux fichiers n'importent que `./date`, `./dayStatus` ou `./streak`, et n'appellent ni `new Date()`, ni `Date.now()`, ni `Intl`.
- **CA2** : une seule règle de série : `nextStreak` est la seule fonction qui décide de l'effet d'un statut ; `streak` et `goalProgress` l'utilisent toutes deux, et un test montre qu'elles donnent la même série sur les mêmes jours.
- **CA3** : `rest` et `provisional` ne comptent pas et ne rompent pas ; `empty` et `failed` remettent à 0. Chaque statut a son test.
- **CA4** : `streak` et `goalProgress` refusent une clé invalide et des jours non consécutifs (manquant, doublon, désordre).
- **CA5** : `goalProgress` refuse toute cible hors de 1, 2, 3, 4, 7 et 14, et chaque cible autorisée a un test d'atteinte.
- **CA6** : le jour de confirmation compte s'il se clôt à 100 % ; les jours antérieurs ne comptent pas ; un premier jour postérieur à la confirmation est refusé.
- **CA7** : `achievedKey` est le premier jour où la série atteint la cible et ne change plus, même après une rupture ; `streak` reflète la série en cours.
- **CA8** : les `describe` reprennent mot pour mot les phrases de l'offre citées au §3 (vérifiable avec `grep -F` sur `offre-commerciale-v1-pour-agents.md`, astérisques mis à part pour la cible).
- **CA9** : aucune fonction ne modifie ses arguments (test avec `Object.freeze` sur le tableau et l'objectif).
- **CA10** : `npm run check` passe sans erreur ni avertissement, `src/domain` à 100 % ; `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA11** : aucun fichier modifié hors de `src/domain/streak*.ts`, `src/domain/goal*.ts`, du fichier d'étape et de `docs/roadmap.md`.

### Vérification

```bash
npm run check
```

```bash
grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/streak.ts src/domain/goal.ts
```

```bash
grep -rn "istanbul ignore" src; git status --short
```

Pas de test sur simulateur : ni l'interface ni le code de l'app ne changent.

### Questions et risques

- **Fin de la phase 1** : son critère demande que chaque puce de « Objectif, journées et Repos » ait un test nommé d'après elle. Après cette étape, il restera la puce de la migration (« Les personnes ayant déjà un compte… »), que la roadmap déclare sans objet. Il faudra décider en fin de phase si on la retire de l'offre ou si on la marque explicitement comme exclue du critère. Je le noterai dans « Pour l'étape suivante ».
- **Paliers « Flow » et « Maîtrise »** (`ObjectiveCard`, onboarding) : ils suggèrent des objectifs après le premier, que l'offre ne décrit pas. Hors périmètre ici ; à revoir à la case « Relire onboarding… » de la phase 3 ou à la refonte de l'onboarding (phase 2). Je ne tranche pas.
- **Série affichée vs cible** : `goalProgress` renvoie la série brute, qui peut dépasser la cible. Le plafonnement éventuel à l'affichage sera décidé avec l'écran (phase 2).

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/domain/goal.ts:59` | Les jours antérieurs à `confirmedKey` sont ignorés sans être validés : une clé invalide ou un désordre avant la confirmation passe sans erreur. Le plan dit « ignore », donc c'est conforme. | Ignorer, ou valider toute la liste avant de la couper. |
| R1-2 | Non bloquant | `src/domain/streak.ts:33` | `nextStreak` n'a pas de `default` : un statut inconnu à l'exécution (par exemple lu en base) renverrait `undefined` sans erreur. TypeScript l'interdit à la compilation. | Ignorer ici ; valider les statuts lus en base en phase 2, ou ajouter un `default` qui lève une `RangeError`. |
| R1-3 | Non bloquant | `src/domain/streak.ts:52` | `assertConsecutiveDays` est exporté, alors que ce n'est qu'un utilitaire de validation partagé avec `goal.ts`. Le plan l'autorisait. | Ignorer. |

Écart de l'implémenteur au plan, jugé conforme : `goalProgress` coupe la liste au premier jour `>= confirmedKey` au lieu de filtrer. Un jour antérieur placé après la confirmation déclenche donc une erreur de jours non consécutifs, ce qui est plus strict et cohérent avec `streak`.

Vérifié et correct :
- **CA1** : les exports sont présents. `grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/streak.ts src/domain/goal.ts` ne trouve que 4 imports, vers `./date`, `./dayStatus` et `./streak`.
- **CA2** : `nextStreak` est la seule fonction qui décide de l'effet d'un statut. `streak` l'applique avec un `reduce`, et `goalProgress` dans sa boucle. Le `describe` « L'objectif et les statistiques utilisent la même règle de série. » compare les deux sur 5 suites de jours.
- **CA3** : `describe("nextStreak")` teste les 5 statuts ; les `describe` de l'offre testent Repos, provisoire, vide et incomplet dans `streak`.
- **CA4** : `streak` et `goalProgress` refusent une clé invalide, un jour manquant, un doublon et le désordre.
- **CA5** : `it.each(GOAL_TARGETS)` vérifie le jour d'atteinte de chaque cible, et qu'une journée de moins ne suffit pas. Les cibles 0, 5, 15, -1, 1,5 et `NaN` sont refusées.
- **CA6** : le jeudi de confirmation compte s'il est réussi, y compris avec `dayStatus` sur des tâches cochées avant la confirmation. Les jours antérieurs, même réussis, ne comptent pas. Une liste qui commence après la confirmation est refusée.
- **CA7** : `achievedKey` reste au mercredi 14 après un échec, puis quand la série reprend. La série peut dépasser la cible.
- **CA8** : les 8 `describe` tirés de l'offre s'y retrouvent à l'identique (`grep -F`, astérisques du gras retirés). Les autres `describe` sont techniques (`nextStreak`, `streak`, entrées invalides…), comme en P1-02.
- **CA9** : `Object.freeze` sur le tableau, ses éléments et l'objectif ; les valeurs sont inchangées après l'appel.
- **CA10** : `npm run check` sort en 0 (8 suites, 141 tests). Les 5 fichiers de `src/domain` sont à 100 % sur les 4 mesures. `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA11** : `git status` ne liste que les 4 fichiers de `src/domain`, ce fichier d'étape et `docs/roadmap.md`.
- Simulateur : sans objet, ni l'interface ni le code de l'app ne sont modifiés.

Aucun problème bloquant : pas de tour de correction.

## Résultat

### Ce qui a été fait
- **`src/domain/streak.ts`** (nouveau) :
  - `DatedStatus` (`{ key, status }`) ;
  - `nextStreak(previous, status)`, la règle unique : `success` ajoute un jour, `rest` et `provisional` sont neutres, `empty` et `failed` remettent à 0 ;
  - `streak(days)` : la série en cours à la fin de la liste ;
  - `assertConsecutiveDays` : la validation des jours consécutifs, partagée avec `goal.ts`.
- **`src/domain/goal.ts`** (nouveau) : `GOAL_TARGETS` (1, 2, 3, 4, 7, 14), `Goal` (`target`, `confirmedKey`), `GoalProgress` (`target`, `streak`, `achievedKey`) et `goalProgress(goal, days)`.
- **Tests** (nouveaux) : `streak.test.ts` et `goal.test.ts`, avec 8 `describe` qui reprennent mot pour mot les phrases de l'offre.

### Vérification finale
- `npm run check` sort en 0 : 8 suites, 141 tests, `src/domain` couvert à 100 % (instructions, branches, fonctions, lignes).
- Recherche d'imports et d'appels interdits : seulement `./date`, `./dayStatus` et `./streak`.
- `grep -rn "istanbul ignore" src` : aucun résultat.

### Décisions
- **Objectif = série** (Yanis) : un objectif de N est atteint quand la série atteint N journées réussies d'affilée, Repos neutre.
- **Première réussite datée** (Yanis) : le jour où la série atteint N pour la première fois. Elle reste acquise si la série casse ensuite ; la série en cours est donnée à part.
- **Avant la confirmation** (Yanis) : les journées antérieures au jour de confirmation ne comptent pas pour l'objectif. Les statistiques appliquent `streak` à toutes les journées qu'on leur passe.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | Jours antérieurs à la confirmation non validés | ignoré pour l'instant, suivi dans l'issue [#38](https://github.com/ConcombreDeMer/Dun/issues/38) |
| R1-2 | `nextStreak` sans `default` pour un statut inconnu à l'exécution | ajouté à la roadmap (phase 2, « Base locale ») |
| R1-3 | `assertConsecutiveDays` exporté | ignoré pour l'instant, suivi dans l'issue [#38](https://github.com/ConcombreDeMer/Dun/issues/38) |

### Décisions de Yanis après la main rendue
- **Affichage de l'objectif** : en haut de l'onglet Statistiques, dans un composant dédié qui reprend le design des autres cartes de l'écran. Ajouté à la phase 2 de la roadmap.
- **Textes « Qu'est-ce qu'un streak ? »** : à corriger pour le Repos et la journée vide. Ajouté à la phase 2 de la roadmap.
- **Remplacement des calculs de série actuels** : ajouté explicitement à la phase 2 de la roadmap (Statistiques, Daily et grille de la carte de série).
- **Ordre de la phase 2** : conservé. La série et l'objectif deviendront fonctionnels au fil de la phase 2, sans branchement provisoire sur les écrans Supabase actuels.
- **Problèmes non bloquants** : R1-1 et R1-3 ignorés pour l'instant, suivis dans l'issue [#38](https://github.com/ConcombreDeMer/Dun/issues/38) ; R1-2 ajouté à la phase 2 de la roadmap (« Base locale »).

## Pour l'étape suivante
- **Fin de la phase 1** : son critère exige un test nommé d'après chaque puce de « Objectif, journées et Repos ». Toutes en ont un, sauf celle de la migration (« Les personnes ayant déjà un compte… »), que la roadmap déclare sans objet. Il faut que Yanis décide, avant de clore la phase, de la retirer de l'offre ou de l'exclure explicitement du critère.
- **Appel attendu en phase 2** : calculer un `DatedStatus` par journée avec `dayStatus`, sans trou, de la plus ancienne journée utile jusqu'au jour ouvert inclus (il sera `provisional`), puis :
  - statistiques : `streak(days)` ;
  - objectif : `goalProgress(goal, days)`, avec des jours qui commencent au plus tard à `confirmedKey`.
- **`achievedKey` est recalculé** à chaque appel à partir des statuts. Si une journée close pouvait changer de statut après coup (tâche terminée en retard dans le Daily), la date d'atteinte pourrait bouger : à trancher avec la case « Verrouillage des jours passés », ou en figeant les statuts dans `day_records`.
- **Ancien code à remplacer en phase 2** : `calculateCurrentStreak` (`app/(tabs)/stats/index.tsx:104`) et `computeBaseStreak` (`lib/daily.ts:135`), utilisé par `app/daily.tsx`. Aucun des deux ne traite le Repos : un jour de Repos casse la série, contrairement à l'offre.
- **Paliers « Flow » et « Maîtrise »** (`components/onboarding/ObjectiveCard.tsx`) : l'offre ne décrit que le premier objectif. À revoir avec la refonte de l'onboarding (phase 2) ou la relecture de la phase 3.
- **Série affichée** : `goalProgress` renvoie la série brute, qui peut dépasser la cible ; le plafonnement éventuel se décide avec l'écran.
