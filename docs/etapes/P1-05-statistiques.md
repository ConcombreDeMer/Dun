# P1-05 — Statistiques de la semaine, du mois et de l'année

- **Statut** : terminée
- **Branche** : `feat/p1-05-statistiques`
- **Phase** : 1 — Noyau métier testé

## Plan validé

Plan validé par Yanis le 22 octobre 2026. Les points de « Questions et risques » n'ont pas reçu de réponse explicite : l'implémentation suit les propositions du plan, confirmées par Yanis le 26 octobre 2026 (voir « Décisions »).

### Contexte
C'est la dernière case de la phase 1. P1-04 a créé `DayRecord` (`src/domain/dayRecord.ts`), c'est-à-dire le statut et la photo des tâches de chaque journée close, figés à minuit. L'offre dit que les statistiques s'appuient sur cet enregistrement. Aujourd'hui, les statistiques sont calculées dans l'app (`lib/calculateStats.ts`, `components/statsBarGraph.tsx`) à partir des tâches actuelles, avec des préférences d'inclusion et un taux de réajustement qui n'existe plus. Cette étape écrit la règle dans `src/domain`, en TypeScript pur et testé. Le branchement dans l'app se fera en phase 2.

L'étape clôt aussi la phase 1 : la puce de la migration est retirée de l'offre, et le critère « Terminé quand » est vérifié.

### Décisions de Yanis (planification)
1. **Semaine** : du lundi au dimanche, quelle que soit la langue.
2. **Journée ouverte** : elle n'a pas d'enregistrement. Ses tâches actuelles comptent dans les tâches prévues, les tâches faites, la complétion et la charge. Elle ne compte jamais comme journée parfaite, et elle est neutre pour la série (`provisional`).
3. **Journée vide** (close, hors Repos, sans tâche) : elle compte dans la charge, avec 0 tâche.
4. **Complétion** : un ratio global, tâches faites / tâches prévues sur toute la période.
5. **Série d'une période** : la plus longue suite de journées réussies **à l'intérieur** de la période, avec la règle `nextStreak`. Rien n'est reporté d'avant la période. La série en cours reste celle de la carte Série (phase 2).
6. **Préférences conservées** : `includeToday`, `includeFutureDays`, `includeEmptyDays` et `includeRestDays`. Elles ne changent jamais la série ni les journées parfaites.
7. **Repos** : `includeRestDays` est **désactivée par défaut**, donc le Repos est neutre, comme le dit l'offre. Activée, elle fait compter les tâches des journées de Repos dans les tâches prévues, les tâches faites, la complétion et la charge, jamais dans les journées parfaites ni dans la série. L'offre est nuancée en ce sens.
8. **Jours futurs** : `includeFutureDays` est **désactivée par défaut** (elle est activée aujourd'hui). Activée, elle fait compter les tâches prévues des jours futurs de la période, comme la journée ouverte.
9. **Migration** : la puce « Les personnes ayant déjà un compte choisissent un nouvel objectif lors de la migration… » est retirée de l'offre.

### Périmètre
Case de la roadmap couverte, recopiée mot pour mot :
- [ ] Statistiques de la semaine, du mois et de l'année : complétion, charge, journées parfaites, série. Les périodes sont identifiées par `week | month | year`, plus par des libellés. Elles se calculent sur les enregistrements des journées closes (`DayRecord`, [P1-04](P1-04-verrouillage-report.md)), pas sur les tâches actuelles.

Et le critère de fin de la phase 1 : « chaque puce des sections « Objectif, journées et Repos » de l'offre correspond à au moins un test nommé d'après elle, et la couverture de `src/domain` est de 100 % ».

### Hors périmètre
- Tout branchement dans l'app : `lib/calculateStats.ts`, `components/statsBarGraph.tsx`, `app/(tabs)/stats/index.tsx`, `StatsPreferencesModal`, `useStatsPreferences` et leurs valeurs par défaut restent inchangés (phase 2).
- La période « Global » de l'app, absente de l'offre et de la roadmap (voir Questions).
- Les statistiques par tag et les « analyses détaillées » de Dun+ (phases 2 et 3).
- Les droits gratuit / Dun+ par période (phase 3, `can()`).
- Les libellés et la mise en forme : arrondis, pourcentage, « Du … au … ». Le domaine renvoie des nombres bruts.
- La série en cours et la grille de la carte Série (case de la phase 2).

### Modifications

Mêmes règles que les étapes précédentes : TypeScript pur ; imports limités aux fichiers de `src/domain` ; ni `new Date()`, ni `Date.now()`, ni `Intl` ; une `RangeError` dont le message commence par le nom de la fonction pour toute entrée invalide ; arguments jamais modifiés ; commentaires en anglais, comme dans le reste de `src/domain`.

#### 1. `src/domain/date.ts` : ajouter `weekday(key)`
- `weekday(key: DateKey): 1 | 2 | 3 | 4 | 5 | 6 | 7`, de lundi = 1 à dimanche = 7, calculé en UTC avec `keyToUtcDate`.
- `RangeError` si la clé est invalide.
- Tests dans `date.test.ts` : un jour connu de chaque rang, un 29 février, et une clé invalide.

#### 2. `src/domain/period.ts` (nouveau) : les périodes
- `PERIOD_KINDS = ["week", "month", "year"] as const` et `type PeriodKind`.
- `type DateRange = { startKey: DateKey; endKey: DateKey }`, bornes incluses.
- `type Period = DateRange & { kind: PeriodKind }`.
- `period(kind, key): Period` renvoie la période qui contient `key` :
  - `week` : du lundi au dimanche (avec `weekday`) ;
  - `month` : du 1er au dernier jour du mois ;
  - `year` : du 1er janvier au 31 décembre.
- `shiftPeriod(period, offset)` : la période `offset` crans avant (si `offset` est négatif) ou après. `offset` doit être un entier.
- `periodBuckets(period): DateRange[]` : les tranches du graphique, comme aujourd'hui dans `statsBarGraph.tsx` :
  - `week` : 7 journées ;
  - `month` : les semaines du lundi au dimanche, coupées aux bornes du mois ;
  - `year` : les 12 mois.
- `RangeError` si `kind` est inconnu, si une clé est invalide, si `offset` n'est pas un entier ou si `startKey > endKey`.

#### 3. `src/domain/stats.ts` (nouveau) : le calcul
```ts
type StatsPreferences = {
  includeToday: boolean; includeFutureDays: boolean;
  includeEmptyDays: boolean; includeRestDays: boolean;
};
const DEFAULT_STATS_PREFERENCES = {
  includeToday: true, includeFutureDays: false,
  includeEmptyDays: true, includeRestDays: false,
};
type PeriodStats = {
  planned: number;          // tâches prévues
  done: number;             // tâches faites
  completion: number | null; // done / planned, de 0 à 1 ; null si planned = 0
  charge: number | null;     // planned / countedDays ; null si countedDays = 0
  countedDays: number;       // journées retenues pour la charge
  perfectDays: number;       // journées closes réussies
  longestStreak: number;     // plus longue série dans la période
};
periodStats(input: {
  range: DateRange; records: readonly DayRecord[];
  tasks: readonly DayTask[]; restPeriods: readonly RestPeriod[];
  openKey: DateKey;
}, preferences = DEFAULT_STATS_PREFERENCES): PeriodStats
```
`range` accepte une `Period` ou une tranche de `periodBuckets`. Règles, appliquées pour chaque jour de `range` :
- **Journée close** (`key < openKey`) : seul son enregistrement compte (tâches prévues = `tasks.length`, tâches faites = tâches `done`). Les `tasks` dont la date est close sont ignorées. **Une journée close sans enregistrement est ignorée partout** : ce sont les jours d'avant l'installation (voir Questions).
- **Journée ouverte** (`key === openKey`), retenue si `includeToday` : ses `tasks` actuelles, et son statut vient de `dayStatus` (`rest` ou `provisional`).
- **Jour futur** (`key > openKey`), retenu si `includeFutureDays` : même traitement que la journée ouverte.
- **Repos** (statut enregistré `rest`, ou `isRestDay` pour la journée ouverte et les jours futurs) : retenu seulement si `includeRestDays`.
- **Journée vide** (hors Repos, sans tâche) : 0 tâche prévue ; elle entre dans `countedDays` seulement si `includeEmptyDays`.
- **Journées parfaites** : les enregistrements de la période au statut `success`.
- **Série** : `nextStreak` appliqué jour après jour depuis 0. Une journée close enregistrée apporte son statut ; tout autre jour est neutre. On garde le maximum atteint. Les préférences n'ont pas d'effet.
- Les tâches de la Box (`date: null`) et les enregistrements hors de `range` sont ignorés.
- `RangeError` si :
  - `range`, `openKey` ou une clé d'enregistrement est invalide ;
  - `startKey > endKey` ;
  - deux enregistrements ont la même date ;
  - un enregistrement n'est pas clos (`key >= openKey`) ;
  - un statut enregistré n'est pas un `ClosedDayStatus`. Cette validation complète, pour les statistiques, la case de la phase 2 sur les statuts lus en base.

#### 4. Tests : `period.test.ts`, `stats.test.ts`
- Les `describe` sont tirés des décisions ci-dessus, plus un `describe` au texte exact de la phrase ajoutée à l'offre (point 5).
- Un test vérifie que `longestStreak` vaut `streak()` quand la série n'est jamais rompue (même règle de série).
- Cas limites :
  - semaine à cheval sur deux années (`2026-12-31` → `2026-12-28`…`2027-01-03`) ;
  - février d'une année bissextile ;
  - mois dont le 1er est un dimanche ;
  - `shiftPeriod` sur un changement d'année.

#### 5. `offre-commerciale-v1-pour-agents.md`
- Supprimer la puce de la migration.
- Ajouter à la puce du Repos, après « …neutre pour l'objectif et les statistiques. », la phrase : « Dans les statistiques, une préférence désactivée par défaut permet d'inclure les tâches des journées de Repos ; elles ne comptent jamais pour la série ni pour les journées parfaites. » Les `describe` existants restent valides.

#### 6. Documentation (agent principal)
- Fichier d'étape `docs/etapes/P1-05-statistiques.md`, avec un tableau « puce de l'offre → `describe` (fichier) » qui prouve le critère de fin de la phase 1.
- `docs/roadmap.md` :
  - cocher la case ;
  - mettre à jour l'hypothèse sur la migration (puce retirée en P1-05) ;
  - mettre à jour « État d'avancement » (phase 1 close, phase 2 en cours) ;
  - préciser la case de la phase 2 « Statistiques de la semaine » : brancher `period`, `periodBuckets` et `periodStats`, supprimer `lib/calculateStats.ts`, passer les valeurs par défaut des préférences à celles du domaine (`includeFutureDays` et `includeRestDays` désactivées) et retirer le taux de réajustement.

### Critères d'acceptation
- **CA1** : `weekday`, `period`, `shiftPeriod`, `periodBuckets`, `periodStats`, `DEFAULT_STATS_PREFERENCES` et leurs types sont exportés. Les nouveaux fichiers n'importent que depuis `./…` de `src/domain`, sans `new Date()`, `Date.now` ni `Intl`.
- **CA2** : `period` renvoie du lundi au dimanche pour `week`, et des bornes exactes pour `month` (années bissextiles comprises) et `year`. `shiftPeriod` franchit les années. `periodBuckets` renvoie 7 jours, les semaines coupées au mois, ou 12 mois.
- **CA3** : la complétion est le ratio global, `null` si rien n'est prévu ; la charge vaut tâches prévues / `countedDays`, `null` sans journée retenue.
- **CA4** : par défaut, la journée ouverte compte dans les tâches prévues, les tâches faites, la complétion et la charge, jamais dans les journées parfaites, et elle est neutre pour la série. Avec `includeToday: false`, elle est exclue. Les jours futurs sont exclus par défaut et comptent avec `includeFutureDays: true`.
- **CA5** : par défaut, une journée de Repos (enregistrée, ouverte ou future) ne compte nulle part. Avec `includeRestDays: true`, ses tâches comptent dans les tâches prévues, les tâches faites, la complétion et la charge, jamais dans les journées parfaites ni dans la série.
- **CA6** : une journée vide entre dans la charge avec 0 tâche par défaut, en sort avec `includeEmptyDays: false`, et rompt la série dans les deux cas.
- **CA7** : `longestStreak` est la plus longue série dans la période, sans rien reporter d'avant. Les préférences n'ont aucun effet sur elle, et elle est identique à `streak()` sur une série jamais rompue.
- **CA8** :
  - les journées closes sans enregistrement, les enregistrements hors période et les tâches de la Box sont ignorés ;
  - les entrées invalides (clés, `startKey > endKey`, date d'enregistrement en double, enregistrement non clos, statut inconnu, `offset` non entier, `kind` inconnu) donnent une `RangeError` préfixée par le nom de la fonction ;
  - les arguments ne sont pas modifiés.
- **CA9** : dans l'offre, la puce de la migration est retirée et la phrase sur le Repos ajoutée. Un `describe` porte exactement cette phrase. Le fichier d'étape contient le tableau qui associe chaque puce de « Objectif, journées et Repos » à au moins un `describe`.
- **CA10** : `npm run check` passe sans erreur ni avertissement. `src/domain` reste à 100 % sur les quatre mesures, et `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA11** : seuls sont modifiés `src/domain/date{,.test}.ts`, `src/domain/period{,.test}.ts`, `src/domain/stats{,.test}.ts`, l'offre, le fichier d'étape et `docs/roadmap.md`.

### Vérification
```bash
npm run check
```
- `grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/period.ts src/domain/stats.ts`
- `grep -F` de chaque puce de l'offre dans `src/domain/*.test.ts` pour le tableau du critère de phase.
- `git status --short` pour vérifier le périmètre.
- Simulateur : sans objet, ni l'interface ni le code de l'app ne changent.

### Questions et risques
- **Journées closes sans enregistrement** : je propose de les ignorer partout. Avec l'ancrage de l'onboarding, ce ne sont que les jours d'avant l'installation. Les compter comme vides ferait baisser la charge de la première semaine. À confirmer.
- **Période « Global »** : l'app la propose, mais ni l'offre ni la roadmap ne la mentionnent. `periodStats` accepte n'importe quelle `DateRange`, donc la question pourra être tranchée en phase 2. Faut-il la garder ? (Yanis, 26 octobre : décision reportée au branchement en phase 2.)
- **Build TestFlight de fin de phase** : la phase 1 ne touche pas au code de l'app. Je propose de le noter « sans objet » dans « État d'avancement », comme le build Release a remplacé TestFlight en phase 0. D'accord ?
- **Changement de comportement assumé** : en phase 2, `includeFutureDays` et `includeRestDays` passeront de activées à désactivées par défaut. Personne n'utilise l'app, donc aucune préférence enregistrée n'est à migrer.
- **Formulation de l'offre** : la phrase ajoutée sur le Repos (point 5) est une proposition, à amender si besoin.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Bloquant | `src/domain/stats.test.ts` | 695 lignes : la convention de `CLAUDE.md` (« au-delà d'environ 300 lignes, découper ») n'est pas respectée dans un fichier neuf. | Découper par thème en fichiers de test d'environ 300 lignes au plus, par exemple les règles tirées de l'offre et des décisions d'un côté, et de l'autre ce qui est ignoré, les entrées invalides et les arguments. Les fixtures partagées ne doivent pas devenir un export de `src/domain`. Couverture inchangée, `describe` inchangés. |
| R1-2 | Non bloquant | `src/domain/stats.ts:220` | La règle « journée vide » (`includeEmptyDays`) s'applique aussi à la journée ouverte et aux jours futurs sans tâche, selon la section 3 du plan, alors que la décision 3 ne parle que de la journée close. Avec `includeFutureDays`, les jours futurs vides font baisser la charge. C'est le comportement actuel de `isEmptyDay`. | Décision de Yanis : garder, ou limiter la règle aux journées closes. |
| R1-3 | Non bloquant | `src/domain/stats.ts:220` | Avec `includeRestDays`, un Repos sans tâche entre dans la charge avec 0 tâche, même quand `includeEmptyDays` est désactivée (le Repos n'est pas une « journée vide »). C'est aussi le comportement actuel. | Décision de Yanis. |
| R1-4 | Non bloquant | `src/domain/stats.ts:195` | Les périodes de Repos ne sont validées que si la journée ouverte ou un jour futur est lu (via `dayStatus`). Un Repos invalide passe inaperçu sur une période entièrement close. | Ignorer : les Repos des journées closes ne sont pas lus, ils sont dans l'enregistrement. |
| R1-5 | Non bloquant | `src/domain/period.ts:93` | Aux bornes du calendrier (semaine du 0000-01-01 ou du 9999-12-31, décalage énorme), la `RangeError` est préfixée par `addDays:` au lieu du nom de la fonction appelée. `openDayKey` et `dayKeysToClose` font de même. | Ignorer, ou traiter avec l'issue #38 (aides de clés). |

Vérifié et correct :
- **CA1** : exports présents. `grep -nE "^import|new Date\(\)|Date\.now|Intl"` sur `period.ts` et `stats.ts` ne trouve que des imports `./date`, `./dayRecord`, `./dayStatus`, `./period`, `./rest` et `./streak`.
- **CA2** : `period` (lundi = `addDays(key, 1 - weekday(key))`), `lastOfMonth` par `isDateKey` (années bissextiles, 2000, 2100), `shiftPeriod` en mois (index négatif refusé), `periodBuckets` (7 jours, semaines coupées au mois, 12 mois ; novembre 2026 commence par une tranche d'un jour). `weekday("0001-01-01") = 1` et `weekday("9999-12-31") = 5` sont justes dans le calendrier grégorien proleptique.
- **CA3** : `completion = done / planned` ou `null`, `charge = planned / countedDays` ou `null`, sans arrondi (`stats.ts:236-244`).
- **CA4** : `read()` (`stats.ts:196-212`) : la journée ouverte selon `includeToday` et les jours futurs selon `includeFutureDays`. Leur statut vient de `dayStatus` (`provisional` ou `rest`), et seuls les enregistrements nourrissent la série et les journées parfaites (`stats.ts:223-230`).
- **CA5** : un Repos enregistré, ouvert ou futur n'est retenu qu'avec `includeRestDays`, jamais comme journée parfaite (statut `rest`) ni dans la série (`nextStreak` neutre).
- **CA6** : une journée vide entre dans la charge selon `includeEmptyDays`. La série est rompue par l'enregistrement `empty`, quelle que soit la préférence.
- **CA7** : la série commence à 0 au début de `range`, le maximum est gardé, et les 16 combinaisons de préférences sont testées. `longestStreak === streak()` est testé.
- **CA8** : describes « Ce qui est ignoré », « Entrées invalides » et « Arguments » (objets gelés). Tous les enregistrements sont validés, y compris hors période : clé, doublon, non clos, statut.
- **CA9** : l'offre ne contient plus la puce de la migration, et la phrase sur le Repos est ajoutée. `grep -c` de cette phrase donne 1 dans l'offre et 1 dans `stats.test.ts`. Le tableau du critère de phase est dans « Résultat ».
- **CA10** : `npm run check` passe (12 suites, 276 tests), et les 9 fichiers de `src/domain` sont à 100 % sur les 4 mesures. `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA11** : `git status --short` ne liste que l'offre, `src/domain/date{,.test}.ts`, `src/domain/period{,.test}.ts`, `src/domain/stats{,.test}.ts` et ce fichier d'étape.
- Écart jugé conforme : le type `PeriodStatsInput`, nommé et exporté, au lieu d'un type écrit en ligne.
- Simulateur : sans objet, ni l'interface ni le code de l'app ne changent.

R1-1 transmis à l'implémenteur. R1-2 à R1-5 sont laissés à la décision de Yanis (voir « Problèmes non bloquants »).

## Revue — tour 2

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème. | — |

Vérifié et correct :
- **R1-1 corrigé** : `stats.test.ts` (279 lignes), `stats.days.test.ts` (234), `stats.streak.test.ts` (175) et `stats.inputs.test.ts` (258). Chaque fichier a ses propres fixtures, sans fichier d'aides ni nouvel export de `src/domain`. `jest.config.js` n'est pas modifié.
- `npm run check` passe (15 suites, 276 tests, comme avant le découpage). `src/domain` est à 100 % sur les 4 mesures, et `grep -rn "istanbul ignore" src` ne renvoie rien.
- `src/domain/stats.ts`, `period.ts`, `date.ts` et l'offre n'ont pas changé depuis le tour 1 (horodatages antérieurs à la revue).

Aucun problème bloquant restant.

## Résultat

### Ce qui a été fait
- `src/domain/date.ts` : `weekday(key)`, de lundi = 1 à dimanche = 7.
- `src/domain/period.ts` : `PERIOD_KINDS`, `DateRange`, `Period`, `period(kind, key)`, `shiftPeriod(period, offset)` et `periodBuckets(period)` (jours, semaines coupées au mois, ou mois).
- `src/domain/stats.ts` : `StatsPreferences`, `DEFAULT_STATS_PREFERENCES` (gelé), `PeriodStats`, `PeriodStatsInput` et `periodStats(input, preferences)`. Il calcule les tâches prévues, les tâches faites, la complétion, la charge, `countedDays`, les journées parfaites et la plus longue série de la période.
- Tests : `date.test.ts` (`weekday`), `period.test.ts`, et `stats{,.days,.streak,.inputs}.test.ts`.
- Offre : la puce de la migration est retirée, et une phrase est ajoutée sur la préférence Repos des statistiques.

### Vérification finale
- `npm run check` : succès (typecheck, eslint sans avertissement, Prettier, 15 suites et 276 tests). `src/domain` est à 100 % (lignes, branches, fonctions, instructions).
- `grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/period.ts src/domain/stats.ts` : seulement des imports `./…`.
- Simulateur : sans objet, ni l'interface ni le code de l'app ne changent.

### Critère de fin de la phase 1
Chaque puce de « Objectif, journées et Repos » de l'offre a au moins un `describe` à son texte exact (vérifié par script) :

| Puce de l'offre | describe (fichier) |
|---|---|
| 1. Le premier objectif… | « Le premier objectif correspond à la cible choisie à l'onboarding : 1, 2, 3, 4, 7 ou 14 journées réussies. » (`goal`) |
| 2. Une journée se clôt à minuit… | « Une journée se clôt à minuit » (`date`) ; « Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire. » (`dayStatus`, `goal`, `streak`, `stats`) ; « Une journée vide hors Repos ou incomplète rompt la série. » (`dayStatus`, `streak`, `stats.streak`) |
| 3. La journée où l'objectif est confirmé… | « La journée où l'objectif est confirmé peut compter si elle se clôt à 100 %, même si des tâches ont été faites avant cette confirmation. » et « La première réussite datée et la série courante sont distinctes. » (`goal`) ; « L'objectif et les statistiques utilisent la même règle de série. » (`streak`, `stats.streak`) |
| 4. Le Repos activé pendant une journée ouverte… | « Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques. » (`rest`, `streak`, `stats.days`) ; « Dans les statistiques, une préférence désactivée par défaut permet d'inclure les tâches des journées de Repos ; elles ne comptent jamais pour la série ni pour les journées parfaites. » (`stats.days`) ; « Sa date de fin est incluse. », « Une annulation avant minuit rend la journée en cours normale, sans modifier les jours déjà clos. » et « Aucun Repos ne s'ajoute rétroactivement à une journée close. » (`rest`) |
| 5. À sa clôture, une journée est enregistrée… | « À sa clôture, une journée est enregistrée avec ses tâches, leur état et leurs tags. » (`dayRecord`) ; « L'objectif, la série et les statistiques s'appuient sur cet enregistrement, qui ne change plus. » (`dayRecord`, `stats`) |
| 6. Les tâches d'une journée close restent modifiables… | « Les tâches d'une journée close restent modifiables, sans verrouillage ; ces modifications ne changent pas son enregistrement. » (`dayRecord`). La 2e phrase (« Les journées antérieures au premier jour d'utilisation… »), ajoutée le 26 octobre, sera testée avec sa case de la phase 2. |
| 7. Une journée dont les tâches ou leur état ont changé… | même texte (`dayRecord`) |
| 8. Reporter une tâche… | même texte, et « Changer la date d'une autre tâche n'est pas un report. » (`postpone`) |
| 9. Les nouvelles journées suivent le fuseau de l'iPhone… | « Les nouvelles journées suivent le fuseau de l'iPhone » et « Une journée déjà enregistrée garde sa date et ne se rouvre pas lors d'un voyage » (`date`). La 3e phrase (« La journée ouverte est la plus tardive… ») est testée sous « openDayKey et dayKeysToClose » (`date`) et « Avec la journée ouverte après un voyage vers l'ouest » (`dayStatus`), sans `describe` à son texte exact. |

Couverture de `src/domain` : 100 %. La phase 1 est close.

### Décisions
- Décisions 1 à 9 de la planification (voir ci-dessus).
- Période « Global » : sa décision est reportée au branchement des statistiques en phase 2 (confirmé par Yanis le 26 octobre 2026).
- Build TestFlight de fin de phase 1 : non fait. `src/domain` n'est pas branché sur l'app ; le seul changement de l'app pendant la phase 1 est le Daily à minuit au lieu de 4 h (P1-01), mécanique et vérifié sur simulateur. Yanis accepte ce risque (26 octobre 2026).
- Journées closes sans enregistrement : `periodStats` les ignore partout (confirmé par Yanis le 26 octobre 2026). Yanis décide en plus qu'elles ne reçoivent plus de tâche :
  - une phrase est ajoutée à la puce de l'offre sur les journées closes modifiables : « Les journées antérieures au premier jour d'utilisation, sans enregistrement, ne reçoivent pas de tâche. » ;
  - une case est ajoutée en phase 2 de la roadmap : création et déplacement refusés vers ces journées, par une règle de `src/domain` ; limite recalculée après une restauration ; journées grisées dans le calendrier ;
  - la règle « ignorées partout » de `periodStats` reste valable et sert de filet de sécurité.
- `stats.test.ts` est découpé en 4 fichiers (R1-1).

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-2 | La règle « journée vide » s'applique aussi à la journée ouverte et aux jours futurs sans tâche. | gardé tel quel (comportement actuel de l'app) |
| R1-3 | Avec `includeRestDays`, un Repos sans tâche entre dans la charge même sans `includeEmptyDays`. | gardé tel quel (comportement actuel de l'app) |
| R1-4 | Les périodes de Repos ne sont validées que si la journée ouverte ou un jour futur est lu. | ignoré |
| R1-5 | La `RangeError` est préfixée par `addDays:` aux bornes du calendrier. | à traiter avec l'issue #38 (aides de clés de `src/domain`) |

## Pour l'étape suivante
- **Phase 2** : elle commence par la base locale (schéma Drizzle, `day_records`, clôture des journées). Les statistiques se branchent avec la case « Statistiques de la semaine », qui précise maintenant les fonctions à appeler et les nouvelles valeurs par défaut des préférences.
- **Brancher `periodStats`** :
  - `records` reçoit les `DayRecord` lus en base ; `periodStats` refuse un statut inconnu (`RangeError`), ce qui couvre déjà les statistiques pour la case « Valider les statuts de journée lus en base » ;
  - `tasks` reçoit les tâches non supprimées ; seules celles de la journée ouverte et des jours futurs sont lues ;
  - `openKey` vient de `openDayKey`.
- **Graphique** : `periodBuckets` donne les tranches, et `periodStats` se calcule par tranche. Les libellés (« Du … au … », jours, mois) et les arrondis restent dans `features/stats`.
- **Journées antérieures au premier jour d'utilisation** (case de la phase 2) : la règle de refus va dans `src/domain`, avec un `describe` au texte exact de la nouvelle phrase de l'offre. Elle doit prendre la limite en paramètre (premier jour couvert), et non la date d'installation, à cause de la restauration.
- **Issue #38** : traiter avec elle le préfixe des `RangeError` aux bornes du calendrier (R1-5), qui vaut aussi pour `openDayKey` et `dayKeysToClose`.
- **Préférences** : `useStatsPreferences` et `StatsPreferencesModal` gardent les 4 préférences, avec les valeurs par défaut de `DEFAULT_STATS_PREFERENCES`. Le taux de réajustement disparaît.
- **Période « Global »** : absente de l'offre. À trancher avec Yanis au branchement ; `periodStats` accepte n'importe quelle `DateRange`.
- **Droits** : mois et année sont Dun+ (offre) ; `can()` arrive en phase 3.
