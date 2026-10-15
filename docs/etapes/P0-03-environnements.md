# P0-03 — Environnements dev et prod

- **Statut** : terminée
- **Branche** : `chore/p0-03-environnements`
- **Phase** : 0 — Assainir

## Plan validé

### Contexte

P0-02 a posé l'outillage (`npm run check`, CI). Il reste deux sections dans la phase 0 : « Environnements » (cette étape), puis « Documentation et Git » (P0-04 : README, ménage des branches, constat de fin de phase).

Constats faits pendant l'exploration :
- Toute la configuration passe par un seul `.env`. On bascule entre dev et prod en commentant des lignes : la configuration Supabase y apparaît une fois active et deux fois en commentaire, la clé RevenueCat une fois en commentaire. On ne compte que les lignes, les valeurs n'ont pas été lues. `.env.local` ne contient que `SENTRY_AUTH_TOKEN`.
- Variables lues par le code : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`lib/supabase.ts:5-6`), `EXPO_PUBLIC_REVENUECAT_KEY` (`lib/revenuecat.ts:10`), `EXPO_PUBLIC_BETA_PREMIUM` (`lib/subscription.tsx:23`) et `EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS` (`lib/plan.ts:14`). Les deux dernières disparaîtront en phase 3. `SENTRY_AUTH_TOKEN` est lu par la phase de build Xcode (`plugins/with-ios-sentry-xcode-env.js`). Le DSN Sentry est écrit en dur dans `app/_layout.tsx:32`.
- Expo choisit lui-même les fichiers `.env` selon le mode (`@expo/env`, ordre de priorité `.env.<mode>.local` > `.env.local` > `.env.<mode>` > `.env`) :
  - mode `production` pour un build Release (`exportEmbedAsync.js:208`, `runIosAsync.js:106` dans `node_modules/expo/node_modules/@expo/cli`) ;
  - mode `development` pour Metro et les builds Debug.
- `.gitignore` ignore `.env` et `.env*.local`, mais **pas** `.env.development` ni `.env.production` (vérifié avec `git check-ignore`).
- `eas.json` contient deux profils, `preview` et `production`, et Yanis construit avec Xcode. `expo-dev-client` n'est pas installé.
- Les commits `1e20054` et `8ff5dc7` (snapshots Codex) n'ont jamais été poussés (voir « Case 3 » ci-dessous).

Décisions de Yanis prises pendant la planification :
- **Pas d'EAS.** La séparation dev / prod passe par les fichiers `.env.development` et `.env.production` d'Expo, choisis automatiquement selon que le build est Debug ou Release. Les builds restent dans Xcode. `eas.json` est laissé tel quel.
- **Supabase** : les projets dev et prod existent déjà. On réutilise le projet dev existant.
- **Secret Google OAuth** : on ne le régénère pas. La preuve de non-publication est consignée.

### Périmètre

Cases de la roadmap, recopiées mot pour mot (la première dans sa formulation amendée, voir « Amendements de la roadmap ») :
- [ ] Séparer dev et prod avec les fichiers `.env.development` et `.env.production` d'Expo, choisis automatiquement selon le type de build (Debug / Release), au lieu de lignes commentées dans `.env`. Pas d'EAS : les builds se font avec Xcode.
- [ ] Créer deux projets Supabase, dev et prod, et documenter le passage de l'un à l'autre.
- [ ] Vérifier que les commits `1e20054` et `8ff5dc7` n'ont jamais été poussés. Dans le doute, régénérer le secret client Google OAuth.

### Hors périmètre

- Le code de l'app : aucune ligne de `app/`, `lib/` ni `components/` ne change. En particulier :
  - `lib/supabase.ts` garde son repli sur `""` ;
  - le DSN Sentry reste en dur ;
  - l'environnement Sentry relève de la phase 5.
- `eas.json` et `extra.eas.projectId` dans `app.json` : on n'y touche pas. Leur sort pourra être décidé avec le README (P0-04).
- Le README : sa réécriture est l'étape P0-04, qui renverra vers la nouvelle doc.
- La suppression des références locales `refs/codex/snapshots/*` : elle se fera avec le ménage des branches (P0-04).
- Le schéma Supabase et les migrations : la phase 4 les recrée.
- Les fichiers `.env*` réels de Yanis. L'agent ne les lit pas, ne les crée pas et ne les modifie pas.

### Modifications

#### Par l'implémenteur

1. **`.gitignore`** : remplacer les lignes `.env` et `.env*.local` par une règle unique, `.env*`, suivie de l'exception `!.env.example`. Ainsi, `.env.development` et `.env.production` ne peuvent jamais être commités.
2. **`.env.example`** (nouveau, versionné) :
   - toutes les variables `EXPO_PUBLIC_*` lues par le code, avec des valeurs factices explicites (`https://<ref-du-projet>.supabase.co`, etc.) ;
   - un commentaire par variable : son rôle, si elle est publique (copiée en clair dans l'app) ou secrète, et le fichier où la mettre ;
   - une mention de `SENTRY_AUTH_TOKEN`, à placer dans `.env.local`, jamais dans un fichier lu par le bundle ;
   - un rappel que les deux variables Dun+ disparaîtront en phase 3.
3. **`docs/environnements.md`** (nouveau, en français) :
   - **Tableau des environnements** :

     | Environnement | Type de build | Fichier lu | Projet Supabase |
     |---|---|---|---|
     | dev | Metro, `expo run:ios`, Debug Xcode | `.env.development` | dev |
     | prod | Archive Release Xcode, TestFlight, App Store | `.env.production` | prod |

   - **Fonctionnement** : comment Expo remplace `process.env.EXPO_PUBLIC_*` dans le bundle ; seules les variables `EXPO_PUBLIC_` y entrent, et leurs valeurs sont donc lisibles dans l'app.
   - **Ordre de priorité des fichiers**, avec les pièges :
     - `.env.local` a priorité sur `.env.production` : il ne doit contenir aucune variable `EXPO_PUBLIC_*` ;
     - le `.env` de base est lu dans les deux modes, donc on n'y met rien ;
     - après une modification, relancer Metro avec `npx expo start --clear`.
   - **Où vivent les secrets serveur** : le secret Google OAuth se règle dans le tableau de bord Supabase et dans Google Cloud. Il n'a rien à faire dans un `.env` de l'app.
   - **Mise en place sur une machine neuve** : copier `.env.example` vers `.env.development` et vers `.env.production`, puis remplir les valeurs depuis les tableaux de bord.
   - **Migration depuis l'ancien `.env`** (étapes manuelles de Yanis) :
     1. créer `.env.development` et `.env.production` ;
     2. supprimer le `.env` de base ;
     3. ranger le secret Google OAuth dans un gestionnaire de mots de passe.
   - **CLI Supabase** :
     - passer d'un projet à l'autre avec `supabase link --project-ref <ref>` ;
     - vérifier le projet lié avant toute commande distante ;
     - comparer les migrations avec `supabase migration list` ;
     - appliquer avec `supabase db push`, d'abord sur dev ;
     - règle : on ne pousse jamais une migration en prod sans l'avoir appliquée sur dev.
   - **Vérifier quel projet un build utilise** : par exemple, se connecter avec un compte de test, puis regarder dans quel projet il apparaît (*Authentication → Users*).
4. **Règle sur les fichiers d'environnement** : dans `CLAUDE.md` (« Règles absolues ») et dans `.claude/agents/implementeur.md`, la règle sur `.env` et `.env.local` devient « tout fichier `.env*`, sauf `.env.example` » (validé avec le plan).

#### Par l'agent principal (documentation de l'étape)

5. **`docs/roadmap.md`** : amendements validés avec ce plan (voir plus bas), cases cochées, « État d'avancement ».
6. **`docs/etapes/P0-03-environnements.md`** : le plan, la preuve de la case 3 et les revues.

#### Amendements de la roadmap (validés avec le plan)

- **Phase 0, case 1** : l'ancienne formulation, « Ajouter les profils EAS `development`, `preview` et `production`, avec les variables d'environnement EAS au lieu de lignes commentées dans `.env`. », devient « Séparer dev et prod avec les fichiers `.env.development` et `.env.production` d'Expo, choisis automatiquement selon le type de build (Debug / Release), au lieu de lignes commentées dans `.env`. Pas d'EAS : les builds se font avec Xcode. »
- **Phase 5, Sentry** : « releases, sourcemaps envoyées par la phase de build Xcode, environnement `production` / `development` » (au lieu de « par EAS » et `production` / `preview`).

### Case 3 : preuve établie pendant la planification (14 octobre 2026)

- `gh api repos/ConcombreDeMer/Dun/commits/<sha>` → HTTP 422 « No commit found for SHA », pour les deux commits. GitHub sert pourtant tout commit qu'on lui a envoyé, même s'il n'est plus sur aucune branche.
- `git ls-remote origin` : seulement `refs/heads/*`, `refs/pull/*` et `HEAD`. Aucune référence `refs/codex/*`.
- `git for-each-ref --contains` : les deux commits ne sont atteignables que par `refs/codex/snapshots/*`, qui sont locales.
- Le dépôt est public, sans fork.
- `git log --remotes -- '.env*'` ne remonte que `.env.example` (branche `ia`). Ses trois valeurs sont des textes factices (`your_…`).

### Critères d'acceptation

- **CA1** — `git check-ignore` confirme que `.env`, `.env.local`, `.env.development`, `.env.production` et `.env.development.local` sont ignorés, et que `.env.example` ne l'est pas.
- **CA2** — `.env.example` est suivi et liste exactement les variables `EXPO_PUBLIC_*` lues par le code : on compare avec `grep -rhoE "process\.env\.EXPO_PUBLIC_[A-Z_]+" app lib components`. Il mentionne aussi `SENTRY_AUTH_TOKEN` et sa place dans `.env.local`. Il ne contient aucune valeur réelle.
- **CA3** — `docs/environnements.md` couvre chacun de ces points :
  - le tableau des environnements ;
  - le fonctionnement et l'ordre de priorité des fichiers ;
  - les trois pièges ;
  - les secrets serveur ;
  - la mise en place sur une machine neuve ;
  - la migration depuis l'ancien `.env` ;
  - la CLI Supabase ;
  - la vérification du projet utilisé.
- **CA4** — Preuve mécanique de la sélection, faite dans une copie du dépôt au scratchpad :
  - ajouter des fichiers factices `.env.development` (`EXPO_PUBLIC_SUPABASE_URL=https://dev.invalid`) et `.env.production` (`https://prod.invalid`), sans `.env` ni `.env.local` ;
  - lancer `npx expo export:embed --platform ios --dev false …` : le bundle contient `prod.invalid` et pas `dev.invalid` ;
  - lancer la même commande avec `--dev true` : c'est l'inverse.
- **CA5** — Aucun fichier de `app/`, `lib/`, `components/`, `plugins/` ni `scripts/` n'est modifié, et `eas.json` est inchangé.
- **CA6** — `npm run check` sort en 0, sans avertissement.
- **CA7** — `CLAUDE.md` et `.claude/agents/implementeur.md` interdisent de lire, d'afficher ou de copier tout fichier `.env*` sauf `.env.example`.

### Vérification

```bash
npm run check
```

```bash
git check-ignore -v .env .env.local .env.development .env.production .env.development.local; git check-ignore .env.example || echo "non ignoré"
```

- CA4 : export dans une copie au scratchpad, construite avec `git ls-files -co --exclude-standard` et `rsync`, sans aucun `.env*` réel.
- Pas de simulateur côté agent : aucune interface ne change, et l'agent n'a pas les vraies valeurs.
- **À tester par Yanis** après sa migration de `.env` :
  - un build Debug sur simulateur se connecte au projet dev ;
  - un archive Release se connecte au projet prod (par exemple en TestFlight interne, ou avec un build Release local `npx expo run:ios --configuration Release`) ;
  - `supabase migration list` sur le projet dev ne montre aucun écart avec le dépôt.

### Questions et risques

- **Règle absolue de `CLAUDE.md`** : elle interdit d'afficher ou de copier `.env` et `.env.local`. Je propose de l'étendre à « tout fichier `.env*` sauf `.env.example` », dans `CLAUDE.md` et dans `.claude/agents/implementeur.md`. **Réponse** : validé avec le plan (modification 4, CA7).
- **Ordre des gestes** : tant que la nouvelle règle de `.gitignore` n'est pas fusionnée, un `.env.development` créé sur `master` serait suivi par Git. Yanis ne crée ses fichiers qu'une fois sur cette branche, ou après la fusion.
- **RevenueCat** : la même clé Apple fonctionne en Debug et en TestFlight, car les achats y passent par le sandbox Apple. Si la ligne commentée de `.env` est une clé « Test Store », elle va dans `.env.development`. Yanis choisit au moment de la migration ; cela ne change rien au code.
- **Projet dev existant** : son schéma est peut-être en retard sur les migrations du dépôt. Yanis le vérifie avec `supabase migration list` et l'aligne si besoin (`db push` sur dev).
- **Builds Release locaux** : ils lisent `.env.production`, donc un build Release lancé depuis le Mac pointe sur la prod. C'est voulu, et la doc le dit.
- Rien dans l'offre commerciale ne concerne cette étape.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème bloquant. | — |
| R1-1 | Non bloquant | `eas.json`, `app.json` (`extra.eas.projectId`) | EAS n'est plus utilisé, mais sa configuration reste dans le dépôt (hors périmètre, voulu par le plan). | À trancher avec le README (P0-04) : supprimer `eas.json` et `extra.eas.projectId`, ou les garder. |
| R1-2 | Non bloquant | `plugins/with-ios-sentry-xcode-env.js` | La phase d'envoi des symboles Sentry charge `.env.local` puis `.env`. Une fois le `.env` de base supprimé, seul `.env.local` sera lu, ce qui suffit pour `SENTRY_AUTH_TOKEN`. La lecture de `.env` deviendra inutile. | À reprendre en phase 5 (Sentry). |

Vérifié et correct (par l'agent principal) :
- **CA1** : `git check-ignore -v` signale `.env`, `.env.local`, `.env.development`, `.env.production` et `.env.development.local` comme ignorés (`.gitignore:34:.env*`). `.env.example` ne l'est pas. `git ls-files -ci --exclude-standard` est vide : aucun fichier suivi ne devient ignoré.
- **CA2** : la liste des `EXPO_PUBLIC_*` de `.env.example` est identique à celle du code (`diff` vide, 5 variables). `SENTRY_AUTH_TOKEN` est décrit, avec sa place dans `.env.local`. Seules des valeurs factices (`<…>`, `false`).
- **CA3** : `docs/environnements.md` contient les huit rubriques demandées. Il ajoute deux précisions vérifiées dans le code d'Expo : une variable du shell passe avant les fichiers, et les builds Xcode vident le cache Metro.
- **CA4** : dans la copie au scratchpad (seuls `.env.development`, `.env.production` et `.env.example` présents, tous factices), `expo export:embed --dev false` produit un bundle avec `prod.invalid` (1) et sans `dev.invalid` (0). Avec `--dev true`, c'est l'inverse (`dev.invalid` 2, `prod.invalid` 0). Comptes relus par l'agent principal.
- **CA5** : `git diff --name-only master -- app lib components plugins scripts eas.json app.json` est vide.
- **CA6** : `npm run check` relancé par l'agent principal : sortie 0, 5 tests, aucun avertissement.
- **CA7** : la règle est étendue à tout fichier `.env*` sauf `.env.example`, dans `CLAUDE.md` et `.claude/agents/implementeur.md`.
- Aucune interface ne change : pas de contrôle sur simulateur côté agent.

## Revue — tour 2 (demande de Yanis)

Après la remise du travail, Yanis a précisé son usage : pour tester en conditions réelles, il installe un build **Release** sur son iPhone personnel. Avec le plan initial, ce build lit `.env.production` et utilise donc la base prod. Décision de Yanis : ajouter une commande qui fait un build Release sur l'iPhone **avec la base de dev**. Les archives Xcode (TestFlight, App Store) restent en prod. Ce tour ne compte pas dans la limite des 3 tours de correction.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R2-1 | Demande de Yanis | `package.json`, `scripts/`, `docs/environnements.md` | Aucun moyen de faire un build Release sur l'iPhone qui utilise la base de dev. | (1) Script npm `ios:device-dev` : vérifie que `.env.development` existe et s'arrête avec un message clair sinon, exporte ses variables dans l'environnement du processus (une variable du shell passe avant tous les fichiers `.env*`), puis lance `expo run:ios --configuration Release --device`. Le mécanisme est libre : script shell ou Node dans `scripts/`, appelé par `package.json`. Il ne doit ni lire ni afficher les valeurs au-delà de leur export. (2) Preuve que la variable traverse le build Xcode jusqu'au bundle : build Release sur simulateur dans le dépôt réel, avec une variable sonde factice posée dans le shell (par exemple `EXPO_PUBLIC_SUPABASE_URL=https://probe-dev.invalid`). Le `main.jsbundle` de l'app construite contient `probe-dev.invalid`. Aucun fichier `.env*` n'est lu. (3) Preuve, sur des fichiers factices au scratchpad, que l'export des variables par le script donne bien les valeurs de `.env.development`, y compris avec des valeurs entre guillemets. (4) `docs/environnements.md` : une section « Tester un build Release sur l'iPhone avec la base de dev », qui couvre l'usage, le fait que le bouton Run de Xcode et les archives lisent toujours `.env.production`, que `.env.development` doit contenir toutes les variables, et la déconnexion à chaque bascule entre dev et prod (même identifiant d'app). Corriger la phrase « C'est voulu » du tableau en conséquence. (5) `npm run check` passe. |

Pour ce tour, le plan est amendé : `package.json` et `scripts/` peuvent changer (CA5 ne vaut plus pour eux).

### Déroulé
- **Premier essai de la preuve (2)** : `pod install` échoue, parce que les pods locaux (dernier `pod install` le 29 juillet 2026) ne correspondent plus à `node_modules`.
- **Avec l'accord de Yanis**, `pod update` des 16 pods Expo en retard, puis `pod install` (sortie 0). Exemples : `ExpoModulesCore` passe de 56.0.13 à 56.0.27, `EXConstants` de 56.0.16 à 56.0.27, `ExpoFont` de 56.0.5 à 56.0.7. Les sources de `ExpoModulesCore` pointaient vers `node_modules/expo/node_modules/expo-modules-core`, un dossier qui n'existe plus. Seuls des fichiers de `ios/`, ignoré par Git, ont changé.
- **Build Release** sur simulateur (iPhone 17 Pro) avec `EXPO_PUBLIC_SUPABASE_URL=https://probe-dev.invalid` posé dans le shell : « Build Succeeded ».

### Vérifié et correct (par l'agent principal)
- **R2-1 (1)** : `scripts/ios-device-dev.js`
  - il s'arrête avec un message clair si `.env.development` manque ;
  - il charge ce fichier par `process.loadEnvFile`, qui n'écrase pas une variable du shell, puis lance `npx expo run:ios --configuration Release --device` ;
  - il n'affiche aucune valeur.

  `package.json` gagne `ios:device-dev`.
- **R2-1 (2)** : le `main.jsbundle` de l'app construite (DerivedData, `Release-iphonesimulator/Dun.app`) contient `probe-dev.invalid` une fois et `supabase.co` zéro fois. La variable du shell traverse donc le build Xcode jusqu'au bundle et passe avant `.env.production`.
- **R2-1 (3)** : sur des fichiers factices, la commande lancée reçoit exactement les valeurs que donne le parseur d'Expo (guillemets doubles et simples, commentaire en fin de ligne). Une variable du shell reste prioritaire. Le message d'erreur s'affiche si le fichier manque.
- **R2-1 (4)** : la section de `docs/environnements.md` couvre l'usage, le bouton Run de Xcode et les archives, les variables complètes et la déconnexion. La phrase sous le tableau est corrigée.
- **R2-1 (5)** : `npm run check` relancé par l'agent principal : sortie 0, 5 tests, aucun avertissement.
- **Contre-vérification de l'agent principal (15 octobre 2026)**, sans se fier au rapport :
  - bundle Release : `probe-dev.invalid` 1 fois, `supabase.co` 0 fois ;
  - script relancé sur des fichiers factices : il transmet les valeurs de `.env.development` (y compris entre guillemets), une variable du shell reste prioritaire, et il sort en 1 avec un message si le fichier manque ;
  - `npx expo config --type public` après le tour 3 : sortie 0, aucune clé `eas` ni `projectId`.

### Problème découvert, hors périmètre
| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R2-2 | Hors périmètre (étape dédiée, décision de Yanis) | `package.json`, `package-lock.json`, `ios/Pods` | L'app native **plante au lancement** (`EXC_CRASH SIGABRT`, DYLD « Symbol missing »). `ExpoImage` 56.0.9, livré précompilé, appelle un symbole de `ExpoModulesCore` absent de la 56.0.27. Le crash a lieu avant toute exécution de JavaScript ; il n'a rien à voir avec les variables. `npx expo install --check` signale 11 paquets hors des versions attendues par le SDK, dont `expo` (56.0.5 au lieu de ~56.0.23), `expo-image`, `expo-router`, `expo-notifications`, `react-native-screens`, et `@sentry/react-native` (8.16.0, alors qu'il attend ~7.11.0). | Nouvelle étape juste après P0-03 : aligner les dépendances Expo, réaligner les pods, vérifier le lancement sur simulateur. Le cas de Sentry est à trancher dans son plan. |


## Revue — tour 3 (demande de Yanis)

Décisions de Yanis sur les problèmes non bloquants : R1-1 est supprimé dans cette étape, R1-2 est ajouté à la ligne Sentry de la phase 5. Ce tour ne compte pas dans la limite des 3 tours de correction.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Demande de Yanis | `eas.json`, `app.json` | La configuration EAS reste alors qu'EAS n'est plus utilisé. | Supprimer `eas.json` et la clé `expo.extra.eas` d'`app.json`. Garder `expo.extra.router`, `owner` et tout le reste. Le code ne lit pas `projectId` : aucun appel à `getExpoPushTokenAsync` ni à `expoConfig`, ce qui reste à revérifier. `npx expo config --type public` doit réussir, et `npm run check` doit passer. |

Vérifié et correct (par l'agent principal) :
- `eas.json` est supprimé.
- Dans `app.json`, seul le bloc `extra.eas` est retiré : `extra.router` et `owner` sont inchangés.
- Aucun code ne lit `projectId`, `extra.eas`, `expoConfig` ni `getExpoPushTokenAsync`.
- `npx expo config --type public` sort en 0, sans clé `eas`.
- `npm run check` relancé par l'agent principal : sortie 0, aucun avertissement.

## Revue — tour 4 (revue de code demandée par Yanis)

Yanis a demandé une revue `code-review` du diff complet (effort élevé). Elle relève 5 points. Aucun ne casse quoi que ce soit aujourd'hui, mais les deux premiers montrent que la séparation entre dev et prod repose sur une discipline, pas sur un mécanisme. Décision de Yanis : les corriger tous les 5 dans cette étape. R1-2, que Yanis avait reporté en phase 5, est donc traité ici (point R4-1). Ce tour ne compte pas dans la limite des 3 tours de correction.

Constat vérifié par l'agent principal :
- La phase « Bundle React Native code and images » source `ios/.xcode.env.local` (`ios/Dun.xcodeproj/project.pbxproj:253`).
- Le plugin `plugins/with-ios-sentry-xcode-env.js` y écrit `set -a`, puis `source ../.env.local` et `source ../.env`.
- Conséquence : dans un build Xcode, toute variable de ces deux fichiers devient une variable du shell. Elle passe alors avant `.env.production` et réassigne les valeurs exportées par `ios:device-dev`.
- La preuve CA4 appelait `expo export:embed` directement, sans passer par cette phase, et ne pouvait donc pas le voir.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R4-1 | Demande de Yanis | `plugins/with-ios-sentry-xcode-env.js:22`, `ios/.xcode.env.local` (local) | Le plugin exporte des fichiers `.env*` entiers (`.env.local` et `.env`) dans les phases Xcode, alors qu'il n'a besoin que de `SENTRY_AUTH_TOKEN`. | (a) Le bloc écrit dans `.xcode.env.local` n'exporte plus que `SENTRY_AUTH_TOKEN`, extrait de `.env.local`. Il gère les guillemets simples et doubles, et ignore les lignes commentées. Il ne lit plus `.env` et n'affiche jamais la valeur. (b) Le bloc est délimité par des marqueurs. Le plugin remplace un bloc existant, y compris l'ancien bloc `set -a … set +a`, au lieu d'en ajouter un : appliqué deux fois, il donne le même fichier. (c) Cette logique est une fonction pure exportée, testée avec Jest : ancien bloc remplacé, idempotence, fichier vide, autres lignes conservées (par exemple `NODE_BINARY`). (d) Appliquer le nouveau bloc au fichier local `ios/.xcode.env.local` de Yanis (ignoré par Git), avec cette même fonction, sans lancer `expo prebuild`. (e) Preuve shell : dans un dossier temporaire, avec un `.env.local` factice (`SENTRY_AUTH_TOKEN="faux"` et `EXPO_PUBLIC_SUPABASE_URL=https://local.invalid`) et un `.env` factice (`EXPO_PUBLIC_SUPABASE_URL=https://base.invalid`), sourcer le bloc avec `PROJECT_DIR` pointé sur ce dossier. Seul `SENTRY_AUTH_TOKEN` est exporté, avec la bonne valeur, et `EXPO_PUBLIC_SUPABASE_URL` reste vide. |
| R4-2 | Demande de Yanis | `docs/environnements.md:27-43` | Pour les builds Xcode, l'ordre de priorité décrit était faux. | Après R4-1, décrire l'état réel : la phase de build Xcode n'exporte que `SENTRY_AUTH_TOKEN`, et rien d'autre de `.env.local` ni de `.env`. Garder les pièges, en les mettant en cohérence. Mentionner que le plugin Sentry réécrit ce bloc à chaque prebuild. |
| R4-3 | Demande de Yanis | `scripts/ios-device-dev.js:27` | Une `EXPO_PUBLIC_*` déjà présente dans le shell l'emporte sans bruit sur `.env.development`. | Le script **impose** les valeurs de `.env.development` : il les assigne en écrasant celles du shell. Il affiche les **noms** des variables écrasées, jamais leurs valeurs. |
| R4-4 | Demande de Yanis | `scripts/ios-device-dev.js:18` | Une variable absente de `.env.development` est prise sans bruit dans `.env.production`. | Comparer les **noms** des variables `EXPO_PUBLIC_*` de `.env.example` avec ceux de `.env.development`. Si une variable manque, s'arrêter (sortie 1) en listant les noms manquants. Ne jamais afficher de valeur. |
| R4-5 | Demande de Yanis | `scripts/ios-device-dev.js:27` | Le parseur de Node diffère de celui d'Expo (expansion `${VAR}`). | Lire `.env.development` avec le parseur d'Expo (`@expo/env`, résolu depuis le paquet `expo`, sans ajouter de dépendance), sans laisser l'environnement du shell influencer l'expansion. Preuve sur fichiers factices : les valeurs transmises au faux `npx` sont identiques à celles que donne Expo, expansion `${VAR}` comprise. |

Contraintes du tour :
- aucun fichier `.env*` réel lu, créé ou modifié ;
- les preuves se font sur des fichiers factices, dans un dossier temporaire ;
- `npm run check` doit passer, sans avertissement.

### Revue des corrections du tour 4

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R4-6 | Bloquant | `.env.example:27-28` | Le commentaire dit que les deux variables Dun+ sont à mettre « si besoin » et que, absentes, elles valent `false`. Or `ios:device-dev` exige désormais toutes les variables de `.env.example` dans `.env.development`. Le modèle contredit donc le script et la doc (`docs/environnements.md:79`). | Le commentaire indique de mettre les deux variables dans les deux fichiers, à `false` par défaut, et précise que `npm run ios:device-dev` refuse de lancer le build s'il en manque une. |

Vérifié et correct (par l'agent principal, sans se fier au rapport) :
- **R4-1** :
  - `plugins/with-ios-sentry-xcode-env.js` écrit dans `.xcode.env.local` un bloc POSIX délimité par des marqueurs, qui n'exporte que `SENTRY_AUTH_TOKEN` ;
  - la fonction pure `applySentryAuthTokenBlock` remplace l'ancien bloc `set -a` et elle est idempotente ; elle est testée dans `plugins/with-ios-sentry-xcode-env.test.js` (5 tests) ;
  - `ios/.xcode.env.local` (local) contient le nouveau bloc ;
  - preuve refaite par l'agent principal : avec un `.env.local` factice (jeton et `EXPO_PUBLIC_SUPABASE_URL`) et un `.env` factice, sourcer ce fichier sous `/bin/sh` donne `SENTRY_AUTH_TOKEN=faux`, exporté, et une `EXPO_PUBLIC_SUPABASE_URL` vide.
- **R4-2** : `docs/environnements.md` contient la sous-section « Dans un build Xcode », et les pièges sont mis en cohérence.
- **R4-3, R4-4 et R4-5** : `scripts/ios-device-dev.js` lit avec `parseEnvFiles` d'Expo (`systemEnv: {}`), vérifie les noms par rapport à `.env.example` et impose les valeurs. Preuve refaite par l'agent principal :
  - avec `EXPO_PUBLIC_SUPABASE_URL=https://prod.invalid` dans le shell, le build reçoit `https://dev.invalid`, et le nom de la variable remplacée est affiché ;
  - sans `EXPO_PUBLIC_REVENUECAT_KEY` dans `.env.development`, le script sort en 1 et liste ce nom.
- **R4-6** : le commentaire de `.env.example` dit maintenant que les variables Dun+ sont requises dans les deux fichiers, à `false` par défaut. La liste des noms n'a pas changé.
- `npm run check` relancé par l'agent principal : sortie 0, 3 suites, 10 tests, aucun avertissement.

## Résultat

### Ce qui a été fait
- **`.gitignore`** : une seule règle, `.env*`, avec l'exception `!.env.example`.
- **`.env.example`** (nouveau) : modèle des 5 variables `EXPO_PUBLIC_*`, avec leur rôle et le fichier où les mettre. Il décrit aussi la place de `SENTRY_AUTH_TOKEN`.
- **`docs/environnements.md`** (nouveau) : les environnements dev et prod, le choix automatique du fichier par Expo selon le type de build, l'ordre de priorité des fichiers et ses pièges, les secrets serveur, la mise en place, la migration depuis l'ancien `.env`, la CLI Supabase et la vérification du projet utilisé.
- **Règle `.env*`** étendue dans `CLAUDE.md` et `.claude/agents/implementeur.md`.
- **Build Release sur l'iPhone avec la base de dev** (tour 2) : `npm run ios:device-dev` (`scripts/ios-device-dev.js`) et sa section dans `docs/environnements.md`.
- **Phases Xcode** (tour 4) : le plugin Sentry n'exporte plus que `SENTRY_AUTH_TOKEN` (avant, il exportait `.env.local` et `.env` entiers). Il est testé.
- **`ios:device-dev` durci** (tour 4) : parseur d'Expo, valeurs de dev imposées, arrêt si une variable manque.
- **Configuration EAS supprimée** (tour 3) : `eas.json` et `extra.eas` d'`app.json`.
- **Case 3** : la preuve de non-publication des commits `1e20054` et `8ff5dc7` est consignée plus haut.

### Vérification finale
- `npm run check` : sortie 0, aucun avertissement, 5 tests.
- Sélection des fichiers prouvée par deux exports du bundle (CA4).
- Dépassement par une variable du shell prouvé sur un vrai build Release Xcode (R2-1 (2)).
- Phases Xcode limitées à `SENTRY_AUTH_TOKEN`, prouvé sur fichiers factices et par 5 tests Jest (R4-1).
- Yanis a migré son `.env` : `.env.development` et `.env.production` remplis, ancien `.env` supprimé, `.env.local` réduit à `SENTRY_AUTH_TOKEN`. Il a vérifié qu'un build de dev utilise bien la base de dev.
- **Limite** : l'app native plante au lancement (R2-2). Tant que les dépendances Expo ne sont pas alignées, ni `npm run ios:device-dev` ni un build Xcode ne produisent d'app utilisable.
- Restent à faire par Yanis, avec ses vraies valeurs : la migration de son `.env`, puis le contrôle Debug → dev et Release → prod, et `supabase migration list` sur dev.

### Décisions
- Pas d'EAS : séparation par les fichiers `.env.<mode>` d'Expo, builds avec Xcode (Yanis, à la planification).
- Projets Supabase dev et prod : ils existaient déjà, le projet dev existant est réutilisé (Yanis).
- Secret Google OAuth : pas de régénération, les commits n'ont jamais été poussés (Yanis). Vérification ultérieure : la variable « secret » ne contenait que l'identifiant public du client Web.
- Roadmap amendée : case 1 de la section « Environnements » (EAS remplacé par les fichiers `.env` d'Expo) et ligne Sentry de la phase 5 (sourcemaps par la phase de build Xcode, environnements `production` / `development`).
- Règle des fichiers d'environnement étendue à tout `.env*` sauf `.env.example`.
- Build Release sur l'iPhone : `npm run ios:device-dev` utilise la base de dev ; le bouton Run de Xcode et les archives restent en prod (Yanis, tour 2).
- Pods iOS réalignés en local sur `node_modules` (Yanis, tour 2).
- Configuration EAS supprimée (`eas.json`, `extra.eas.projectId`), et R1-2 reporté sur la ligne Sentry de la phase 5 (Yanis, tour 3).
- Les 5 points de la revue de code sont corrigés dans cette étape, R1-2 compris : il était reporté en phase 5 et il est finalement traité ici (Yanis, tour 4).
- Désalignement des dépendances Expo traité dans une étape dédiée, ajoutée à la phase 0 (Yanis, tour 2).

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | `eas.json` et `extra.eas.projectId` restent alors qu'EAS n'est plus utilisé | supprimer (corrigé au tour 3) |
| R1-2 | Le plugin Sentry lit encore `.env`, inutile une fois ce fichier supprimé | d'abord reporté en phase 5, puis corrigé au tour 4 (R4-1) |
| R2-2 | Dépendances Expo désalignées, app native qui plante au lancement | étape dédiée, juste après P0-03 (case ajoutée à la phase 0) |

## Pour l'étape suivante
- **Priorité : l'app native ne se lance plus (R2-2).** Diagnostic du 14 octobre 2026 :
  - Reproduction : `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --configuration Release --device <simulateur>`. Le build réussit, puis l'app plante au lancement : `simctl openurl` sort en 60.
  - Rapport de crash : `~/Library/Logs/DiagnosticReports/Dun-2026-10-14-190741.ips` sur la machine de Yanis. Type `EXC_CRASH (SIGABRT)`, raison DYLD « Symbol missing », « terminated at launch ».
  - Symbole manquant : `_$s15ExpoModulesCore9AnyModulePAAE18_exposedDefinitionSayAA0dG0_pGyF`. Il est appelé par `Dun.app/Frameworks/ExpoImage.framework/ExpoImage` et attendu dans `ExpoModulesCore.framework`.
  - Cause probable : `expo-image` 56.0.9 est livré précompilé (« [Expo-precompiled] » dans la sortie de CocoaPods) contre une version de `expo-modules-core` plus ancienne que la 56.0.27 installée. `expo` est en 56.0.5 et tire `expo-modules-core` 56.0.27 (`npm ls expo-modules-core`).
  - Hypothèse non vérifiée : le build Debug plante de la même façon, puisqu'il embarque les mêmes frameworks.
  - Sortie de `npx expo install --check` au 14 octobre 2026 (version installée → version attendue) :
    - `@sentry/react-native` 8.16.0 → ~7.11.0 ;
    - `expo` 56.0.5 → ~56.0.23 ;
    - `expo-auth-session` 56.0.12 → ~56.0.19 ;
    - `expo-background-fetch` 56.0.15 → ~56.0.27 ;
    - `expo-blur` 56.0.3 → ~56.0.4 ;
    - `expo-calendar` 56.0.8 → ~56.0.10 ;
    - `expo-image` 56.0.9 → ~56.0.13 ;
    - `expo-notifications` 56.0.14 → ~56.0.26 ;
    - `expo-router` 56.2.7 → ~56.2.21 ;
    - `expo-splash-screen` 56.0.10 → ~56.0.15 ;
    - `react-native-screens` 4.25.2 → ~4.26.0.
  - État des pods : les 16 pods Expo locaux ont été mis à jour pendant P0-03 (`pod update … --no-repo-update`). `ios/Podfile.lock` est à jour avec `node_modules`, mais il faudra le réaligner après le changement de dépendances.
  - `npx expo install --check` liste 11 paquets à aligner.
  - Attention à `@sentry/react-native` : `--fix` le ferait redescendre de la version 8 à la 7. À trancher avec Yanis, plutôt que de lancer `--fix` à l'aveugle.
  - Après l'alignement : `cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`. CocoaPods exige une locale UTF-8, que le shell des agents n'a pas par défaut.
  - Vérifier ensuite le lancement Debug et Release sur simulateur, en clair et en sombre.
  - Une copie de l'ancien `ios/Podfile.lock` (29 juillet) a été gardée dans le scratchpad de la session P0-03, mais elle ne sert pas : elle pointe vers un dossier de `node_modules` qui n'existe plus.
- **Simulateur** : l'iPhone 17 Pro contient l'app Release de la preuve R2-1 (2), construite avec une URL factice, et qui plante au lancement. La remplacer par un build Debug une fois les dépendances alignées.
- **`npm run ios:device-dev`** : il charge `.env.development` par `process.loadEnvFile` de Node, qui ne gère pas l'expansion `${VAR}` acceptée par Expo. Sans effet aujourd'hui.
- **Variables d'environnement** : `.env.development` (Debug, Metro) et `.env.production` (Release) ; modèle dans `.env.example`, explications dans `docs/environnements.md`. Toute nouvelle variable `EXPO_PUBLIC_*` doit être ajoutée à `.env.example`.
- **Règle** : ne jamais lire un fichier `.env*` sauf `.env.example`. Pour connaître les variables, lire le code ou `.env.example`.
- **README** : renvoyer vers `docs/environnements.md` au lieu de recopier son contenu, et ne plus mentionner EAS (supprimé en P0-03). Retirer aussi la section « Configuration produit » (`EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS`), qui sera périmée en phase 3.
- **Ménage des branches (section « Documentation et Git »)** : supprimer les références locales `refs/codex/snapshots/*` (`git for-each-ref --format='%(refname)' refs/codex | xargs -n1 git update-ref -d`), qui contiennent encore une copie de l'ancien `.env`.
- **Phase 4** : la CLI Supabase n'est reliée qu'à un projet à la fois. Toujours vérifier le projet lié avant un `db push`.
- **Connexion Google (phase 4)** :
  - Le module `@react-native-google-signin/google-signin` est installé et configuré dans `app.json` (`iosClientId`, `iosUrlScheme`), mais aucun code ne l'appelle.
  - Les variables `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` et `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` de l'ancien `.env` n'ont jamais été lues par le code. Elles ne sont donc ni dans `.env.example` ni dans les nouveaux fichiers.
  - Quand la connexion Google sera codée :
    - ajouter l'identifiant du client Web à `.env.example` ;
    - pour tester sur le projet dev, configurer le fournisseur Google de ce projet et ajouter son adresse de retour dans Google Cloud.
  - La variable `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` de l'ancien `.env` contenait en fait l'identifiant public du client Web (`….apps.googleusercontent.com`, même valeur que `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`, vérifié par Yanis). Les snapshots Codex `1e20054` et `8ff5dc7` ne contenaient donc aucun vrai secret.
  - Yanis ne trouve aucun vrai secret (préfixe `GOCSPX-`) dans ses fichiers. Si la phase 4 en a besoin pour le fournisseur Google de Supabase, en créer un nouveau sur le client Web dans Google Cloud Console : un secret existant n'y est pas forcément réaffichable.
