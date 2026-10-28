# P2-02 — Aligner les dépendances Expo sur les correctifs du SDK 56

- **Statut** : terminée
- **Branche** : `chore/p2-02-dependances-expo`
- **Phase** : 2 — Données locales, app sans compte

## Plan validé

Plan validé par Yanis le 27 octobre 2026.

### Contexte
- P2-01 est fusionnée (PR #44). Sa revue a relevé (R1-5) que `npx expo install --check` signale 6 correctifs publiés pour des paquets que l'étape ne touchait pas. Yanis a ajouté une case `chore` à part dans la section « Base locale ».
- Yanis a choisi (27 octobre 2026) de traiter ce chore **avant** les repositories : ceux-ci deviennent P2-03.
- Constat du 27 octobre 2026, identique à celui de P2-01 :
  - `expo` 56.0.23 → ~56.0.24
  - `expo-auth-session` 56.0.19 → ~56.0.20
  - `expo-linking` 56.0.18 → ~56.0.19 (`package.json` déclare encore `~56.0.12`)
  - `expo-router` 56.2.21 → ~56.2.22
  - `expo-splash-screen` 56.0.15 → ~56.0.16
  - `jest-expo` 56.0.5 → ~56.0.6
  - `@sentry/react-native` reste exclu (`expo.install.exclude`, décision de P0-04).
- `expo`, `expo-linking`, `expo-router` et `expo-splash-screen` ont du code natif (`ios/`) : il faut faire `pod install` et reconstruire l'app.
- Précédent : en P0-04, une montée d'`expo-router` a cassé le bouton « + » (R2-1), et aucun test ne l'a vu. Ce test automatique est toujours absent : il est prévu par la case « Création et édition de tâche ».

### Périmètre
La case de la roadmap, recopiée mot pour mot :
- [ ] Aligner les dépendances Expo sur les derniers correctifs du SDK 56 (`npx expo install --check` sans écart), dans une étape `chore` à part : `expo`, `expo-auth-session`, `expo-linking`, `expo-router`, `expo-splash-screen` et `jest-expo` étaient en retard au 26 octobre 2026 (constaté en [P2-01, R1-5](P2-01-schema-local.md)).

### Hors périmètre
- Toute autre dépendance : pas de `npm update` général, pas de montée de Sentry, pas de traitement de `npm audit` (prévu en phase 5).
- Tout code de `app/`, `lib/`, `components/`, `src/` ou `plugins/`. Si une montée de version casse une API ou un comportement, l'implémenteur s'arrête et rend compte.
- Le test Jest du « + » (case « Création et édition de tâche »).
- `app.json` : s'il est modifié automatiquement par `npx expo install`, le remettre dans son état d'origine (même règle qu'en P2-01).
- Les fichiers `.env*` : ni lus, ni créés, ni modifiés.

### Modifications

#### Par l'implémenteur
1. **Alignement** : `npx expo install --fix`. Seuls `package.json` (les 6 lignes signalées) et `package-lock.json` changent.
2. **Relecture du lockfile** : comparer `package-lock.json` avec `master` par script (paquets ajoutés, retirés, versions changées). Seuls les 6 paquets et leurs dépendances transitives Expo doivent bouger.
3. **Pods et build** :
   - `cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install` ; en cas d'échec de l'édition de liens ou de crash natif, suivre le README (`rm -rf ios/Pods && pod install`) ;
   - redémarrer Metro avec `--clear` ;
   - build Debug sur le simulateur iPhone 17 Pro, puis lancement et premier écran.
4. **`npm ci`** à partir du lockfile final, puis `npm run check`.
5. **`expo-router`** : lire le changelog et le diff de `NativeTabsView` et `NativeBottomTabsNavigator` entre 56.2.21 et 56.2.22. Signaler tout changement autour de `tabPress` et `isPrevented`.

#### Par l'agent principal
6. Ce fichier d'étape : plan, revues, résultat.
7. `docs/roadmap.md` : cocher la case et mettre à jour « État d'avancement », avec P2-03 (repositories) comme prochaine étape.

### Critères d'acceptation
- **CA1** : `npx expo install --check` ne signale aucun écart et sort en 0. Sentry est toujours exclu.
- **CA2** : `git diff master -- package.json` ne touche que les 6 paquets signalés.
- **CA3** : dans `package-lock.json`, aucun paquet direct hors des 6 ne change de version. Les changements transitifs sont listés dans le rapport.
- **CA4** : `pod install` sort en 0, et le build Debug se lance sur le simulateur sans crash. Il affiche son premier écran en clair et en sombre, sans nouveau rapport `Dun-*.ips`.
- **CA5** : la base locale de P2-01 fonctionne toujours. Il n'y a pas d'écran d'erreur, et `dun.db` contient les 8 tables avec une seule ligne dans `__drizzle_migrations`.
- **CA6** : après `npm ci`, `npm run check` sort en 0. Le seul message attendu est l'`ExperimentalWarning` de `node:sqlite`, toléré depuis P2-01 (R1-2), et `src/domain` reste à 100 %.
- **CA7** : `git diff --name-only master` ne liste que `package.json`, `package-lock.json`, ce fichier d'étape et la roadmap.

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

- **Simulateur** (agent principal) : lancement Debug en clair, puis en sombre ; ensuite, `sqlite3 "$(xcrun simctl get_app_container booted com.dunapp.Dun data)/Documents/SQLite/dun.db" ".tables"`.
- **À tester par Yanis** : l'agent ne peut pas dépasser l'onboarding, qui exige une connexion. Avant de commiter, Yanis lance `npm run ios:device-dev` (ou le simulateur connecté), vérifie que le « + » ouvre la modale de création (régression de P0-04 après une montée d'`expo-router`), puis navigue entre les onglets.

### Questions et risques
- **Ordre des étapes** : tranché par Yanis, le chore Expo passe d'abord et les repositories deviennent P2-03.
- **Régression d'`expo-router`** : c'est une version corrective (56.2.21 → 56.2.22), mais le précédent de P0-04 impose de tester le « + » à la main (point 5 des modifications).
- **Pods** : il faut peut-être les reconstruire (`Sealable::Sealable()`, cas décrit dans le README). Les dossiers concernés sont ignorés par Git.
- **Node** : la machine tourne en Node 25.2.1, alors que `.nvmrc` et la CI sont en 24. `npm ci` et `npm run check` passeront sous Node 25 en local ; la CI confirmera sous Node 24. Ce n'est pas bloquant.
- **Build** (rappel de P2-01) : `expo run:ios` relance `pod install`, qui échoue sans `LANG=en_US.UTF-8`. Utiliser `--no-install` après un `pod install` manuel, ou exporter `LANG` et `LC_ALL`.
- Rien dans l'offre commerciale ne concerne cette étape.

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Non bloquant | `lib/ThemeContext.tsx:469` | CA4 n'est vérifié qu'en partie pour le sombre. Sans session, le premier écran est l'onboarding, et `ThemeContext` y force les couleurs claires (comportement existant, déjà relevé en P0-04, R1-2 et P2-01, R1-6). La capture en sombre est donc identique à la capture en clair. | Rien à corriger dans l'étape. Le rendu sombre au-delà de l'onboarding est couvert par le test de Yanis, connecté. |

Vérifié et correct (par l'agent principal, sans se fier au rapport) :
- **CA1** : `npx expo install --check` répond « Skipped checking dependencies: @sentry/react-native » puis « Dependencies are up to date », code de sortie 0.
- **CA2** : `git diff master -- package.json` ne change que 6 lignes : `expo` ~56.0.24, `expo-auth-session` ~56.0.20, `expo-linking` ~56.0.19, `expo-router` ~56.2.22, `expo-splash-screen` ~56.0.16, `jest-expo` ~56.0.6.
- **CA3** : comparaison par script des `packages` des deux `package-lock.json`.
  - Les seuls paquets directs qui changent sont les 6 ci-dessus.
  - Côté transitif, des paquets `@expo/*` passent en version corrective : `config`, `config-plugins`, `metro-config`, `prebuild-config`, `cli`, `router-server`, etc. `babel-preset-expo` et `expo-modules-autolinking` aussi.
  - Quatre paquets hors `@expo` changent, tous tirés par ces paquets `@expo/*` : `node-forge` 1.4.0 → 1.4.2, `plist` 3.1.0 → 3.1.1, `postcss` 8.5.29 → 8.5.32 et `xcode` 3.0.1 → 4.0.0. `xcode` change de version majeure, exigée par `@expo/config-plugins` 56.0.17 (`^4.0.0`). Il ne sert qu'au prebuild, pas à l'app.
  - `@xmldom/xmldom` 0.9.12 est ajouté sous `plist`. `uuid` 7.0.3, qui venait de `xcode` 3, est retiré.
- **CA4** (le sombre en partie, voir R1-1) :
  - l'implémenteur a lancé `pod install` (sortie 0) et le build Debug (« Build Succeeded », 0 erreur) ;
  - l'agent principal a relancé l'app avec Metro : bundle de 3092 modules, onboarding affiché en clair puis en sombre, sans crash ;
  - aucun `Dun-*.ips` dans `~/Library/Logs/DiagnosticReports`.
  - Le seul avertissement de Metro porte sur les schémas d'URI multiples, connu depuis P0-04 (R1-3).
- **CA5** : pas d'écran d'erreur. `dun.db` contient les 8 tables et `__drizzle_migrations`, qui garde 1 seule ligne après la relance.
- **CA6** : `npm run check` relancé par l'agent principal : sortie 0, 19 suites, 331 tests, `src/domain` à 100 % sur les 4 mesures. Le seul message est l'`ExperimentalWarning` de `node:sqlite`. L'implémenteur a fait `npm ci` sur le lockfile final avant son propre `check`.
- **CA7** : `git status --short` liste `package.json`, `package-lock.json` et ce fichier ; la roadmap s'y ajoute avec la documentation. `app.json` est inchangé.
- **`expo-router` 56.2.21 → 56.2.22** : l'implémenteur a comparé les deux archives npm. `NativeTabsView.*` et `NativeBottomTabsNavigator.*` sont identiques : rien ne change autour de `tabPress` ni `isPrevented`. La seule correction porte sur l'extension de plateforme dans les noms de route (expo/expo#49035), et aucun fichier de `app/` n'a plusieurs points dans son nom.
- Le simulateur est remis en apparence claire, et le Metro de la revue est arrêté.

Aucun problème bloquant : pas de tour de correction.

## Retour de Yanis : splash infini sur iPhone (28 octobre 2026)

Avec `npm run ios:device-dev`, l'app reste bloquée sur le splash. Diagnostic de l'agent principal :
- **Ce n'est pas P2-02.** Les paquets montés ne changent rien au code natif iOS, et la seule modification de compilation (`babel-preset-expo`) ne concerne que Jest. Un build Release de `master` (sans P2-02), installé sur le même iPhone, bloque de la même façon.
- **Ce n'est pas la base locale.** Sur le simulateur, sans session, le build Release s'ouvre normalement. Le SQL des migrations est bien intégré au bundle de production.
- **Cause** : un build Debug de `master` sur l'iPhone, relié à Metro, journalise en boucle `AuthRetryableFetchError: fetch failed: A server with the specified hostname could not be found` (`@supabase/auth-js`). Le nom d'hôte du projet Supabase de dev (`.env.development`) ne se résout pas. Avec une session enregistrée, `supabase.auth.getSession()` tente de rafraîchir le jeton et réessaie sans fin. `isAuthLoading` reste vrai, et `app/_layout.tsx` ne masque jamais le splash.
- Sur le simulateur, il n'y a pas de session : `getSession()` ne fait aucun appel réseau, d'où l'absence de blocage.
- **Résolution** : Yanis a réactivé le projet Supabase de dev, qui était en pause. Avec `npm run ios:device-dev`, l'app fonctionne sur son iPhone (28 octobre 2026).
- **Fragilité existante**, antérieure à P2-02 : le splash dépend d'un appel réseau sans délai maximal. La case de phase 2 « Supprimer … `AuthSessionContext` et les appels `supabase` dans `app/` » la fera disparaître.

## Résultat

### Ce qui a été fait
- `npx expo install --fix` aligne 6 paquets sur les derniers correctifs du SDK 56 : `expo` 56.0.24, `expo-auth-session` 56.0.20, `expo-linking` 56.0.19, `expo-router` 56.2.22, `expo-splash-screen` 56.0.16 et `jest-expo` 56.0.6.
- `package-lock.json` est régénéré ; les changements transitifs sont listés à CA3.
- Pods (local, ignoré par Git) : `pod install` suffit, sans reconstruction de `ios/Pods`.

### Vérification finale
- `npx expo install --check` : aucun écart, sortie 0.
- `npm ci` puis `npm run check` : sortie 0, 19 suites et 331 tests, `src/domain` à 100 %. Tout tourne sous Node 25.2.1 en local ; la CI confirmera sous Node 24.
- Simulateur iPhone 17 Pro, Debug : l'onboarding s'affiche, sans crash. La base locale est intacte (8 tables, 1 migration).

### Décisions
- Ordre des étapes : le chore Expo passe avant les repositories, qui deviennent P2-03 (Yanis, 27 octobre 2026).

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-1 | Rendu sombre non vérifiable au-delà de l'onboarding, faute de session sur le simulateur. | vérifié par Yanis lors de son test connecté ; rien à ajouter à la roadmap (28 octobre 2026) |

## Pour l'étape suivante
- **P2-03, repositories** : voir la section « Pour l'étape suivante » de [P2-01](P2-01-schema-local.md), toujours valable (UUID v7, ordre fractionnaire, `deleted_at`, `openLocalDatabase()` après `ready`).
- **Build** : un `pod install` manuel avec `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`, puis `npx expo run:ios --no-install --no-bundler`, a suffi. Aucune désynchronisation des pods n'est apparue.
- **Montée d'`expo-router`** : tant que le test Jest du « + » n'existe pas (case « Création et édition de tâche »), comparer `NativeTabsView` et `NativeBottomTabsNavigator` entre les versions, et tester le « + » à la main.
- **Installation sur iPhone** : `expo run:ios --device` peut rester bloqué sur « Connecting to: iPhone de Yanis » après « Build Succeeded ». Contournement : `xcrun devicectl device install app --device <id> <DerivedData>/…/Release-iphoneos/Dun.app`, puis `xcrun devicectl device process launch --device <id> com.dunapp.Dun`.
- **Splash infini sur iPhone** : si le projet Supabase de dev est injoignable et qu'une session est enregistrée, l'app ne dépasse pas le splash (voir « Retour de Yanis »).
- **Thème sombre sur simulateur** : sans session, seul l'onboarding est visible, et il force le clair. La vérification en sombre exige que Yanis se connecte, jusqu'à l'onboarding sans compte de la phase 2.
