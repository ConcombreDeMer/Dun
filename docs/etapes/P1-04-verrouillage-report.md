# P1-04 — Report et enregistrement des journées closes (verrouillage retiré)

- **Statut** : terminée
- **Branche** : `feat/p1-04-verrouillage-report`
- **Phase** : 1 — Noyau métier testé

## Plan validé

### Contexte

P1-01 à P1-03 ont posé `src/domain` : `date.ts`, `rest.ts`, `dayStatus.ts`, `streak.ts`, `goal.ts`, couverts à 100 %. Il reste la section « Tâches et statistiques » (3 cases). Elle est trop grosse pour une PR : **je la découpe**. Cette étape traite le verrouillage et le report, qui portent tous deux sur les actions permises sur une tâche d'une journée close. Les statistiques (semaine, mois, année) feront P1-05.

Le code actuel est incohérent (exploration) :
- le verrouillage s'appuie sur `resolved_at` (posé par la revue du Daily), pas sur la clôture à minuit : une tâche passée non « résolue » est bloquée, une tâche résolue est modifiable après confirmation (`lib/tasks.ts:316-412, 503-594`, `lib/lateAdjustmentConfirmation.ts`) ;
- trois façons de changer une date : report du Daily (en place, `delay_count + 1`, sans contrôle du verrou, `lib/daily.ts:238`), `resolveOverdueTask` (copie de la tâche, `+1`, inutilisé, `lib/tasks.ts:651`), tout le reste (en place, sans incrément) ;
- le verrouillage est forcé pour les gratuits (`app/settings/index.tsx:204-216`), contrairement à l'offre (« activables ou désactivables »).

Rien de cela n'est branché dans cette étape : on écrit les règles pures, l'app les utilisera en phase 2.

### Décisions de Yanis (planification)

1. **Statut d'une journée close** : figé si le verrouillage est actif (statut enregistré dans `day_records`) ; verrouillage désactivé, il suit les tâches. À la réactivation, le statut se fige tel qu'il est à ce moment.
2. **Verrouillage actif, tâche d'une journée close** : tout est permis après une confirmation, et l'action compte comme réajustement (`late_adjusted_at`). Créer une tâche sur une journée close, ou y déplacer une tâche, est refusé.
3. **Daily** : reporter, terminer en retard et supprimer une tâche d'une journée close ne sont pas des réajustements quand ils sont faits depuis le Daily. Faits ailleurs (accueil, fiche), terminer et supprimer en sont.
4. **Report** : seul le déplacement d'une tâche **non faite** d'une journée close vers la journée ouverte ou plus tard est un report (`delay_count + 1`), quel que soit l'écran. Changer la date d'une autre tâche n'en est pas un. Un report n'est jamais un réajustement.
5. **Taux de réajustement** : gardé, et gratuit (dans les statistiques de la semaine). Calculé en P1-05.
6. Verrouillage désactivé : toute action est permise, sans confirmation ni réajustement (texte actuel de l'app : « Ce mode rend ton historique librement modifiable »).

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] Verrouillage des jours passés (activable) : quelles actions sont permises sur une tâche d'un jour clos.
- [ ] **Une seule sémantique pour « reporter »** : déplacer la tâche et incrémenter `delay_count`. Écrire la décision dans `CLAUDE.md`.

### Hors périmètre

- Statistiques (complétion, charge, journées parfaites, série par période, taux de réajustement) : P1-05.
- Brancher l'app : `lib/tasks.ts`, `lib/daily.ts`, `lib/lateAdjustmentConfirmation.ts`, `TaskItem`, `popUpTask`, `create-task`, `liquidCreateModal`, réglages. Phase 2.
- Le stockage (`day_records`, `late_adjusted_at`, `delay_count`) et la suppression logique ou définitive : phase 2.
- Le verrouillage forcé pour les gratuits (`app/settings/index.tsx:204-216`) : phase 3.
- Les textes de l'app (`locales/*.yaml`).

### Modifications

Même règle que P1-01 à P1-03 : TypeScript pur, imports limités à `./date`, `./dayStatus` (et entre les nouveaux fichiers), ni `new Date()`, ni `Date.now()`, ni `Intl`. Entrées invalides → `RangeError` préfixée par le nom de la fonction. Aucune fonction ne modifie ses arguments. Une journée est close quand `key < openKey`, comme `dayStatus`.

#### 1. `src/domain/postpone.ts` (nouveau) — décision 4

- `type MovableTask = { date: DateKey | null; done: boolean; delayCount: number }` (`date: null` = Box).
- `isPostpone(task, targetKey: DateKey | null, openKey): boolean` : vrai si et seulement si `task.date !== null && task.date < openKey && !task.done && targetKey !== null && targetKey >= openKey`.
- `moveTask<T extends MovableTask>(task: T, targetKey: DateKey | null, openKey): T` : la **seule** façon de changer la date d'une tâche. Renvoie une copie avec `date = targetKey` et `delayCount + 1` si `isPostpone`, sinon inchangé. Erreur si une clé est invalide ou si `delayCount` n'est pas un entier ≥ 0. Elle ne décide pas si le déplacement est permis : c'est `taskActionRule`.

#### 2. `src/domain/lock.ts` (nouveau) — décisions 1, 2, 3, 6

- `type TaskAction = { type: "toggleDone" } | { type: "edit" } | { type: "tags" } | { type: "delete" } | { type: "move"; targetKey: DateKey | null }` (`edit` = nom ou description).
- `type ActionSource = "daily" | "app"`.
- `type ActionRule = "allowed" | "adjustment" | "refused"` : `adjustment` = permis après confirmation, et la tâche est marquée réajustée (une tâche ne compte qu'une fois : la confirmation peut être sautée si elle l'est déjà, décision d'écran).
- `canCreateTask(key: DateKey | null, openKey, lockEnabled): boolean` : faux seulement si verrouillage actif et `key < openKey` ; la Box est toujours permise.
- `taskActionRule({ task, action, source, openKey, lockEnabled }): ActionRule` (`task: MovableTask`), dans cet ordre :
  1. verrouillage désactivé → `allowed` ;
  2. `move` vers une journée close (`targetKey !== null && targetKey < openKey`) → `refused` ;
  3. tâche hors d'une journée close (Box, journée ouverte ou future) → `allowed` ;
  4. `move` qui est un report (`isPostpone`) → `allowed` ;
  5. `source === "daily"` et `toggleDone` ou `delete` → `allowed` ;
  6. sinon → `adjustment`.
- `nextRecordedStatus(recorded: DayStatus | null, computed: DayStatus, lockEnabled): DayStatus` : le statut à enregistrer pour une journée close. `null` (clôture) → `computed` ; verrouillage actif → `recorded` ; désactivé → `computed`. Ainsi, réactiver le verrouillage fige le statut du moment. Erreur si l'un des deux vaut `provisional` (une journée close ne l'est jamais).

Si `lock.ts` dépasse ~300 lignes avec sa documentation, `nextRecordedStatus` passe dans `src/domain/dayRecord.ts`.

#### 3. Tests : `src/domain/postpone.test.ts` et `src/domain/lock.test.ts` (nouveaux)

Comme en P1-01 à P1-03 : tests en français, scénario d'octobre 2026 (journée ouverte jeudi 15, journée close mercredi 14), `describe` qui reprennent **mot pour mot** les nouvelles phrases de l'offre (§4).
- `postpone.test.ts` : report d'une tâche non faite du mercredi vers jeudi et vers samedi (`+1`, deux reports successifs → 2) ; pas de report pour une tâche faite, une tâche du jour ou future, une tâche de la Box, une cible dans la Box, une cible close ; les autres champs sont conservés (générique) ; entrées invalides.
- `lock.test.ts` : chaque ligne de la table de `taskActionRule` (5 actions × source × journée close / ouverte / Box × verrouillage), `canCreateTask` (passé, jour, futur, Box, verrou on/off), `nextRecordedStatus` (clôture, figé, suit les tâches, réactivation = statut du moment, `provisional` refusé). Un cas enchaîné avec `dayStatus` : verrouillage actif, une tâche cochée en retard ne change pas le statut enregistré ; désactivé, la journée devient `success`.
- `Object.freeze` sur les arguments.

Couverture de `src/domain` à 100 % sur les 4 mesures, sans `istanbul ignore`.

#### 4. Offre et `CLAUDE.md` (décisions à reporter, plan validé tel quel par Yanis)

`offre-commerciale-v1-pour-agents.md` :
- tableau, ligne Statistiques, colonne Gratuit : « Statistiques de la semaine, taux de réajustement compris » ;
- section « Objectif, journées et Repos », nouvelles puces (formulation à amender si besoin) :
  - « Verrouillage activé, le statut d'une journée close est figé. On ne crée ni ne déplace de tâche vers une journée close ; toute autre modification d'une tâche d'une journée close demande une confirmation et compte comme réajustement. »
  - « Depuis le Daily, reporter, terminer en retard ou supprimer une tâche d'une journée close ne compte pas comme réajustement. »
  - « Verrouillage désactivé, l'historique est librement modifiable et le statut d'une journée close suit ses tâches. Le réactiver fige le statut du moment. »
  - « Reporter une tâche, c'est déplacer une tâche non faite d'une journée close vers la journée ouverte ou plus tard ; son nombre de reports augmente d'un. Changer la date d'une autre tâche n'est pas un report. »

`CLAUDE.md`, section Conventions, une puce : « **Reporter** : une seule sémantique, `moveTask` (`src/domain/postpone.ts`) : la tâche change de date et `delay_count` augmente d'un seulement pour une tâche non faite d'une journée close déplacée vers la journée ouverte ou plus tard. Jamais de copie de la tâche. »

#### 5. Documentation de l'étape (agent principal)

`docs/etapes/P1-04-verrouillage-report.md` ; `docs/roadmap.md` : cocher les 2 cases, « État d'avancement » (prochaine étape : statistiques, P1-05).

### Critères d'acceptation

- **CA1** : `postpone.ts` exporte `MovableTask`, `isPostpone`, `moveTask` ; `lock.ts` exporte `TaskAction`, `ActionSource`, `ActionRule`, `canCreateTask`, `taskActionRule`, `nextRecordedStatus`. Imports limités à `./date`, `./dayStatus`, `./postpone` ; ni `new Date()`, ni `Date.now()`, ni `Intl`.
- **CA2** : `moveTask` incrémente `delayCount` seulement quand `isPostpone` est vrai ; chaque condition de `isPostpone` a un test qui la rend fausse.
- **CA3** : `taskActionRule` suit l'ordre du §2 ; chaque règle (1 à 6) a au moins un test, dont : report permis sans réajustement verrou actif, `toggleDone` et `delete` permis depuis le Daily mais `adjustment` depuis l'app, déplacement vers une journée close refusé, tout `allowed` verrou désactivé.
- **CA4** : `canCreateTask` refuse une journée close verrou actif, et permet la Box, la journée ouverte, le futur, et tout verrou désactivé.
- **CA5** : `nextRecordedStatus` : clôture → statut calculé ; verrou actif → statut enregistré ; désactivé → calculé ; `provisional` refusé. Un test montre qu'une réactivation fige le statut du moment.
- **CA6** : entrées invalides (clé, `delayCount` négatif ou non entier) → `RangeError` préfixée ; arguments non modifiés (`Object.freeze`).
- **CA7** : l'offre contient les 4 puces et la mention du taux de réajustement ; les `describe` reprennent ces puces mot pour mot (`grep -F`).
- **CA8** : `CLAUDE.md` contient la puce « Reporter ».
- **CA9** : `npm run check` passe sans erreur ni avertissement, `src/domain` à 100 % ; `grep -rn "istanbul ignore" src` vide.
- **CA10** : aucun fichier modifié hors de `src/domain/postpone*.ts`, `src/domain/lock*.ts` (et `dayRecord*.ts` le cas échéant), l'offre, `CLAUDE.md`, le fichier d'étape et `docs/roadmap.md`.

### Vérification

```bash
npm run check
```

```bash
grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/postpone.ts src/domain/lock.ts
```

```bash
grep -rn "istanbul ignore" src; git status --short
```

Pas de test sur simulateur : ni l'interface ni le code de l'app ne changent.

### Questions et risques

- **Découpage** : la section « Tâches et statistiques » est faite en deux étapes ; les statistiques deviennent P1-05.
- **Formulation des puces de l'offre** (§4) : validée telle quelle avec le plan ; les tests en reprennent le texte mot pour mot.
- **Conséquence du verrou désactivé** : une journée close avec 1 tâche faite et 1 tâche reportée devient `success` (la tâche reportée la quitte) ; avec une seule tâche reportée, elle devient `empty` et rompt toujours la série. C'est cohérent avec « historique librement modifiable », je le signale.
- **Fin de phase 1** : les nouvelles puces de l'offre entrent dans la section « Objectif, journées et Repos », donc dans le critère « Terminé quand » ; elles auront chacune un test. La puce de la migration reste à trancher (noté en P1-03).
- **Verrouillage forcé pour les gratuits** (`app/settings/index.tsx:204-216`) : contraire à l'offre. Je propose de l'ajouter à la phase 3 (« Supprimer … `useEffect` qui écrivent pour corriger un droit ») si ce n'est pas déjà couvert ; je ne modifie pas la roadmap sans accord.
- **`resolveOverdueTask`** (copie de tâche) et `resolved_at` deviennent sans objet ; ils disparaîtront à la reconstruction du Daily (phase 2). À noter dans « Pour l'étape suivante ».

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `src/domain/postpone.ts:28` | `assertKeys` (validation de clés acceptant `null`) est exporté par `postpone.ts` et réutilisé par `lock.ts`. C'est une aide générique sur les clés, qui aurait sa place dans `date.ts` (hors des fichiers du plan). Même choix que `assertConsecutiveDays` en P1-03. | Ignorer, ou la déplacer dans `date.ts` avec l'issue #38. |
| R1-2 | Non bloquant | `src/domain/lock.ts:101` | Règle 5 : depuis le Daily, `toggleDone` est `allowed` même sur une tâche déjà faite (la décocher). Le Daily ne montre que les tâches en retard non faites, donc ce cas ne devrait pas se produire, mais la règle ne l'exclut pas. | Ignorer, ou limiter la règle 5 aux tâches non faites (décocher depuis le Daily deviendrait un réajustement). |
| R1-3 | Non bloquant | `src/domain/lock.ts:92` | Verrou actif, « déplacer » une tâche d'une journée close vers sa propre date est `refused`. Sans effet réel (aucun changement), mais l'écran doit éviter d'appeler la règle pour une date inchangée. | Ignorer ; à garder en tête au branchement (phase 2). |

Écarts de l'implémenteur au plan, jugés conformes :
- `assertKeys` exporté (voir R1-1).
- `isPostpone`, `canCreateTask` et `taskActionRule` valident aussi leurs clés : c'est la règle générale du plan (« Entrées invalides → `RangeError` préfixée »).

Vérifié et correct :
- **CA1** : exports présents. `grep -rnE "^import|new Date\(\)|Date\.now|Intl"` sur les deux fichiers ne trouve que 4 imports, vers `./date`, `./dayStatus` et `./postpone`.
- **CA2** : `moveTask` incrémente via la même condition que `isPostpone` (`postpones`, `postpone.ts:39`). Chacune des 5 conditions a un test qui la rend fausse (describe « Changer la date d'une autre tâche n'est pas un report. ») ; deux reports successifs donnent 2.
- **CA3** : `taskActionRule` (`lock.ts:75-106`) suit l'ordre 1 à 6. Tests : tout `allowed` verrou désactivé (toutes tâches × actions × sources), déplacement vers une journée close `refused` depuis toute tâche, report `allowed` depuis les deux sources, `toggleDone`/`delete` `allowed` depuis le Daily et `adjustment` depuis l'app, édition, tags, déplacement d'une tâche faite ou vers la Box en `adjustment`.
- **CA4** : `canCreateTask` refuse mardi et mercredi verrou actif ; permet jeudi, vendredi, la Box, et tout verrou désactivé.
- **CA5** : `nextRecordedStatus` : clôture, figé, suit les tâches, `provisional` refusé ; le describe « Le réactiver fige le statut du moment. » enchaîne `failed` → `success` (désactivé) → `success` (réactivé). Cas enchaînés avec `dayStatus` dans les deux modes.
- **CA6** : clés invalides et `delayCount` à -1, 1,5, `NaN`, `Infinity` → `RangeError` préfixée ; `Object.freeze` sur `moveTask`, `isPostpone` et `taskActionRule`.
- **CA7** : l'offre contient les 4 puces et « taux de réajustement compris ». Les 7 `describe` tirés de l'offre s'y retrouvent à l'identique (`grep -F`) ; la première puce est découpée en deux `describe`, une par phrase. Les autres `describe` sont techniques (`moveTask`, `nextRecordedStatus`, `Arguments`, `Entrées invalides`).
- **CA8** : la puce « Reporter » est dans `CLAUDE.md`, section Conventions.
- **CA9** : `npm run check` sort en 0 (10 suites, 186 tests) ; les 7 fichiers de `src/domain` sont à 100 % sur les 4 mesures ; `grep -rn "istanbul ignore" src` ne renvoie rien.
- **CA10** : `git status --short` ne liste que `CLAUDE.md`, l'offre, les 4 fichiers `src/domain/{postpone,lock}{,.test}.ts` et ce fichier d'étape (plus `docs/roadmap.md` après la documentation).
- Simulateur : sans objet, ni l'interface ni le code de l'app ne sont modifiés.

Aucun problème bloquant : pas de tour de correction.

## Révision du plan après la main rendue

Après le tour 1, Yanis a remis en cause le verrouillage : une to-do list ne verrouille pas les jours passés, et la fonction touchait presque toutes les autres (Daily, création, calendrier, série, statistiques, synchronisation). Le plan validé ci-dessus est remplacé par celui-ci. Les décisions 1, 2, 3, 5 et 6 de la planification sont abandonnées ; la décision 4 (report) est conservée.

### Décisions de Yanis (révision)

7. **Verrouillage retiré.** Les tâches d'une journée close sont librement modifiables : cocher, décocher, modifier, changer les tags, déplacer, supprimer, et créer une tâche sur un jour passé. Ni réglage, ni confirmation, ni réajustement.
8. **Enregistrement à la clôture.** À minuit, la journée est enregistrée avec son statut et la photo de ses tâches : nom, faite ou non, tags (nom et couleur), dans l'ordre de la journée. L'objectif, la série et les statistiques s'appuient sur cet enregistrement, qui ne change plus.
9. **Journée modifiée après sa clôture** (interface en phase 2) : un bandeau le signale dès que les tâches présentes ou leur état diffèrent de l'enregistrement, report compris, avec un texte générique. Renommer une tâche ou changer ses tags ne le déclenche pas. Un bouton ouvre l'enregistrement en lecture seule. Gratuit (« calendrier et historique »).
10. **Taux de réajustement retiré**, avec le verrouillage.
11. **Effet assumé** : une tâche supprimée reste visible dans l'enregistrement de sa journée.

### Modifications (révision)

Mêmes règles que le plan initial : TypeScript pur, imports limités aux fichiers de `src/domain`, ni `new Date()`, ni `Date.now()`, ni `Intl`, `RangeError` préfixée, arguments jamais modifiés.

#### R1. Supprimer `src/domain/lock.ts` et `src/domain/lock.test.ts`

#### R2. `src/domain/postpone.ts` : inchangé, sauf sa documentation

`moveTask` renvoie à `taskActionRule`, qui disparaît : retirer cette phrase. Le comportement et les tests ne changent pas.

#### R3. `src/domain/dayRecord.ts` (nouveau)

- `type RecordedTag = { name: string; color: string }` : le tag tel qu'il était à minuit (copie, pas une référence : un tag supprimé ou renommé ensuite reste visible).
- `type RecordedTask = { id: string; name: string; done: boolean; tags: readonly RecordedTag[] }`.
- `type ClosedDayStatus = Exclude<DayStatus, "provisional">`.
- `type DayRecord = { key: DateKey; status: ClosedDayStatus; tasks: readonly RecordedTask[] }`.
- `type ClosingTask = DayTask & RecordedTask` (la tâche telle que le stockage la fournit à la clôture).
- `closeDay(tasks: readonly ClosingTask[], restPeriods: readonly RestPeriod[], key: DateKey, openKey: DateKey): DayRecord` :
  - erreur si `key` ou `openKey` est invalide, ou si la journée n'est pas close (`key >= openKey`) ;
  - `status` = `dayStatus(tasks, restPeriods, key, openKey)` (jamais `provisional` ici) ;
  - `tasks` = les tâches dont `date === key`, dans l'ordre reçu, copiées en `RecordedTask` (`id`, `name`, `done`, copie de `tags`) ; les autres champs ne sont pas gardés ;
  - erreur si deux tâches de la journée ont le même `id` (la comparaison repose sur les `id`).
- `recordDiffers(record: DayRecord, tasks: readonly (DayTask & { id: string })[]): boolean` : compare l'enregistrement aux tâches actuelles dont `date === record.key`. Vrai si une tâche a été ajoutée, retirée (suppression, report, déplacement) ou si son état fait / non fait a changé. Le nom, les tags et l'ordre sont ignorés. Erreur si `record.key` est invalide ou si un `id` est en double (dans l'enregistrement ou dans les tâches de la journée).

Les compteurs des statistiques (prévues, faites) sont dérivés de `tasks` en P1-05.

#### R4. Tests : `src/domain/dayRecord.test.ts` (nouveau)

Scénario d'octobre 2026 (journée ouverte jeudi 15, mercredi 14 clos). `describe` qui reprennent mot pour mot les phrases de l'offre (§R5) :
- clôture : statut et photo (nom, état, tags dans l'ordre) ; seules les tâches du jour ; Box et autres jours exclus ; Repos (`rest`, tâches photographiées quand même) ; journée vide ; journée ouverte ou future refusée ;
- l'enregistrement ne change plus : cocher en retard, décocher, supprimer, ajouter, reporter (avec `moveTask`) → `recordDiffers` vrai, enregistrement inchangé ; la série calculée avec `streak` sur les statuts enregistrés ne bouge pas ;
- renommer, changer les tags, réordonner → `recordDiffers` faux ;
- supprimer une tâche faite et en ajouter une autre faite (mêmes totaux) → `recordDiffers` vrai ;
- un tag renommé ou supprimé après la clôture reste tel quel dans la photo ;
- `id` en double, clés invalides → `RangeError` préfixée ; `Object.freeze` sur les arguments.

Couverture de `src/domain` à 100 % sur les 4 mesures.

#### R5. Offre

- Tableau, ligne « Tâches et Box », colonne Gratuit : « Tâches datées et Box sans limite de nombre ; calendrier et historique, avec l'enregistrement de chaque journée close ».
- Tableau, ligne « Daily, verrouillage et Repos » → « Daily et Repos » : « Daily activable ou désactivable ; mode Repos » | « Les mêmes fonctions ».
- Tableau, ligne Statistiques, colonne Gratuit : revenir à « Statistiques de la semaine ».
- Section « Objectif, journées et Repos » : remplacer les 4 puces ajoutées au premier tour par :
  - « À sa clôture, une journée est enregistrée avec ses tâches, leur état et leurs tags. L'objectif, la série et les statistiques s'appuient sur cet enregistrement, qui ne change plus. »
  - « Les tâches d'une journée close restent modifiables, sans verrouillage ; ces modifications ne changent pas son enregistrement. »
  - « Une journée dont les tâches ou leur état ont changé après sa clôture le signale ; son enregistrement reste consultable. »
  - la puce du report, inchangée.

#### R6. `CLAUDE.md` : la puce « Reporter » reste telle quelle.

#### R7. Documentation (agent principal)

Fichier d'étape et `docs/roadmap.md`, selon les décisions de Yanis :
- phase 1 : la case du verrouillage est remplacée par l'enregistrement des journées closes ; la case des statistiques précise qu'elles se calculent sur les enregistrements ;
- phase 2 : `day_records` porte la photo des tâches ; la clôture utilise `closeDay` ; nouvelle case « bandeau et bouton de la journée modifiée » ; nouvelle case « supprimer le verrouillage de l'app » (réglage, confirmations, badge, taux de réajustement, `resolved_at`, `resolveOverdueTask`, `lib/lateAdjustmentConfirmation.ts`) ;
- phase 3 : tableau de répartition sans le verrouillage ;
- choix structurants : `day_records` avec la photo des tâches.

### Critères d'acceptation (révision)

- **CA-R1** : `lock.ts` et `lock.test.ts` n'existent plus ; plus aucune référence à `taskActionRule`, `canCreateTask` ou `nextRecordedStatus` dans `src`.
- **CA-R2** : `postpone.ts` : comportement et tests inchangés depuis le tour 1 ; sa documentation ne renvoie plus à `taskActionRule`.
- **CA-R3** : `dayRecord.ts` exporte `RecordedTag`, `RecordedTask`, `ClosedDayStatus`, `DayRecord`, `ClosingTask`, `closeDay`, `recordDiffers`. Imports limités à `./date`, `./dayStatus`, `./rest`. Ni `new Date()`, ni `Date.now()`, ni `Intl`.
- **CA-R4** : `closeDay` refuse une journée non close, garde seulement les tâches du jour dans l'ordre reçu, copie nom, état et tags, et calcule le statut avec `dayStatus`.
- **CA-R5** : `recordDiffers` est vrai pour un ajout, un retrait (suppression, report) et un changement d'état, y compris à totaux égaux ; faux pour un renommage, un changement de tags ou d'ordre.
- **CA-R6** : un tag modifié ou supprimé après la clôture reste tel quel dans l'enregistrement ; aucun argument n'est modifié (`Object.freeze`).
- **CA-R7** : l'offre contient les 3 nouvelles puces et la puce du report, plus les 3 lignes du tableau modifiées ; les 4 puces du tour 1 sur le verrouillage n'y sont plus ; les `describe` reprennent les nouvelles phrases mot pour mot (`grep -F`).
- **CA-R8** : `npm run check` passe sans erreur ni avertissement, `src/domain` à 100 % ; `grep -rn "istanbul ignore" src` vide.
- **CA-R9** : aucun fichier modifié hors de `src/domain/postpone*.ts`, `src/domain/dayRecord*.ts`, la suppression de `src/domain/lock*.ts`, l'offre, `CLAUDE.md`, le fichier d'étape et `docs/roadmap.md`.

### Vérification (révision)

```bash
npm run check
```

```bash
grep -rnE "^import|new Date\(\)|Date\.now|Intl" src/domain/postpone.ts src/domain/dayRecord.ts
```

```bash
grep -rnE "taskActionRule|canCreateTask|nextRecordedStatus|istanbul ignore" src; git status --short
```

Pas de test sur simulateur : ni l'interface ni le code de l'app ne changent.

## Revue — tour 2 (révision du plan)

Ce tour fait suite à la demande de Yanis après la main rendue ; il ne compte pas dans la limite de 3 tours.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R2-1 | Non bloquant | `src/domain/dayRecord.ts:95` | Le statut est converti avec `as ClosedDayStatus`. C'est sûr (le contrôle `key >= openKey` juste avant exclut `provisional`) et commenté ; une garde explicite serait une branche inatteignable, donc non couverte. | Ignorer. |
| R2-2 | Non bloquant | `src/domain/dayRecord.ts:94` | Un Repos invalide passé à `closeDay` lève l'erreur de `dayStatus`, non préfixée `closeDay:`. | Ignorer : l'erreur reste une `RangeError` explicite. |

Problèmes non bloquants du tour 1 : R1-1 (`assertKeys` exporté) est résolu, `assertKeys` n'est plus exporté ; R1-2 et R1-3 portaient sur `lock.ts`, supprimé, et sont sans objet.

Vérifié et correct :
- **CA-R1** : `lock.ts` et `lock.test.ts` n'existent plus ; `grep -rnE "taskActionRule|canCreateTask|nextRecordedStatus|istanbul ignore|lockPast" src` ne renvoie rien.
- **CA-R2** : `postpone.ts` ne diffère du tour 1 que par la phrase de documentation retirée et `assertKeys` non exporté ; `postpone.test.ts` est inchangé.
- **CA-R3** : 7 exports présents ; imports limités à `./date`, `./dayStatus` et `./rest` ; ni `new Date()`, ni `Date.now`, ni `Intl`.
- **CA-R4** : `closeDay` refuse une journée ouverte ou future, ne garde que les tâches du jour dans l'ordre reçu, copie `id`, nom, état et tags, et calcule le statut avec `dayStatus` (Repos et journée vide testés).
- **CA-R5** : `recordDiffers` (`dayRecord.ts:118-135`) compare le nombre de tâches, puis l'état de chaque `id`. Tests : cocher en retard, décocher, supprimer, ajouter, reporter avec `moveTask`, déplacer une tâche faite, et l'échange à totaux égaux sont signalés ; renommer, changer les tags et réordonner ne le sont pas.
- **CA-R6** : un tag renommé ou supprimé après la clôture reste tel quel ; l'enregistrement ne partage ni le tableau ni les objets de tags ; `Object.freeze` sur les arguments des deux fonctions.
- **CA-R7** : l'offre contient les 3 nouvelles puces, la puce du report et les 3 lignes du tableau modifiées ; le mot « verrouillage » n'y apparaît plus qu'une fois, dans « sans verrouillage ». Les 6 `describe` tirés de l'offre s'y retrouvent à l'identique (`grep -F`).
- **CA-R8** : `npm run check` sort en 0 (10 suites, 187 tests) ; les 7 fichiers de `src/domain` sont à 100 % sur les 4 mesures.
- **CA-R9** : `git status --short` ne liste que `CLAUDE.md`, l'offre, `docs/roadmap.md`, ce fichier d'étape et `src/domain/{postpone,dayRecord}{,.test}.ts`.
- La série reste calculée par `streak` sur les statuts enregistrés : un test montre qu'elle ne bouge pas après une modification tardive.
- Simulateur : sans objet.

Aucun problème bloquant.

## Révision 2 — relecture d'ensemble avant le merge

À la demande de Yanis, relecture critique de tout le domaine (`date`, `rest`, `dayStatus`, `streak`, `goal`, `postpone`, `dayRecord`), de l'offre et de la roadmap. Les règles sont cohérentes entre elles (voyage, Repos, objectif, report et enregistrement croisés). Points relevés :

- **A** : la case « Série » de la phase 2 disait encore de partir de `dayStatus` sur les tâches actuelles, au lieu des enregistrements ; la case « Export manuel » ne mentionnait pas les enregistrements.
- **B** : la clôture « au lancement et au retour au premier plan » laisse passer une coche faite à 0 h 01 sur un écran resté ouvert : elle entrerait dans l'enregistrement de la veille.
- **C** : `dayKeysToClose(null, …)` renvoie `[]` : sans ancrage de la dernière journée close à l'onboarding, aucune journée n'est jamais enregistrée.
- **D** : la roadmap supprime `resolved_at`, qui servait aussi de mémoire au Daily (chaque tâche en retard proposée une seule fois, `lib/daily.ts:177-180`, `lib/tasks.ts:745-769`).
- **E** : chaque report déclenchait le bandeau sur sa journée d'origine, donc presque chaque Daily. Contrairement à ce que l'agent principal avait affirmé au moment de la décision, exclure les reports ne demande aucune donnée de plus : l'enregistrement contient déjà les tâches non faites à minuit.
- **F** : en phase 4, deux appareils hors ligne peuvent clôturer la même journée avec des états différents.

### Décisions de Yanis (révision 2)

12. **Le retard ne s'accumule que par un report explicite.** Une tâche laissée sans action dans le Daily reste non faite sur son jour d'origine, sans report automatique.
13. **Le Daily propose une seule fois** les tâches non faites des journées tout juste closes (`dayKeysToClose`). Une tâche laissée ne revient plus. Aucune marque par tâche n'est stockée : la suppression de `resolved_at` est maintenue.
14. **Le bandeau exclut les reports** : une tâche enregistrée non faite, retrouvée à une date plus tardive, n'est pas une différence.
15. **A, B, C, D et F** sont reportés dans la roadmap sur cette branche, avant le merge.

### Plan de correction (révision 2)

#### R8. `recordDiffers` exclut les reports (`src/domain/dayRecord.ts`)

- Une tâche de l'enregistrement **non faite à minuit**, retrouvée parmi `tasks` avec une date **postérieure** à `record.key` (pas `null`), est un report : elle n'est pas une différence, quel que soit son état actuel.
- Toute autre absence reste une différence : tâche supprimée (absente de `tasks`), déplacée vers la Box, vers une date antérieure, ou tâche **faite** à minuit déplacée ailleurs.
- `tasks` doit donc contenir toutes les tâches non supprimées, pas seulement celles du jour : le dire dans la documentation de la fonction.
- Erreurs inchangées ; un `id` en double dans `tasks` hors de la journée n'a pas à être vérifié.

#### R9. Tests (`src/domain/dayRecord.test.ts`)

- Le cas « reporter » passe de « signalé » à « non signalé » ; ajouter : report puis tâche faite le jour suivant → non signalé ; report et coche en retard d'une autre tâche → signalé ; tâche non faite déplacée vers la Box ou vers un jour antérieur → signalé ; tâche faite déplacée vers un jour postérieur → signalé ; tâche reportée puis supprimée → signalé.
- Le `describe` de la puce de l'offre suit sa nouvelle formulation (R10).

#### R10. Offre

« Une journée dont les tâches ou leur état ont changé après sa clôture le signale ; son enregistrement reste consultable. » devient « Une journée dont les tâches ou leur état ont changé après sa clôture, hors report, le signale ; son enregistrement reste consultable. »

#### R11. Documentation (agent principal)

Fichier d'étape et `docs/roadmap.md` : A, B, C, D (règle du Daily), E (case du bandeau) et F (phase 4).

### Critères d'acceptation (révision 2)

- **CA-R10** : `recordDiffers` ne signale pas une tâche non faite à minuit retrouvée à une date postérieure ; il signale une suppression, un déplacement vers la Box ou vers une date antérieure, le déplacement d'une tâche faite, une coche ou décoche, un ajout. Chaque cas a son test.
- **CA-R11** : l'offre contient la phrase « …après sa clôture, hors report, le signale… », reprise mot pour mot par un `describe`.
- **CA-R12** : `npm run check` passe sans erreur ni avertissement, `src/domain` à 100 % ; aucun fichier modifié hors de `src/domain/dayRecord*.ts`, l'offre, le fichier d'étape et `docs/roadmap.md`.

## Revue — tour 3 (révision 2)

Ce tour fait suite à la demande de Yanis avant le merge ; il ne compte pas dans la limite de 3 tours.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R3-1 | Non bloquant | `src/domain/dayRecord.ts:135-140` | Le report est reconnu par « non faite à minuit et retrouvée à une date postérieure à la journée », pas par la définition exacte du report (« vers la journée ouverte ou plus tard »). Une tâche non faite déplacée vers un jour clos plus tardif (rare, depuis le calendrier) ne déclenche donc pas le bandeau sur sa journée d'origine ; la journée d'arrivée, elle, l'affiche (tâche ajoutée). Comparer au jour ouvert actuel serait faux : une tâche reportée à jeudi, restée non faite, ferait apparaître le bandeau sur sa journée d'origine dès que jeudi serait clos. Le critère exact demanderait de mémoriser le jour ouvert au moment du déplacement. C'est la conséquence du plan R8, pas un écart de l'implémenteur. | Ignorer ; le changement reste signalé sur la journée d'arrivée. |

Vérifié et correct :
- **CA-R10** : `recordDiffers` (`dayRecord.ts:124-153`) : une tâche de l'enregistrement présente dans la journée est comparée sur son état ; absente, elle n'est ignorée que si elle était non faite à minuit et existe à une date postérieure ; les tâches du jour absentes de l'enregistrement sont des ajouts (`found !== dayTasks.length`). Tests : report vers jeudi et vendredi, report puis tâche faite le lendemain → non signalé ; suppression, report puis suppression, Box, date antérieure, tâche faite déplacée, coche, décoche, ajout (seul, avec un report, à totaux égaux) → signalé.
- **CA-R11** : la phrase « …après sa clôture, hors report, le signale… » est dans l'offre, et le `describe` la reprend à l'identique (`grep -F`).
- **CA-R12** : `npm run check` sort en 0 (10 suites, 195 tests), `src/domain` à 100 % sur les 4 mesures ; `grep -rn "istanbul ignore" src` vide ; `git status --short` ne liste que `dayRecord.ts`, `dayRecord.test.ts`, l'offre, ce fichier d'étape et `docs/roadmap.md`.
- R11 (roadmap) : A, B, C, D, E et F reportés (cases « Clôturer les journées », « Daily », « Série », bandeau, « Onboarding », « Export manuel », et nouvelle case de réconciliation en phase 4).

Aucun problème bloquant.

## Résultat

### Ce qui a été fait
- **`src/domain/postpone.ts`** (nouveau) : `MovableTask`, `isPostpone` et `moveTask`, la seule façon de changer la date d'une tâche. `delayCount + 1` seulement pour une tâche non faite d'une journée close déplacée vers la journée ouverte ou plus tard ; jamais de copie de la tâche.
- **`src/domain/dayRecord.ts`** (nouveau) :
  - `closeDay` : l'enregistrement d'une journée close, son statut et la photo de ses tâches (`id`, nom, état, tags avec nom et couleur), dans l'ordre ;
  - `recordDiffers` : vrai si les tâches présentes ou leur état ont changé depuis l'enregistrement, hors report ; le nom, les tags et l'ordre sont ignorés.
- **Tests** (nouveaux) : `postpone.test.ts` et `dayRecord.test.ts`, 6 `describe` qui reprennent mot pour mot les phrases de l'offre.
- **Offre** : 3 lignes du tableau (historique avec l'enregistrement des journées, « Daily et Repos » sans verrouillage, statistiques gratuites inchangées) et 4 puces (enregistrement, tâches modifiables, journée modifiée signalée hors report, report).
- **`CLAUDE.md`** : la sémantique unique de « reporter », dans les Conventions.
- **Roadmap** : phases 1 à 4 mises à jour (voir « Décisions »).
- Le premier tour (`lock.ts` : verrouillage activable, réajustements) a été retiré à la demande de Yanis.

### Vérification finale
- `npm run check` sort en 0 : 10 suites, 195 tests, `src/domain` couvert à 100 % (instructions, branches, fonctions, lignes).
- Recherche d'imports et d'appels interdits : seulement `./date`, `./dayStatus` et `./rest`.
- `grep -rn "istanbul ignore" src` : aucun résultat.

### Décisions
- **Planification** : décision 4 (report) conservée ; décisions 1, 2, 3, 5 et 6 (verrouillage) abandonnées.
- **Révision 1** (décisions 7 à 11) : verrouillage retiré ; enregistrement à minuit (statut et photo des tâches avec nom, état, tags) ; bandeau et bouton de consultation pour une journée modifiée, gratuit ; taux de réajustement retiré ; une tâche supprimée reste dans l'enregistrement de sa journée.
- **Révision 2** (décisions 12 à 15) : le retard ne s'accumule que par un report explicite ; le Daily propose une seule fois les tâches non faites des journées tout juste closes, sans marque par tâche ; le bandeau exclut les reports ; roadmap complétée (clôture avant toute écriture, ancrage de la première journée, série depuis les enregistrements, export, réconciliation en phase 4).

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | `assertKeys` exporté par `postpone.ts` | résolu au tour 2 (plus exporté) |
| R1-2 | Décocher depuis le Daily `allowed` | sans objet (`lock.ts` supprimé) |
| R1-3 | Déplacement vers la même journée close `refused` | sans objet (`lock.ts` supprimé) |
| R2-1 | Conversion `as ClosedDayStatus` dans `closeDay` | à décider |
| R2-2 | Repos invalide : erreur non préfixée `closeDay:` | à décider |
| R3-1 | Report reconnu par « date postérieure », pas « jour ouvert ou plus tard » | à décider |

## Pour l'étape suivante
- **P1-05 — Statistiques** : dernière case de la phase 1. Elles se calculent sur les `DayRecord` (statut et tâches figés à minuit), pas sur les tâches actuelles : prévues = `tasks.length`, faites = tâches `done`. Restent à fixer avec Yanis :
  - début de semaine (lundi dans le code actuel) ;
  - journées incluses (Repos, vides, journée ouverte, qui n'a pas encore d'enregistrement, jours antérieurs au premier enregistrement) ;
  - formule de complétion (ratio global aujourd'hui, `lib/calculateStats.ts:115-164`) ;
  - série d'une période (en cours ou plus longue) ;
  - sort des préférences `includeToday`, `includeEmptyDays`, etc., que l'offre ne mentionne pas.

  Le taux de réajustement n'existe plus.
- **`achievedKey` ne bouge plus** : la question laissée par P1-03 est réglée, les statuts viennent des enregistrements.
- **Branchement en phase 2** (cases de la roadmap à jour) :
  - `closeDay` au lancement, au retour au premier plan et avant toute écriture ; l'onboarding ancre la dernière journée close à la veille de l'installation ;
  - `recordDiffers` reçoit **toutes** les tâches non supprimées, pas seulement celles du jour : sinon un report serait pris pour une suppression ;
  - `moveTask` pour tout changement de date ;
  - le Daily propose une seule fois les tâches non faites des journées tout juste closes ; `resolved_at` peut disparaître avec le verrouillage.
- **Phase 4** : réconcilier les enregistrements de journées entre appareils (case ajoutée).
- **Fin de la phase 1** : la puce de la migration reste sans test (voir P1-03) ; Yanis doit décider de la retirer de l'offre ou de l'exclure du critère.
