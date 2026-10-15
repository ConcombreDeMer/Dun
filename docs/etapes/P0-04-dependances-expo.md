# P0-04 — Aligner les dépendances Expo

- **Statut** : terminée
- **Branche** : `chore/p0-04-dependances-expo`
- **Phase** : 0 — Assainir

## Plan validé

### Contexte

P0-03 a découvert que l'app native **plante au lancement** (R2-2) : `ExpoImage` 56.0.9, livré précompilé, appelle un symbole de `ExpoModulesCore` absent de la 56.0.27 installée (`EXC_CRASH SIGABRT`, DYLD « Symbol missing »). Yanis a ajouté une case à la phase 0 pour traiter ce point avant le README et le ménage des branches.

Constats de la planification (15 octobre 2026) :
- `npx expo install --check` signale toujours 11 écarts, identiques à ceux de P0-03 : `expo` 56.0.5 → ~56.0.23, `expo-image` 56.0.9 → ~56.0.13, `expo-router`, `expo-notifications`, `expo-auth-session`, `expo-background-fetch`, `expo-blur`, `expo-calendar`, `expo-splash-screen`, `react-native-screens` 4.25.2 → ~4.26.0, et `@sentry/react-native` 8.16.0 → ~7.11.0.
- `@sentry/react-native` 8 est en service depuis juillet (commit `23cf80a`). Ses dépendances pairs acceptent `expo >= 49` et `react-native >= 0.65`. Utilisé dans `app/_layout.tsx` (`init`, `mobileReplayIntegration`, `wrap`, `setUser`, `setTag`), `metro.config.js` (`getSentryExpoConfig`) et `app.json` (plugin `@sentry/react-native/expo`).
- `ios/` est ignoré par Git : les pods et `Podfile.lock` sont locaux. Le diff de la PR se limite donc à `package.json`, `package-lock.json`, au postinstall et à la doc.
- `expo-modules-core` est désormais installé à la racine (`node_modules/expo-modules-core`), et non plus sous `node_modules/expo/node_modules/`. Le postinstall `scripts/fix-expo-macros-plugin.js` crée pourtant un lien dans ce chemin imbriqué : il recrée un dossier fantôme `node_modules/expo/node_modules/expo-modules-core/node_modules/@expo/`, là où pointaient les anciens pods.
- Le simulateur iPhone 17 Pro (iOS 26.2) est démarré. Il contient l'app Release de la preuve P0-03, construite avec une URL factice et qui plante au lancement.

Décisions de Yanis prises pendant la planification :
- **Sentry** : garder la version 8 et l'exclure de la vérification d'Expo (`expo.install.exclude`).
- **Postinstall** : vérifier s'il est encore nécessaire en suivant la procédure écrite dans son en-tête ; s'il ne l'est plus, le supprimer.

### Périmètre

Case de la roadmap, recopiée mot pour mot :
- [ ] Aligner les dépendances Expo sur le SDK 56 (`npx expo install --check` sans écart, cas de `@sentry/react-native` à trancher), réaligner les pods iOS et vérifier le lancement sur simulateur : l'app native plante au lancement (constaté en [P0-03, R2-2](P0-03-environnements.md)).

S'y ajoute, par décision de Yanis, la vérification du postinstall (case P0-01 « Documenter le correctif `postinstall` ou le supprimer s'il n'est plus nécessaire avec Expo 56 »), qui dépend directement de l'installation des dépendances.

### Hors périmètre

- Mettre à jour d'autres dépendances que les 10 signalées par Expo (pas de montée de Sentry vers 8.30, pas de `npm update` général, pas de correction des avertissements `npm audit`).
- Toute modification du code de `app/`, `lib/`, `components/` : si une montée de version casse une API, on s'arrête et on consulte Yanis.
- Le README et le ménage des branches (étape suivante, P0-05).
- Le plugin `plugins/with-ios-sentry-xcode-env.js` et la configuration Sentry (phase 5).
- Les fichiers `.env*` : ni lus, ni créés, ni modifiés. Metro les charge lui-même au build.

### Modifications

#### Par l'implémenteur

1. **`package.json`, exclusion de Sentry** : ajouter `"install": { "exclude": ["@sentry/react-native"] }` dans le bloc `expo` existant (à côté de `doctor`).
2. **Alignement** : `npx expo install --fix`. Il met à jour les 10 paquets restants dans `package.json` et `package-lock.json`. `react-native-screens` passe de la version exacte `4.25.2` à `~4.26.0`. Relire le diff de `package.json` : seules ces lignes et l'exclusion changent.
3. **Postinstall**, selon la procédure de l'en-tête du script :
   - supprimer le lien et le dossier fantôme `node_modules/expo/node_modules/expo-modules-core` s'ils existent ;
   - retirer temporairement l'entrée `postinstall`, puis faire un build iOS propre (étape 4) ;
   - **si le build et le lancement réussissent sans le lien** : supprimer `scripts/fix-expo-macros-plugin.js` et l'entrée `postinstall` de `package.json` ;
   - **sinon** : rétablir l'entrée, mettre à jour l'en-tête du script avec le constat, et le signaler dans le rapport.
4. **Pods et build** :
   - `cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install` (locale UTF-8 obligatoire pour CocoaPods) ; si `pod install` refuse une version, `pod update` des seuls pods concernés ;
   - désinstaller du simulateur l'ancienne app Release (`xcrun simctl uninstall booted com.dunapp.Dun`) ;
   - build **Debug** sur le simulateur iPhone 17 Pro (`npx expo run:ios --device "iPhone 17 Pro"`), puis vérifier que l'app se lance et affiche son premier écran ;
   - build **Release** sur le même simulateur (`npx expo run:ios --configuration Release --device "iPhone 17 Pro"`), puis vérifier qu'il se lance aussi.
5. **`npm ci`** à partir du `package-lock.json` final, pour reproduire l'installation de la CI, puis `npm run check`.

#### Par l'agent principal

6. `docs/etapes/P0-04-dependances-expo.md` : plan, revues, résultat.
7. `docs/roadmap.md` : case cochée et « État d'avancement ».

### Critères d'acceptation

- **CA1** — `npx expo install --check` ne signale aucun écart (sortie 0).
- **CA2** — `@sentry/react-native` reste en 8.16.0 (`npm ls @sentry/react-native`), et `package.json` contient `expo.install.exclude: ["@sentry/react-native"]`.
- **CA3** — Le diff de `package.json` ne touche que les 10 paquets signalés, l'exclusion de Sentry et, le cas échéant, l'entrée `postinstall`. Aucun autre paquet direct ne change de version.
- **CA4** — `pod install` sort en 0. `ios/Podfile.lock` ne référence plus `node_modules/expo/node_modules/` et indique `ExpoImage` dans la version installée de `expo-image`.
- **CA5** — Le build Debug se lance sur le simulateur, sans crash, et affiche son premier écran. Captures en thème clair et en thème sombre.
- **CA6** — Le build Release se lance aussi sur le simulateur, sans crash. Aucun nouveau rapport `Dun-*.ips` dans `~/Library/Logs/DiagnosticReports/`.
- **CA7** — Postinstall tranché avec une preuve : soit le script et l'entrée sont supprimés, et le build de CA5 a été fait sans le lien ni le dossier fantôme ; soit ils sont gardés, avec l'erreur constatée sans eux consignée dans l'en-tête.
- **CA8** — Aucun fichier de `app/`, `lib/`, `components/`, `plugins/` ni `.env*` n'est modifié (`git diff --name-only master`).
- **CA9** — Après `npm ci`, `npm run check` sort en 0, sans avertissement.

### Vérification

```bash
npx expo install --check
```

```bash
npm ci && npm run check
```

```bash
git diff master -- package.json && git diff --name-only master
```

- Simulateur (agent principal, avec l'outil simulateur) : lancement Debug, capture du premier écran en clair, puis en sombre (`xcrun simctl ui booted appearance dark`), puis lancement Release.
- **À tester par Yanis** : `npm run ios:device-dev` sur son iPhone, puis un parcours rapide (ouvrir l'app, créer une tâche, ouvrir les réglages).

### Questions et risques

- **Sentry** : Expo attend ~7.11.0, le projet est en 8.16.0. **Réponse de Yanis** : garder la 8, exclure de la vérification.
- **Postinstall** : probablement obsolète depuis que `expo-modules-core` est à la racine. **Réponse de Yanis** : vérifier par un build sans le lien, et supprimer s'il est inutile.
- **Le crash peut persister** après l'alignement (autre framework précompilé désaligné). Dans ce cas, l'implémenteur lit le nouveau rapport `.ips`, identifie le symbole et le framework, et s'arrête pour rendre compte, sans contourner (pas de `EXPO_USE_PRECOMPILED_MODULES=false` sans accord de Yanis).
- **Changement d'API** : `expo-router` passe de 56.2.7 à 56.2.21 et `react-native-screens` de 4.25 à 4.26. Ce sont des versions mineures ou correctives, mais si `typecheck` ou le lancement révèlent une rupture, l'implémenteur s'arrête et rend compte : la correction du code est hors périmètre.
- **Premier écran** : selon l'état de la session sur le simulateur, il s'agira de l'onboarding ou de l'accueil. Les deux conviennent pour CA5, tant que l'app ne plante pas et que le rendu est cohérent en clair et en sombre.
- **Nommage** : P0-03 annonçait le README sous l'identifiant P0-04. Il devient P0-05, puisque cette étape a été insérée avant.
- Rien dans l'offre commerciale ne concerne cette étape.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| — | — | — | Aucun problème bloquant. | — |
| R1-1 | Non bloquant | `ios/Pods` (local) | Quand on alterne les builds Debug et Release, les pods précompilés (`React-Core-prebuilt`, `ExpoModulesCore.xcframework`) peuvent garder la variante de l'autre configuration. Résultat : échec de l'édition de liens (`Sealable::Sealable()`) ou crash au lancement (`Props::Props()`). On s'en sort avec `rm -rf ios/Pods && pod install`. | Le documenter dans le README (P0-05). |
| R1-2 | Non bloquant | `lib/ThemeContext.tsx:469` | En thème sombre, l'onboarding garde ses couleurs claires, mais la mascotte passe en blanc. Ce défaut existait avant l'étape. | L'onboarding est reconstruit en phase 2 : y ajouter ce point, ou l'ignorer. |
| R1-3 | Non bloquant | `app.json` (`scheme`) | Avertissement à l'exécution : « Linking found multiple possible URI schemes » (`exp+dun`, `dun`, `com.dunapp.Dun`). Il existait avant l'étape. | À trancher avec la connexion Google (phase 4), qui dépend de ces schémas. |
| R1-4 | Non bloquant | `package-lock.json` | `npm` signale 81 vulnérabilités (`npm audit`) et un conflit de dépendances pairs autour de `test-renderer` / `react-reconciler`. Les deux existaient avant l'étape. | Ajouter une case de traitement (phase 0 ou 5). |

Écarts au plan, constatés par l'implémenteur et acceptés en revue (tout se passe dans des dossiers locaux ignorés par Git) :
- `pod install` refusait d'abord `ExpoImage`. Comme le plan le prévoit, `pod update ExpoImage --no-repo-update`, puis `pod install`.
- **Échec de l'édition de liens en Debug** (`Sealable::Sealable()` absent) : `ios/Pods/React-Core-prebuilt` contenait la variante Release de React, laissée par le build Release de P0-03. Correction : suppression de ce dossier, puis `pod install`.
- **Crash au lancement du Debug** (`Dun-2026-10-15-115013.ips`, `EXC_BAD_ACCESS` dans `facebook::react::Props::Props()`, appelé depuis `ExpoModulesCore`). Le binaire `ExpoModulesCore.xcframework` était la variante Release, sous un marqueur « debug ». Correction : `rm -rf ios/Pods` et DerivedData, puis `pod install`.
  - Ce crash ne vient pas d'un désalignement de versions, donc il ne relevait pas de l'arrêt prévu par le plan, même si l'implémenteur aurait dû rendre compte avant de corriger.
  - `EXPO_USE_PRECOMPILED_MODULES` n'a pas été touché.
- **Écran rouge de Metro** (« Unable to resolve module ../utils/style », dans `expo-router`) : un Metro lancé la veille par Yanis tournait encore sur le port 8081, avec un cache antérieur à la mise à jour.
  - L'implémenteur ne l'a pas arrêté. Il a lancé son propre Metro sur le port 8082 et y a pointé l'app de façon temporaire (`RCT_jsLocation`).
  - Ce réglage a été retiré ensuite (vérifié : la clé n'existe plus dans le simulateur), et le Metro de l'implémenteur est arrêté.

Vérifié et correct (par l'agent principal, sans se fier au rapport) :
- **CA1** : `npx expo install --check` répond « Skipped checking dependencies: @sentry/react-native » puis « Dependencies are up to date », code de sortie 0.
- **CA2** : `npm ls` donne `@sentry/react-native@8.16.0`. `package.json` contient `expo.install.exclude: ["@sentry/react-native"]`.
- **CA3** :
  - `git diff master -- package.json` : les 10 paquets signalés, l'exclusion et le retrait de `postinstall`, rien d'autre ;
  - comparaison des deux `package-lock.json` : en plus de ces 10 paquets (`react-native-screens` résolu en 4.26.2), seules changent des dépendances transitives d'`expo` : `@expo/fingerprint` 0.19.3 → 0.19.10 (et trois sous-dépendances), `@expo/local-build-cache-provider` 56.0.8 → 56.0.12, et un nouveau paquet, `standard-navigation` 0.0.5.
- **CA4** : `ios/Podfile.lock` indique `ExpoImage (56.0.13)` et `ExpoModulesCore (56.0.27)`, ce dernier pris dans `../node_modules/expo-modules-core`. Il contient 0 occurrence de `node_modules/expo/node_modules`.
- **CA5** : la capture Debug en sombre de l'implémenteur montre l'onboarding rendu par Metro, avec le toast LogBox. Pas de nouveau rapport de crash après `Dun-2026-10-15-115013.ips`, qui date de la tentative intermédiaire.
- **CA6** : l'app Release, relancée par l'agent principal avec `simctl launch`, tourne (processus présent dans `launchctl list`). Elle affiche l'onboarding en clair comme en sombre (captures via l'outil simulateur). Aucun nouveau `Dun-*.ips`.
- **CA7** : `scripts/fix-expo-macros-plugin.js` et l'entrée `postinstall` sont supprimés. `node_modules/expo/node_modules/` ne contient plus `expo-modules-core`, et les builds Debug et Release ont été faits sans le lien.
- **CA8** : `git diff --name-only master` ne liste que `package.json`, `package-lock.json` et `scripts/fix-expo-macros-plugin.js`, plus ce fichier d'étape et la roadmap.
- **CA9** : `npm run check` relancé par l'agent principal : sortie 0, 3 suites, 10 tests, aucun avertissement.
- Le simulateur est remis en apparence claire. L'app Release (vraies valeurs de `.env.production`, lues par Expo au build) y reste installée.

## Revue — tour 2 (demande de Yanis)

Yanis a testé la PR sur son iPhone avec `npm run ios:device-dev`. **Régression** : le bouton « + » de la barre d'onglets réagit au toucher, mais n'ouvre plus la modale de création. Un agent lancé par Yanis a trouvé la cause, et l'agent principal l'a vérifiée dans `node_modules`. Ce tour ne compte pas dans la limite des 3 tours de correction. Pour ce tour, le plan est amendé : `app/(tabs)/_layout.tsx` peut changer (CA8 ne vaut plus pour ce fichier).

Cause :
- Le « + » n'est pas un vrai onglet : le trigger `create-task` est `disabled`. L'app captait le toucher en passant son propre `onTabSelectionPrevented` par `unstable_nativeProps` (`app/(tabs)/_layout.tsx:37-41`).
- Dans `expo-router` 56.2.21, `NativeTabsView.ios.js` étale d'abord `...rawHostRestProps` (nos `unstable_nativeProps`), puis pose son propre `onTabSelectionPrevented`. Le gestionnaire de l'app est donc écrasé, et `handlePress` n'est plus jamais appelé.
- `expo-router` relaie maintenant ce toucher sous la forme d'un événement `tabPress`, avec `data.isPrevented: true` (`NativeBottomTabsNavigator.js:110-122`). C'est l'API publique prévue (`listeners` sur `NativeTabs.Trigger`, `types.d.ts`).

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R2-1 | Demande de Yanis (régression) | `app/(tabs)/_layout.tsx:37-41`, `:62` | Le « + » n'ouvre plus la modale de création depuis la montée d'`expo-router` en 56.2.21. | (1) Supprimer `unstable_nativeProps={{ onTabSelectionPrevented: … }}` de `<NativeTabs>`. (2) Sur `<NativeTabs.Trigger name="create-task" disabled role="search">`, ajouter `listeners={{ tabPress: (e) => { if (e.data?.isPrevented) handlePress(); } }}`. Garder `disabled`. Typage strict, sans `any` : si besoin, utiliser les types exportés par `expo-router` (`NativeTabNavigationEventMap` ou équivalent). (3) Ne toucher ni `lib/createModalController.tsx` ni `components/liquidCreateModal.tsx`. (4) `npm run check` passe. |

### Revue des corrections du tour 2

Vérifié et correct (par l'agent principal, sans se fier au rapport) :
- **R2-1 (1) et (2)** : `git diff app/(tabs)/_layout.tsx` (+10 / −6) :
  - `unstable_nativeProps` est retiré de `<NativeTabs>` ;
  - le trigger `create-task` garde `disabled` et `role="search"`, et gagne `listeners.tabPress`, qui appelle `handlePress()` seulement si `e.data?.isPrevented`.
- **Typage** : `listeners` est déclaré sur `NativeTabs.Trigger` (`expo-router/build/native-tabs/types.d.ts:638`), avec `NativeTabNavigationEventMap`. Le type de `e` est déduit, sans `any`.
- **Câblage** : `withLayoutContext.js:33-38` transmet toutes les props du trigger (`...child.props`, donc `listeners`) à l'écran de navigation. `NativeBottomTabsNavigator.js:110-122` émet `tabPress` vers ce trigger, avec `isPrevented: true`, quand le natif bloque l'onglet désactivé.
- **R2-1 (3)** : seul `app/(tabs)/_layout.tsx` change dans le code.
- **R2-1 (4)** : `npm run check` relancé par l'agent principal : sortie 0, 3 suites, 10 tests, aucun avertissement.
- **Build Debug** sur simulateur (implémenteur) : il se lance sur l'onboarding, sans crash, avec le bundle du Metro de l'implémenteur (port 8082).
- **Test fonctionnel** : fait par Yanis sur son iPhone (`npm run ios:device-dev`). Le « + » ouvre de nouveau la modale de création. Sur le simulateur, l'agent principal n'a pas pu atteindre les onglets, car il faut se connecter pour passer l'onboarding.

## Revue de code finale (demande de Yanis)

Revue `code-review` de la PR #30 (effort élevé), après le correctif du tour 2. Aucun problème bloquant.

| ID | Gravité | Fichier:ligne | Problème | Décision de Yanis |
|---|---|---|---|---|
| RC-1 | Non bloquant | `app/(tabs)/_layout.tsx:19` | `handlePress` attend `Haptics.impactAsync` avant `openCreateModal()`, et l'appel du listener n'est ni attendu ni protégé : si l'haptique échoue, la modale ne s'ouvre pas. Le défaut existait avant l'étape. | ajouté à la roadmap (phase 2, case « Création et édition de tâche ») |
| RC-2 | Non bloquant | `app/(tabs)/_layout.tsx:61` | Aucun test automatique ne vérifie que le « + » ouvre la modale : la régression du tour 2 est passée à travers `npm run check` et la CI. | ajouté à la roadmap (phase 2, même case) |
| RC-3 | Non bloquant | `package.json:17` | Un `node_modules` existant garde le dossier créé par l'ancien postinstall après un simple `npm install`. Impact quasi nul : la machine de Yanis est propre, et `npm ci` repart de zéro. | non retenu |
| RC-4 | Non bloquant | `app/(tabs)/_layout.tsx:62` | Le `?.` de `e.data?.isPrevented` est inutile : les types garantissent la présence de `data`. | non retenu |

## Résultat

### Ce qui a été fait
- **Dépendances** : `npx expo install --fix` aligne 10 paquets sur le SDK 56 : `expo` 56.0.23, `expo-image` 56.0.13, `expo-router` 56.2.21, `expo-notifications` 56.0.26, `react-native-screens` ~4.26.0, et d'autres.
- **Sentry** : il reste en 8.16.0 et il est exclu de la vérification d'Expo (`expo.install.exclude` dans `package.json`).
- **Postinstall** : `scripts/fix-expo-macros-plugin.js` est supprimé, avec l'entrée `postinstall`. `expo-modules-core` est installé à la racine de `node_modules` : le lien n'a plus d'objet.
- **Pods** (local, ignoré par Git) : `ios/Pods` est réinstallé à neuf et `Podfile.lock` est réaligné.
- **Crash au lancement** (R2-2 de P0-03) : corrigé. Les builds Debug et Release se lancent sur le simulateur.
- **Régression du bouton « + »** (tour 2) : causée par `expo-router` 56.2.21, corrigée dans `app/(tabs)/_layout.tsx`. Le toucher sur l'onglet désactivé `create-task` passe maintenant par l'événement public `tabPress` (`isPrevented`), et non plus par `unstable_nativeProps`.

### Vérification finale
- `npx expo install --check` : aucun écart, sortie 0.
- `npm ci` puis `npm run check` : sortie 0, aucun avertissement.
- Simulateur iPhone 17 Pro (iOS 26.2) : Debug et Release se lancent sur l'onboarding, en clair et en sombre, sans crash.
- iPhone de Yanis (`npm run ios:device-dev`) : l'app fonctionne, et le « + » ouvre la modale de création après le correctif du tour 2.

### Décisions
- Sentry : garder la version 8 et l'exclure de la vérification d'Expo (Yanis, à la planification).
- Postinstall : vérifier, puis supprimer s'il est inutile (Yanis, à la planification). Il est supprimé.
- Les réinstallations locales des pods faites par l'implémenteur sont acceptées : elles relèvent du réalignement des pods prévu par la case.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | Désynchronisation des pods précompilés entre Debug et Release | ajouté à la roadmap (phase 0, case README) |
| R1-2 | Onboarding en sombre : couleurs claires, mais mascotte blanche | ajouté à la roadmap (phase 2, case onboarding) |
| R1-3 | Avertissement sur les schémas d'URI multiples | ajouté à la roadmap (phase 4, section « Compte et synchronisation ») |
| R1-4 | `npm audit` (81 vulnérabilités) et conflit de dépendances pairs autour de `test-renderer` | ajouté à la roadmap (phase 5) |

## Pour l'étape suivante
- **Metro** : un `npx expo start --clear` lancé le 14 octobre tournait encore sur le port 8081, avec un cache antérieur à la mise à jour. Il produit l'erreur « Unable to resolve module ../utils/style ». Le redémarrer avec `--clear` avant tout build Debug. Un build Release, `npm run ios:device-dev` compris, n'est pas concerné : le bundle est produit pendant le build Xcode, sans passer par le serveur Metro.
- **Debug et Release** : après un changement de configuration, en cas d'échec de l'édition de liens ou de crash natif au lancement, reconstruire `ios/Pods` (`cd ios && rm -rf Pods && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`). À documenter dans le README (R1-1).
- **Sentry** est exclu de `expo install --check`. Lors de la prochaine montée de SDK, revérifier la version attendue par Expo et retirer l'exclusion si elle n'a plus lieu d'être.
- **README (P0-05)** : il ne doit plus mentionner de `postinstall`. Les étapes P0-01 et P0-02 et `docs/audit.md` en parlent encore : ce sont des archives, à laisser telles quelles.
- **Simulateur** : l'app Release installée pointe vers la base prod (`.env.production`). Pour travailler en dev, installer un build Debug.
- **`unstable_nativeProps`** : comme son nom l'indique, cette API n'est pas stable. `expo-router` peut écraser ce qu'on y passe (cause de la régression du tour 2). Préférer les API publiques (`listeners`, options du trigger), et tester le « + » après chaque montée d'`expo-router`.
- **Accès aux onglets sur simulateur** : l'onboarding exige une connexion. Un agent ne peut pas saisir de mot de passe : Yanis doit se connecter lui-même avant un test des onglets. La phase 2 supprimera cette contrainte (onboarding sans compte).
- La phase 0 se termine avec la section « Documentation et Git » (README, ménage des branches), puis le constat du critère de fin de phase.
