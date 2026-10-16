# P0-05 — README et ménage des branches

- **Statut** : terminée
- **Branche** : `docs/p0-05-readme-branches`
- **Phase** : 0 — Assainir

## Plan validé

### Contexte

P0-01 à P0-04 ont nettoyé le code, installé l'outillage (`npm run check`, CI), séparé dev et prod (`docs/environnements.md`) et aligné Expo sur le SDK 56. Il reste la section « Documentation et Git » de la phase 0 :
- le README date d'Expo 54 / RN 0.81. Il décrit des fichiers supprimés (`progressBar`), un script retiré (`reset-project`), Android, le web et Expo Go ;
- le dépôt compte une quarantaine de branches, locales et distantes.

P0-04 a laissé deux consignes pour le README : documenter la reconstruction de `ios/Pods` quand on alterne Debug et Release (R1-1), et ne plus mentionner de `postinstall`.

État constaté le 15 octobre :
- **Branches distantes fusionnées dans `origin/master`** : 30, hors `master` (`codex/*`, `chore/*`, `bugs-extermination`, `create-task-v3`, `new-daily`, `notifications`, `onboarding-with-dun`, `squircle`, `task-details-v2`…).
- **Branches non fusionnées** :

  | Branche | SHA | Commits d'avance | Dernier commit |
  |---|---|---|---|
  | `ai` | `9dc29c1` | 1 | juin 2026 |
  | `ia` (distante seulement) | `0d1bdc1` | 1 | nov. 2025 |
  | `create-task-v2` | `86bad5f` | 2 | fév. 2026 |
  | `liquid-glass` | `3381e60` | 1 | fév. 2026 |
  | `squircle` (commit local jamais poussé) | `ee097dc` | 1 | fév. 2026 |
  | `roadmap-v1` | `6efce18` | – | – |
  | `roadmap-v2` (PR #25 ouverte) | `c59af52` | – | – |

- **Branches locales sans branche distante** : 6 `codex/*`, toutes fusionnées.
- **CI de `master`** : verte sur le dernier commit (`b5c0b03`, run 38753776970).

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] Réécrire le README : installation, commandes, architecture réelle, environnements. Y expliquer comment reconstruire `ios/Pods` quand on alterne Debug et Release : les pods précompilés peuvent garder la variante de l'autre configuration (constaté en [P0-04, R1-1](P0-04-dependances-expo.md)).
- [ ] Supprimer les branches fusionnées ou abandonnées : `codex/*`, `create-task-v2`, `create-task-v3`, etc. Archiver par un tag celles qu'on veut garder pour mémoire.

Plus le constat du critère de fin de phase 0 : « la CI est verte sur `master` et `npm run check` passe sans aucun avertissement ».

### Hors périmètre

- Tout le code applicatif, `package.json` compris : les scripts `android` et `web` restent, le README dit seulement qu'ils ne sont pas pris en charge.
- Les autres documents : archives `docs/etapes/P0-0x`, `docs/audit.md`, `docs/environnements.md` (le README y renvoie, sans le recopier), `CLAUDE.md`.
- Toute action qui sort de la machine : pousser des tags, supprimer des branches distantes, fermer la PR #25, modifier les réglages GitHub. Yanis s'en charge avec les commandes préparées.
- Le contenu de `roadmap-v1` et `roadmap-v2` : on ne lit jamais ces branches, on manipule seulement leur référence (`rev-parse`, tag).

### Modifications

#### 1. `README.md` : réécriture complète, en français, sobre, avec une vitrine produit

Plan des sections :
1. **En-tête et vitrine** :
   - nom, une phrase de positionnement tirée de l'offre ;
   - l'icône, si un fichier existe vraiment dans `assets/` ;
   - les fonctions **présentes aujourd'hui dans le code et prévues par l'offre** : tâches datées et Box, calendrier, Daily, verrouillage des jours passés, Repos, tags, rappel quotidien, statistiques, thèmes et affichage, export et import… Chaque fonction est vérifiée dans le code avant d'être citée ;
   - un court paragraphe « V1 en préparation » qui renvoie à l'offre et à la roadmap pour la cible : app sans compte et hors ligne, répartition gratuit / Dun+. **Rien de ce paragraphe n'est présenté comme disponible.**
   - Pas de badge de version, pas de routines, pas d'IA, pas d'Android.
2. **Prérequis** : macOS, Xcode, Node selon `.nvmrc` (24), CocoaPods, simulateur iOS. V1 iPhone uniquement.
3. **Installation** :
   - `npm ci` ;
   - créer `.env.development` et `.env.production` depuis `.env.example`, en renvoyant à `docs/environnements.md` ;
   - `npx expo run:ios`. Le prebuild génère `ios/`, ignoré par Git (CNG).
4. **Commandes** : tableau de tous les scripts de `package.json` (`start`, `ios`, `ios:device-dev`, `typecheck`, `lint`, `test`, `format`, `format:check`, `check`, `i18n:generate`). `android` et `web` sont marqués « non pris en charge ».
5. **Environnements** : le tableau dev / prod en résumé (Debug → `.env.development`, Release → `.env.production`, `ios:device-dev`), la règle « aucun secret dans `EXPO_PUBLIC_*` » et le lien vers `docs/environnements.md`.
6. **Builds iOS et pods** :
   - Debug charge le code depuis Metro, Release l'embarque ;
   - relancer Metro avec `npx expo start --clear` après un changement de dépendances ;
   - **reconstruire `ios/Pods`** après un passage Debug ↔ Release : symptômes (échec de l'édition de liens `Sealable::Sealable()`, crash au lancement dans `Props::Props()`), puis la commande `cd ios && rm -rf Pods && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`, et la purge de DerivedData si besoin.
7. **Architecture** :
   - la stack réelle, versions lues dans `package.json` : Expo 56, RN 0.85, TypeScript 6, Expo Router, Supabase, React Query, Zustand, Reanimated, RevenueCat, Sentry ;
   - l'arborescence **réelle** : `app/`, `components/`, `lib/`, `store/`, `locales/` et `lib/i18n/` générés, `supabase/` (migrations, fonctions Deno), `plugins/`, `scripts/`, `docs/` ;
   - un lien vers l'« Architecture cible » de la roadmap.
8. **Traductions** : `locales/*.yaml`, puis `npm run i18n:generate`.
9. **Contribuer** : `CLAUDE.md`, la roadmap, `/etape-suivante`, commits conventionnels, CI (`npm run check` à chaque PR).

Aucune mention de `postinstall`, `reset-project`, Expo Go, Android ou web comme cibles prises en charge, ni de fichiers inexistants.

#### 2. Ménage des branches (en local, par l'implémenteur)

1. Créer **7 tags annotés** `archive/<nom>` :
   - `ai`, `ia`, `create-task-v2`, `liquid-glass`, `roadmap-v1` et `roadmap-v2`, depuis `origin/<nom>` ;
   - `squircle`, depuis la branche **locale** (`ee097dc`, commit jamais poussé).

   Message : `Archive de la branche <nom> (P0-05)`.
2. Vérifier pour chaque tag que `git rev-parse archive/<nom>^{commit}` donne le SHA du tableau.
3. Supprimer les branches locales :
   - les branches fusionnées avec `git branch -d` ;
   - les 6 branches locales non fusionnées archivées (`ai`, `create-task-v2`, `liquid-glass`, `squircle`, `roadmap-v1`, `roadmap-v2`) avec `git branch -D`, **seulement après la vérification du point 2**.

   Restent `master` et la branche d'étape.
4. Ne rien pousser. Rapporter l'inventaire exact : tags créés, branches supprimées, branches distantes à supprimer.

#### 3. Commandes pour Yanis (écrites par l'agent principal dans le fichier d'étape)

Dans l'ordre, prêtes à coller :
1. Pousser les 7 tags : `git push origin archive/ai archive/ia …`.
2. Fermer la PR #25 : `gh pr close 25 --comment "Archivée sous le tag archive/roadmap-v2 (P0-05)"`.
3. Supprimer **toutes** les branches distantes sauf `master` et la branche d'étape : `git push origin --delete …`. Chacune est soit fusionnée dans `origin/master`, soit archivée par un tag.
4. `git fetch --prune`, puis, après la fusion de la PR, la suppression de `docs/p0-05-readme-branches`.

#### 4. Documentation (agent principal)

- Le fichier d'étape `docs/etapes/P0-05-readme-branches.md` : plan, revues, inventaire, commandes et constat de fin de phase.
- `docs/roadmap.md` :
  - les deux cases cochées ;
  - « État d'avancement » : phase 0 terminée, sous réserve de la CI verte sur le commit de fusion. Prochaine étape : début de la phase 1 (`dateKey`, journées).

### Critères d'acceptation

- **CA1** — Le README contient les sections Prérequis, Installation, Commandes, Environnements, Builds iOS et pods, Architecture, Traductions et Contribuer. Il couvre tous les scripts de `package.json`.
- **CA2** — La procédure de reconstruction de `ios/Pods` (symptômes et commande) figure dans le README.
- **CA3** — `grep -niE "postinstall|reset-project|expo go|expo-54|v54|0\.81" README.md` ne renvoie rien. Android et le web n'y apparaissent que comme « non pris en charge ».
- **CA4** — Chaque fonction de la vitrine existe dans le code et figure dans l'offre. L'implémenteur fournit un tableau fonction → fichier, recopié dans le fichier d'étape. Rien n'est présenté comme disponible s'il ne l'est pas : ni le mode sans compte, ni l'usage hors ligne, ni la répartition Dun+, ni les routines.
- **CA5** — Chaque chemin et lien relatif du README existe (vérifié par script).
- **CA6** — Les 7 tags `archive/*` existent en local et pointent sur les SHA du tableau.
- **CA7** — `git branch` ne liste plus que `master` et `docs/p0-05-readme-branches`.
- **CA8** — Le fichier d'étape contient les commandes de la section 3. La liste des branches distantes à supprimer est exhaustive : toutes sauf `master` et la branche d'étape.
- **CA9** — `npm run check` passe sans erreur ni avertissement, `prettier` sur le README compris.
- **CA10** — Le critère de fin de phase 0 est constaté et consigné : CI verte sur `master` (`b5c0b03`) et `npm run check` vert sur la branche.

### Vérification

```bash
npm run check
```

```bash
git tag -l 'archive/*' --format='%(refname:short) %(*objectname:short)'
```

```bash
git branch
```

Plus le `grep` du CA3 et un script qui teste l'existence de chaque chemin cité dans le README. Pas de test sur simulateur : aucune interface ne change.

### Questions et risques

- **Build TestFlight de fin de phase** : la roadmap prévoit « un build TestFlight interne à la fin de chaque phase, testé sur un vrai iPhone ». C'est à toi de le faire avant de lancer la phase 1. Je le noterai dans « Pour l'étape suivante ».
- **Suppression automatique des branches après fusion** : GitHub propose le réglage « Automatically delete head branches », qui éviterait de refaire ce ménage. Réglage du dépôt, donc ta décision : je le note en non bloquant, sauf si tu veux l'ajouter au plan comme commande à lancer toi-même.
- **Réversibilité** : une fois la suppression distante faite, seuls les tags conservent les 7 branches non fusionnées. Les branches fusionnées restent accessibles par les commits de fusion des PR.
- **Vitrine** : il y a une tension entre « ce qui existe » et « ce que dit l'offre ». Par exemple, le rappel quotidien existe-t-il avec le choix des jours ? Les statistiques mensuelles sont-elles visibles en gratuit aujourd'hui ? Règle retenue : on ne cite une fonction que si elle existe et figure dans l'offre, sans dire si elle est gratuite ou Dun+. En cas de doute sur une fonction, l'implémenteur la retire de la vitrine plutôt que de la décrire au conditionnel.

Réponses de Yanis à la planification :
- **Exécution du ménage** : l'agent supprime les branches locales et crée les tags en local ; Yanis pousse les tags, supprime les branches distantes et ferme la PR #25.
- **Branches archivées par un tag** : les 7 branches non fusionnées (`ai`, `ia`, `create-task-v2`, `liquid-glass`, `squircle` local, `roadmap-v1`, `roadmap-v2`).
- **Ton du README** : sobre et en français, avec une vitrine produit limitée aux fonctions qui existent et que prévoit l'offre.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `README.md:2` | Le README affiche `assets/images/icon.png` (un « D. » sur fond noir, 71×71), alors que l'app iOS utilise `assets/icon.icon` (une coche sur fond clair). La vitrine montre peut-être une icône périmée. | Décision de Yanis : garder, ou exporter une image de l'icône actuelle. |
| R1-2 | Non bloquant | `.prettierignore` | `*.md` est exclu : `npm run check` et la CI ne vérifient pas le formatage du README ni des docs. Le README a été formaté une fois à la main (`--ignore-path /dev/null`). Dette antérieure à l'étape. | Décision de Yanis : laisser, ou inclure le Markdown dans Prettier dans une étape dédiée. |
| R1-3 | Non bloquant | `README.md:82` | La ligne prod du tableau des environnements cite « Archive Release Xcode, TestFlight, App Store ». Elle omet le bouton Run en Release et `npx expo run:ios --configuration Release`, qui lisent aussi `.env.production`. Le lien vers `docs/environnements.md` donne le détail. | Facultatif : écrire « Release Xcode (Run ou archive), TestFlight, App Store ». |

Vérifié et correct :
- **CA1** : les 8 sections sont présentes, et les 12 scripts de `package.json` figurent dans le tableau `README.md:60-73`.
- **CA2** : la procédure de reconstruction des pods est à `README.md:99-118`. Les symptômes et la commande sont ceux de P0-04.
- **CA3** : le `grep` ne renvoie rien (code de sortie 1). Android et le web n'apparaissent qu'aux lignes 72 et 73, avec la mention « Non pris en charge ».
- **CA4** : vérifié par sondage dans le code :
  - les interrupteurs Daily et verrouillage dans `app/settings/index.tsx` ;
  - `restEndDate` dans `app/rest.tsx` ;
  - les calendriers « Slider » et « Compact » dans `locales/fr.yaml` ;
  - les périodes semaine, mois et année dans `lib/calculateStats.ts:1` ;
  - `scheduleDailyReminder` dans `lib/notificationService.ts`.

  La vitrine ne dit pas ce qui est gratuit ou Dun+. Le paragraphe « V1 en préparation » dit explicitement que l'app demande aujourd'hui un compte.
- **CA5** : script de l'implémenteur relancé, « Tous les chemins existent » (29 entrées).
- **CA6** : 7 tags annotés, aux SHA attendus.
- **CA7** : `git branch` ne liste que `docs/p0-05-readme-branches` et `master`.
- **CA8** : voir « Commandes pour Yanis » ci-dessous.
- **CA9** : `npm run check` sort en 0. `prettier --check --ignore-path /dev/null README.md` passe.
- **CA10** : voir « Constat de fin de phase 0 ».
- **Périmètre** : seul `README.md` est modifié dans le dépôt, avec ce fichier d'étape et la roadmap. Les branches `roadmap-v1` et `roadmap-v2` n'ont pas été lues.

Aucun problème bloquant : pas de tour de correction.

## Résultat

### Ce qui a été fait
- **`README.md` réécrit** :
  - vitrine limitée aux fonctions présentes dans le code et prévues par l'offre ;
  - paragraphe « V1 en préparation » ;
  - sections Prérequis, Installation, Commandes, Environnements, Builds iOS et pods (reconstruction de `ios/Pods`), Architecture réelle, Traductions et Contribuer.
- **Ménage local** :
  - 7 tags annotés `archive/*` ;
  - 34 branches fusionnées supprimées (`git branch -d`) ;
  - 6 branches non fusionnées supprimées (`git branch -D`), après vérification de leur tag.

Inventaire des tags (créés en local, à pousser) :

| Tag | SHA | Source |
|---|---|---|
| `archive/ai` | `9dc29c1` | `origin/ai` |
| `archive/ia` | `0d1bdc1` | `origin/ia` |
| `archive/create-task-v2` | `86bad5f` | `origin/create-task-v2` |
| `archive/liquid-glass` | `3381e60` | `origin/liquid-glass` |
| `archive/squircle` | `ee097dc` | branche locale `squircle` (commit jamais poussé) |
| `archive/roadmap-v1` | `6efce18` | `origin/roadmap-v1` |
| `archive/roadmap-v2` | `c59af52` | `origin/roadmap-v2` |

Fonctions écartées de la vitrine par prudence :
- **Choix des jours du rappel** : le code n'a qu'un interrupteur « week-end ».
- **Repos neutre dans les statistiques** : `includeRestDays` vaut `true` par défaut.
- **Objectif de l'onboarding** : non vérifié.
- **Période « Global »** : absente de l'offre.

### Commandes pour Yanis

À lancer une fois la branche poussée, dans cet ordre.

1. Pousser les tags d'archive :

```bash
git push origin archive/ai archive/ia archive/create-task-v2 archive/liquid-glass archive/squircle archive/roadmap-v1 archive/roadmap-v2
```

2. Fermer la PR #25 (`roadmap-v2`) :

```bash
gh pr close 25 --comment "Archivée sous le tag archive/roadmap-v2 (P0-05)"
```

3. Supprimer les 35 branches distantes : 29 sont fusionnées dans `origin/master`, les 6 autres sont archivées par un tag. `squircle` n'y figure plus : elle a disparu du dépôt distant entre la préparation et la revue de la PR. Son commit local reste conservé par `archive/squircle`.

```bash
git push origin --delete ai bugs-extermination chore/p0-01-menage chore/p0-02-outillage chore/p0-03-environnements chore/p0-04-dependances-expo chore/workflow-agents codex/ajouter-import-de-donnes codex/ajouter-limite-quotidienne codex/ajouter-toggle-verrouillage-jours codex/bloquer-tches-dans-le-pass codex/corrige-importdata codex/corriger-pastilles-calendrier codex/diagnostiquer-crash-ram codex/diagnostiquer-erreurs-supabase codex/diagnostiquer-reconnexion-app codex/fusionner-stats-et-rglages codex/harmoniser-les-headers-des-crans codex/identifier-les-cas-premiumgratuit codex/migrer-vers-premium-unique codex/planifier-le-verrouillage-premium codex/refondre-les-streaks-des-stats codex/refondre-onboarding codex/remplacer-nativetabs-par-bouton-box codex/vrifier-config-expo create-task-v2 create-task-v3 ia liquid-glass new-daily notifications onboarding-with-dun roadmap-v1 roadmap-v2 task-details-v2
```

4. Nettoyer les références distantes locales :

```bash
git fetch --prune
```

5. Après la fusion de la PR, supprimer la branche d'étape :

```bash
git push origin --delete docs/p0-05-readme-branches && git branch -d docs/p0-05-readme-branches
```

### Constat de fin de phase 0
- **CI verte sur `master`** : run 38753776970, succès, sur `b5c0b03` (fusion de la PR #30).
- **`npm run check`** : sortie 0, sans erreur ni avertissement, sur `docs/p0-05-readme-branches` (3 suites, 10 tests).
- **Critère atteint**, sous réserve que la CI reste verte sur le commit de fusion de cette PR. L'étape ne change que de la documentation.

### Vérification finale
- `npm run check` : sortie 0, aucun avertissement.
- `grep -niE "postinstall|reset-project|expo go|expo-54|v54|0\.81" README.md` : aucun résultat.
- Script de vérification des chemins du README : 29 sur 29 existent.
- `git tag -l 'archive/*'` : 7 tags, SHA conformes.
- `git branch` : `master` et `docs/p0-05-readme-branches` seulement.
- Pas de test sur simulateur : aucune interface ne change.

### Décisions
- **Ménage** : l'agent travaille en local (tags, branches locales) ; Yanis pousse les tags, supprime les branches distantes et ferme la PR #25 (planification).
- **Archives** : les 7 branches non fusionnées sont archivées, `squircle` depuis son commit local (planification).
- **README** : en français, sobre, avec une vitrine qui n'affirme rien d'absent et ne dit pas ce qui est gratuit ou Dun+ (planification).

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | Icône du README différente de l'icône iOS actuelle | corrigé : Yanis a fourni la nouvelle icône (1024×1024), qui remplace `assets/images/icon.png` (tour Yanis 1) |
| R1-2 | Le Markdown est exclu de Prettier | ignoré pour l'instant |
| R1-3 | Ligne prod du tableau des environnements incomplète | corrigé (tour Yanis 1) |

## Pour l'étape suivante
- **Build TestFlight interne de fin de phase 0** : la roadmap le prévoit avant la phase 1. C'est à Yanis de le faire.
- **Réglage GitHub « Automatically delete head branches »** : non activé, à décider par Yanis. Sans lui, les branches d'étape s'accumulent de nouveau.
- **Écarts à l'offre repérés en écrivant la vitrine**, déjà couverts par la roadmap :
  - `lib/calculateStats.ts:41` compte les jours de Repos par défaut (`includeRestDays: true`), alors que l'offre rend le Repos neutre : à traiter en phase 1 (`isRestDay`, statistiques) ;
  - le rappel n'offre qu'un interrupteur « week-end », pas le choix des jours : phase 2 (rappel quotidien local).
- **`app/daily.tsx`** garde un mode simulé désactivé (`useMock`, `lib/dailyMock.ts`), à supprimer lors de la reconstruction du Daily (phase 2).
- **Le README décrit l'architecture actuelle.** À mettre à jour quand `src/` apparaîtra (phase 1).
- **La phase 1 commence par « Dates et journées »** : `dateKey(date, timeZone)` et la suppression de `DAILY_ROLLOVER_HOUR`.

## Revue de la PR #31

Faite à la demande de Yanis, sur `0b518f1`.

| ID | Gravité | Fichier:ligne | Problème | Correction |
|---|---|---|---|---|
| PR-1 | Bloquant | `docs/etapes/P0-05-readme-branches.md:37` | Le lien vers P0-04, recopié tel quel de la roadmap, était cassé : il se résolvait en `docs/etapes/etapes/…`. | Lien rendu relatif au dossier `docs/etapes/`. |
| PR-2 | Bloquant | `docs/etapes/P0-05-readme-branches.md:12` | Le contexte disait `assets/images/icon.png` absente : c'est faux, le fichier existe (voir R1-1). | Mention retirée. |
| PR-3 | Bloquant | « Commandes pour Yanis », point 3 | `squircle` n'existe plus sur le dépôt distant : la commande de suppression aurait signalé une erreur. | Retirée de la liste, qui passe à 35 branches. |
| PR-4 | Non bloquant | PR #31 | Le corps de la PR est vide, alors que le workflow prévoit le fichier d'étape. | `gh pr edit 31 --body-file docs/etapes/P0-05-readme-branches.md`, une fois ce correctif poussé. |

Vérifié et correct :
- **Contenu** : la branche distante est identique à la branche relue (`0b518f1`). Les 3 fichiers attendus sont modifiés : `README.md`, ce fichier et `docs/roadmap.md`.
- **Commit** : message conventionnel, avec le trailer de co-autorat.
- **Diff** : `git diff --check` ne signale rien.
- **CI de la PR** : verte (run 38772668253).
- **État de la PR** : `MERGEABLE`.
- **Liens** : tous les autres liens relatifs de ce fichier existent.
- **Ménage distant, pas encore fait** (attendu à ce stade) :
  - aucun tag `archive/*` sur le dépôt distant ;
  - la PR #25 est ouverte ;
  - 35 branches restent à supprimer.

## Corrections demandées par Yanis — tour 1

La PR #31 a été fusionnée avant ce tour. Ces corrections passent donc par une seconde PR, sur la branche `docs/p0-05-icone-readme` créée depuis `master` (`ef8ae4c`).

Décisions de Yanis sur les problèmes non bloquants :
- R1-1 : corriger, avec la nouvelle icône qu'il a fournie ;
- R1-2 : ignorer pour l'instant ;
- R1-3 : corriger.

| ID | Fichier | Correction | Vérification |
|---|---|---|---|
| R1-1 | `assets/images/icon.png` | Remplacé par la nouvelle icône, la coche (`new_icon.png` renommé, il ne reste aucun `new_icon.png`). Aucun chemin ne change. | `file` : PNG 1024 × 1024. `README.md:2` l'affiche toujours en 72×72. |
| R1-3 | `README.md:82` | Ligne prod : « Release Xcode (Run ou archive), TestFlight, App Store ». | Conforme à `docs/environnements.md:14`. |

Effet de bord, voulu : `app.json:7` (`"icon"` à la racine) pointe aussi sur ce fichier. L'icône par défaut hors iOS devient la coche, au format 1024×1024 recommandé par Expo. iOS ne change pas : il utilise `ios.icon` (`assets/icon.icon`).

Vérification :
- `npm run check` sort en 0 ;
- `prettier --check --ignore-path /dev/null README.md` passe ;
- les chemins du README existent tous.

Nouveau point non bloquant :

| ID | Problème | Recommandation |
|---|---|---|
| Y1-1 | Le nouvel `icon.png` pèse 1,2 Mo (PNG 16 bits, 4,7 Ko avant). | Le compresser lors de la préparation des fiches App Store (phase 5), ou l'ignorer. |

