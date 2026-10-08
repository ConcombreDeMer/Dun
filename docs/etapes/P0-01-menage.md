# P0-01 — Ménage

- **Statut** : terminée
- **Branche** : `chore/p0-01-menage`
- **Phase** : 0 — Assainir

## Plan validé

### Contexte

P0-00 a mis en place le workflow des agents. La phase 0 commence par le ménage : retirer le code mort et les fichiers lourds inutiles, nettoyer les logs et ramener le lint à zéro avertissement. C'est le préalable aux étapes d'outillage (Prettier, Jest, `npm run check`, CI), dont le critère final est « `npm run check` passe sans aucun avertissement ».

Constats faits pendant l'exploration :
- Aucun des fichiers morts listés n'est importé ailleurs (`useDailyScreen` n'est référencé que par lui-même). `taskEmitter.emit("taskAdded")` n'a aucun écouteur (`app/(tabs)/create-task.tsx:21` et `:81`).
- `scripts/reset-project.js` n'existe déjà plus : seule l'entrée de `package.json` reste.
- Inter : seules 4 graisses sont chargées (`app/_layout.tsx:111-114` : `Inter_24pt-Regular`, `-Light`, `-SemiBold`, `-Bold`).
- `build/config.gypi`, `bg.svg` (31 Mo) et `bg.jpg` (2,6 Mo) sont versionnés et inutilisés.
- 17 `console.log` dans 8 fichiers ; 102 `console.warn` / `console.error`.
- `Purchases.setLogLevel(LOG_LEVEL.DEBUG)` est appelé sans condition (`lib/revenuecat.ts:34`).
- `npm run lint` : 0 erreur, 90 avertissements (62 `no-unused-vars`, 15 `exhaustive-deps`, 8 `eqeqeq`, 5 `no-require-imports`). Une partie disparaît avec la suppression du code mort.
- `eslint.config.js` affirme que l'app n'est pas compilée avec React Compiler, alors que `app.json:89` active `reactCompiler: true`.

### Périmètre

Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] Supprimer le code mort : `errorModal`, `statsStatut`, `progressBar`, `loading`, `createModal`, `popUpModal`, `checkboxAnimated`, `useDailyScreen`, `lib/eventEmitter.ts` et son unique appel.
- [ ] Supprimer `test-swipe.tsx`, `build/`, `assets/images/background/bg.svg` et `bg.jpg`, ainsi que les fichiers Inter inutilisés (garder les 4 graisses chargées).
- [ ] Retirer le script `reset-project`. Documenter le correctif `postinstall` ou le supprimer s'il n'est plus nécessaire avec Expo 56.
- [ ] Supprimer les `console.log`, garder `console.warn` et `console.error` en développement seulement. N'activer `Purchases.setLogLevel(DEBUG)` qu'en `__DEV__`.
- [ ] Corriger les 90 avertissements de lint et le commentaire faux de `eslint.config.js` sur React Compiler.

Décisions de Yanis prises pendant la planification :
- **Logs** : un petit logger `lib/logger.ts`, actif seulement en `__DEV__`, plus la règle ESLint `no-console` pour éviter les rechutes.
- **Découpage** : une seule étape pour les 5 cases.

### Hors périmètre

- `circularProgressBar`, `newProgressBar`, `liquidCreateModal`, `CreateModalHost`, `createModalController` et `useProgressBarPreference` : ils ne sont pas dans la liste et sont (ou peuvent être) utilisés. On ne les touche pas.
- Les `console.*` de `scripts/`, `plugins/` (scripts Node exécutés au build) et `supabase/functions` (Deno) : ce n'est pas du code de l'app.
- Prettier, Jest, scripts `check`, CI, `tsconfig` / Deno : étapes suivantes de la phase 0.
- Branchement du logger sur Sentry : phase 5.
- Toute réécriture de logique au-delà de ce qu'exige un avertissement de lint.

### Modifications

#### 1. Code mort
- Supprimer `components/errorModal.tsx`, `statsStatut.tsx`, `progressBar.tsx`, `loading.tsx`, `createModal.tsx`, `popUpModal.tsx`, `checkboxAnimated.tsx`, `lib/useDailyScreen.ts`, `lib/eventEmitter.ts`.
- `app/(tabs)/create-task.tsx` : retirer l'import de `taskEmitter` et la ligne `taskEmitter.emit("taskAdded")`.
- Supprimer `assets/animations/loading.json`, utilisé seulement par `components/loading.tsx` (conséquence directe de sa suppression).

#### 2. Fichiers inutiles
- Supprimer `test-swipe.tsx`, `build/` et `assets/images/background/` (`bg.svg`, `bg.jpg`, et le dossier s'il devient vide).
- Ajouter `/build` à `.gitignore` (artefact `node-gyp`) pour qu'il ne revienne pas.
- Inter : garder `assets/fonts/Inter/static/Inter_24pt-{Regular,Light,SemiBold,Bold}.ttf` et `assets/fonts/Inter/OFL.txt` (licence, obligatoire à la redistribution). Supprimer tout le reste du dossier Inter (polices variables, `README.txt`, autres tailles et graisses).

#### 3. Scripts
- `package.json` : retirer l'entrée `reset-project`.
- `scripts/fix-expo-macros-plugin.js` : **le garder et le documenter** par un commentaire d'en-tête : quel problème il corrige (`expo-modules-core`, imbriqué sous `node_modules/expo/`, attend `@expo/expo-modules-macros-plugin` à côté de lui alors que npm le remonte à la racine), quand il a été introduit (passage à Expo 56, commit `8ac9af5`), et comment vérifier s'il est encore nécessaire (supprimer le lien symbolique, puis lancer un build iOS). Prouver qu'il est devenu inutile exige un build natif complet sans le lien ; ce n'est pas l'objet de cette étape.

#### 4. Logs
- Créer `lib/logger.ts` : `logger.warn(...args)` et `logger.error(...args)`, qui appellent `console.warn` / `console.error` seulement si `__DEV__`, et ne font rien sinon. Typage `unknown[]`, pas de `any`.
- Supprimer les 17 `console.log` (8 fichiers : `app/settings/index.tsx`, `changeEmail.tsx`, `account.tsx`, `app/auth/callback.tsx`, `app/(tabs)/home.tsx`, `app/(tabs)/stats/index.tsx`, `app/onboarding/login.tsx`, `lib/subscription.tsx`). Si l'un d'eux signale une erreur, le transformer en `logger.error` au lieu de le supprimer.
- Remplacer chaque `console.warn` / `console.error` de `app/`, `components/`, `lib/` et `store/` par `logger.warn` / `logger.error`, avec les mêmes arguments.
- `lib/revenuecat.ts:34` : `if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);`.
- `eslint.config.js` : ajouter `no-console: 'error'` pour `app/`, `components/`, `lib/` et `store/`, avec une exception pour `lib/logger.ts`.

#### 5. Lint
- **`no-unused-vars` (62)** : supprimer les imports, variables et paramètres inutilisés. Un paramètre imposé par une signature se préfixe par `_` si la config l'accepte ; sinon, le retirer quand c'est le dernier.
- **`eqeqeq` (8)** : passer à `===` / `!==`. Pour une comparaison `== null` qui couvre volontairement `null` et `undefined`, écrire les deux comparaisons explicitement.
- **`no-require-imports` (5)** : remplacer les `require()` d'assets (animations Lottie, images) par des `import` statiques.
- **`exhaustive-deps` (15)** : traiter chaque cas sans changer le comportement. Ordre de préférence :
  1. ajouter la dépendance quand elle est stable (setter, `router`, `t`, shared value Reanimated, ref) ;
  2. stabiliser la fonction appelée (`useCallback`, ou la déplacer dans l'effet) ;
  3. si l'ajout changerait le comportement (effet volontairement exécuté au montage seulement, par exemple), garder le tableau tel quel avec `// eslint-disable-next-line react-hooks/exhaustive-deps -- <raison>`.
  
  Lister les 15 cas dans le fichier d'étape, avec la correction choisie et sa justification.
- **`eslint.config.js`** : réécrire le commentaire. React Compiler **est** activé (`app.json`, `experiments.reactCompiler`). Les règles `react-hooks` orientées compilateur restent désactivées parce qu'elles donnent des faux positifs sur les motifs Reanimated (écriture de `.value`, refs `Animated.Value`), pas parce que le compilateur serait absent. On ne change pas la liste des règles désactivées.

### Critères d'acceptation

- **CA1** — Les 9 fichiers de code mort et `assets/animations/loading.json` n'existent plus ; `grep -rn "eventEmitter\|taskEmitter"` ne renvoie rien dans `app/`, `components/`, `lib/`.
- **CA2** — `test-swipe.tsx`, `build/`, `assets/images/background/bg.svg` et `bg.jpg` n'existent plus ; `/build` figure dans `.gitignore`.
- **CA3** — `assets/fonts/Inter/` ne contient plus que les 4 fichiers `Inter_24pt-{Regular,Light,SemiBold,Bold}.ttf` et `OFL.txt`.
- **CA4** — `package.json` n'a plus de script `reset-project` ; `scripts/fix-expo-macros-plugin.js` a un commentaire d'en-tête qui explique le problème, l'origine et la manière de vérifier s'il est encore utile.
- **CA5** — `grep -rn "console\.\(log\|warn\|error\|info\|debug\)" app components lib store` ne renvoie que `lib/logger.ts`.
- **CA6** — `lib/logger.ts` n'écrit rien hors `__DEV__` ; `Purchases.setLogLevel` n'est appelé que sous `__DEV__`.
- **CA7** — `npm run lint` : 0 erreur, 0 avertissement. La règle `no-console` est active sur le code de l'app.
- **CA8** — Les 15 corrections `exhaustive-deps` sont listées dans le fichier d'étape, chacune avec sa justification ; chaque `eslint-disable` porte une raison.
- **CA9** — Le commentaire de `eslint.config.js` est exact au sujet de React Compiler.
- **CA10** — `npx tsc --noEmit` ne remonte aucune erreur hors de `supabase/functions/beta-signup/index.ts`.
- **CA11** — L'app démarre sur le simulateur iOS. Écrans principaux sans régression visible, en clair et en sombre : accueil, création de tâche, calendrier, Daily, statistiques, réglages (compte, notifications, affichage). La police Inter s'affiche toujours.

### Vérification

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

- Les `grep` des CA1, CA3 et CA5.
- Simulateur iOS (build de dev déjà installé, sinon `npx expo run:ios`), en clair puis en sombre : parcours du CA11, avec une attention particulière aux écrans dont un hook a changé (`app/settings/account.tsx`, `notifications.tsx`, `index.tsx`, `changeEmail.tsx`, `components/calendar.tsx`, `app/(tabs)/home.tsx`, `app/auth/callback.tsx`).

### Questions et risques

- **Dépendances de hooks** : c'est le seul vrai risque de régression (effets relancés en boucle, ou pas assez). D'où la liste détaillée (CA8) et le test sur simulateur des écrans concernés. La connexion par lien email (`app/auth/callback.tsx`) ne peut pas être testée entièrement sur simulateur ; à tester par Yanis si le hook y change.
- **Correctif `postinstall`** : garder et documenter plutôt que supprimer, car prouver qu'il est inutile demande un build natif complet sans le lien symbolique. *Réponse de Yanis : plan validé tel quel, on garde et on documente.*
- **`assets/animations/loading.json`** : sa suppression n'est pas écrite dans la case, mais il n'est utilisé que par `components/loading.tsx`. Il est inclus comme conséquence directe. *Réponse de Yanis : plan validé tel quel, on le supprime.*
- **Taille du diff** : il touche beaucoup de fichiers (logger, variables inutilisées), mais les changements sont mécaniques ; les suppressions de binaires pèsent ~55 Mo et ne demandent pas de relecture.
- Rien dans l'offre commerciale ne concerne cette étape ; aucune contradiction relevée.

### Corrections exhaustive-deps

Les 15 avertissements relevés avant l'étape (numéros de ligne d'origine). Option 1 : dépendance stable ajoutée ; option 2 : fonction stabilisée ; option 3 : tableau gardé, `eslint-disable` avec raison.

| # | Emplacement | Dépendance(s) signalée(s) | Correction | Justification |
|---|---|---|---|---|
| 1 | `components/checkboxAnimated.tsx:33` (`useEffect`) | `opacity` | Disparu avec le fichier | Fichier supprimé comme code mort (case 1). |
| 2 | `app/(tabs)/home.tsx:565` (`useEffect`, synchro des rappels) | `profileQuery.data` | Option 3 | Le tableau liste déjà les champs lus (`alertSetupActive`, `alertSetupHour`, `alertSetupMinute`, `name`, `t`). Ajouter l'objet entier relancerait la programmation des notifications à chaque rechargement ou patch du profil (ex. `hasSeenTutorial`). |
| 3 | `app/auth/callback.tsx:51` (`useEffect`, traitement du lien) | `router` | Option 1 | `useRouter()` d'expo-router renvoie l'objet impératif `router`, stable (`node_modules/expo-router/build/hooks/useRouter.js`). L'effet reste exécuté une seule fois. |
| 4 | `app/settings/account.tsx:203` (`useEffect` [showModal]) | `page1X`, `page2X`, `page3X`, `screenWidth` | Option 1 | Shared values Reanimated (références stables) ; `screenWidth` est constant car l'app est verrouillée en portrait (`app.json`, `orientation: portrait`). |
| 5 | `app/settings/account.tsx:261` (`useEffect` [showPasswordModal]) | `passPage1X`, `passPage2X`, `passPage3X`, `screenWidth` | Option 1 | Même raison que #4. |
| 6 | `app/settings/account.tsx:488` (`useCallback` handleLogout) | `store` | Option 1 | Seule l'identité du callback change (plus souvent) ; `clearStore` est une action zustand stable, le comportement au clic est identique. |
| 7 | `app/settings/account.tsx:534` (`useCallback` handleDeleteAccount) | `t` | Option 1 | `t` ne change qu'au changement de langue ; le callback utilise alors les bons libellés. |
| 8 | `app/settings/changeEmail.tsx:74` (`useEffect` au montage) | `fetchUserData` | Option 2 | `getCountDownTime` (n'utilise qu'un setter) passe en `useCallback([])`, puis `fetchUserData` en `useCallback([getCountDownTime])` ; les deux sont stables, l'effet `[fetchUserData]` ne s'exécute toujours qu'au montage. `getCountDownTime` est déplacé au-dessus de `fetchUserData` (sinon zone morte temporelle dans le tableau de dépendances). |
| 9 | `app/settings/index.tsx:85` (`useEffect` au montage : utilisateur + RevenueCat) | `fetchInformation` | Option 3 | Ajouter `fetchInformation` (qui dépend de `user`) relancerait `getUser` et `Purchases.getCustomerInfo` à chaque changement d'utilisateur. Le chargement est voulu au montage seulement. |
| 10 | `app/settings/index.tsx:109` (`useEffect` [user]) | `fetchInformation` | Option 2 | `fetchInformation` passe en `useCallback([user])` ; le tableau devient `[user, fetchInformation]`, qui change exactement quand `user` change : même déclenchement qu'avant. |
| 11 | `app/settings/notifications.tsx:78` (`useEffect` au montage) | `initAlertSettings` | Option 3 | `initAlertSettings` est recréée à chaque rendu et utilise des fonctions de normalisation non mémorisées ; l'ajouter referait la requête en boucle. Le stabiliser imposerait de déplacer plusieurs fonctions : hors de ce qu'exige l'avertissement. |
| 12 | `app/settings/notifications.tsx:144` (`useEffect` calcul de `isModified`) | les 7 valeurs `initial*` | Option 1 | Effet de calcul dérivé. Les `initial*` ne changent qu'au chargement (en même temps que les valeurs courantes, résultat `false`) et à l'enregistrement (égales aux valeurs courantes, résultat `false`, déjà forcé par `setIsModified(false)`) : le résultat est identique dans tous les chemins. |
| 13 | `components/calendar.tsx:257` (`useEffect` [initialDate]) | `selectedDate` | Option 3 | Ajouter `selectedDate` relancerait la synchro à chaque sélection locale et ramènerait la sélection sur `initialDate` avant que le parent ne la mette à jour. |
| 14 | `components/calendar.tsx:405` (`useEffect` [slider], création du PanResponder) | `calendarScaleRef`, `heightValue`, `onExpandedChange` | Option 1 | Les deux premiers sont des shared values (stables). `onExpandedChange` est stable chez l'unique appelant (`app/(tabs)/home.tsx`, qui passe le setter `setIsCalendarExpanded`) : le PanResponder n'est pas recréé davantage. |
| 15 | `components/calendar.tsx:664` (`useMemo` dayGridItems) | `actualTheme` inutile | Retirée | Le calcul ne lit pas `actualTheme` ; les couleurs passent par `colors`, déjà en dépendance. |

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Bloqué (environnement), levé au tour 2 | — | CA11 vérifié en partie seulement. Le bundle iOS se construit (2919 modules, aucun module ni asset introuvable) et l'app démarre sur le simulateur, mais elle reste sur l'écran de démarrage : l'hôte du projet Supabase configuré dans `.env` ne se résout plus (DNS, depuis le Mac comme depuis le simulateur), alors qu'Internet, `supabase.com` et RevenueCat répondent. Le projet Supabase a sans doute été mis en pause ou supprimé. Ce n'est pas lié au code de l'étape. | Aucune correction de code. Yanis rétablit l'accès à Supabase (réactiver le projet, ou pointer vers un autre), puis fait le parcours du CA11. |
| R1-2 | Non bloquant | `app/(tabs)/home.tsx:429-430`, `app/rest.tsx:29`, `app/settings/account.tsx:59-60`, `app/settings/changeEmail.tsx:16`, `components/switchItem.tsx:17`, `app/onboarding/emailVerif.tsx:38` | Des états ne servent plus qu'à leur setter (`[, setX]`), et `isVerified` est un état constant. Le lint passe, mais ce sont des états morts. | Nettoyage plus poussé, hors de ce qu'exige le lint. |
| R1-3 | Non bloquant | fichiers de `lib/` et fichiers en guillemets simples | L'import du logger utilise `@/lib/logger` et des guillemets doubles partout, même dans les fichiers qui importent en relatif ou en guillemets simples. | Prettier (étape suivante) uniformisera les guillemets. |
| R1-4 | Non bloquant | `scripts/*.js`, `supabase/functions/beta-signup` | `npx eslint .` (plus large que `npm run lint`) signale `no-undef '__dirname'` dans les scripts Node et `import/no-unresolved` sur les imports Deno. Préexistant. | À traiter avec l'exclusion Deno du `tsconfig` ou la définition de `npm run check`. |

Vérifié et correct :
- `npx tsc --noEmit` : 7 erreurs, toutes dans `supabase/functions/beta-signup/index.ts` (CA10).
- `npx expo lint --max-warnings 0` : code de sortie 0, aucun message (CA7).
- CA1 à CA6 : fichiers supprimés, `find assets/fonts/Inter -type f` (4 polices et `OFL.txt`), `grep` des `console.*` (seulement `lib/logger.ts`), `grep` de `taskEmitter` (vide), `.gitignore`, `package.json`, en-tête de `scripts/fix-expo-macros-plugin.js`, `lib/logger.ts` et `lib/revenuecat.ts:35` sous `__DEV__`.
- CA8 : les 15 cas sont listés et justifiés. Contrôle des deux plus sensibles :
  - `components/calendar.tsx` (#14) : l'unique appelant passe `setIsCalendarExpanded`, un setter stable, donc le PanResponder n'est pas recréé davantage ;
  - `app/settings/notifications.tsx` (#12) : après enregistrement, les `initial*` égalent les valeurs courantes et `setIsModified(false)` est déjà appelé, donc le résultat est inchangé.
- CA9 : le commentaire de `eslint.config.js` est exact.
- Bloc `no-console` : `files` + `ignores: ['lib/logger.ts']` dans le même objet, donc exception limitée à ce fichier.
- Périmètre : les suppressions en cascade (`getWeeksInMonth`, `closeTutorial`, `formatLastUpdateDate`, etc.) sont des variables inutilisées signalées par le lint. Aucun fichier hors liste supprimé, sauf `assets/animations/loading.json`, prévu au plan.
- Écart au plan accepté : les 5 `no-require-imports` visaient `require("lottie-react-native")`, pas des assets. Quatre étaient inutilisés et ont été retirés ; le cinquième (`successMail.tsx`) est devenu un `import`.

## Revue — tour 2 (test sur simulateur)

Yanis a relancé le projet Supabase, qui était en pause (R1-1 levé). Parcours du CA11 sur l'iPhone 17 Pro, avec le build de dev et un Metro Dun sur le port 8082.

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R2-1 | Non bloquant | — (natif) | **Plantage natif intermittent à la fin du Daily.** Au premier passage du Daily à l'accueil, l'app s'est fermée (`SIGABRT`, exception Objective-C dans `-[RCTViewComponentView unmountChildComponentView:index:]`, déclenchée depuis `reanimated::ReanimatedModuleProxy::performOperations`). Rapport : `~/Library/Logs/DiagnosticReports/Dun-2026-10-08-164927.ips`. Au second passage (même parcours, sans tâche en suspens), aucun plantage. Aucune modification de l'étape ne touche l'arbre rendu du Daily ou de l'accueil (`app/daily.tsx` : 3 constantes inutilisées retirées). C'est vraisemblablement une course connue entre Fabric et Reanimated au démontage, antérieure à l'étape. Non prouvé, faute de pouvoir rejouer le cas exact sur `master` sans modifier la base. | Aucune dans cette étape. À surveiller, à vérifier dans Sentry, et à reproduire sur `master` au prochain Daily. |

Vérifié et correct, en thème clair puis en thème sombre (thème de l'app, réglé dans Affichage, puis remis sur « Clair ») :
- **Daily** (`app/daily.tsx`) : les 4 étapes, curseur « Lancer la journée », retour à l'accueil.
- **Accueil** :
  - le calendrier se déplie et se replie à la poignée (#14, PanResponder) ;
  - la sélection d'une date se synchronise entre le bandeau et la grille (#13) ;
  - le bouton « Retour à aujourd'hui » fonctionne ;
  - en sombre, la grille prend les couleurs du thème (#15).
- **Création de tâche** (`liquidCreateModal`) : la feuille s'ouvre. La saisie n'a pas pu être simulée (clavier logiciel absent), donc aucune tâche n'a été créée.
- **Statistiques** : les 4 cartes s'affichent (`statsCard*` modifiées).
- **Réglages** :
  - index : les interrupteurs se chargent (#9, #10) ;
  - Notifications : valeurs chargées, « Enregistrer » grisé, actif après une modification, grisé de nouveau après retour à la valeur d'origine (#11, #12) ;
  - Compte : la fenêtre « Changer l'email » s'ouvre sur sa première page (#4) ; refermée sans saisie de mot de passe ;
  - Affichage : le changement de thème fonctionne.
- **Polices** : Inter et Satoshi s'affichent partout.
- **Metro** : aucune erreur JS. Seul avertissement : `Linking found multiple possible URI schemes`, préexistant.
- **Données de test** : le Daily du jour a été validé deux fois. Les écritures sont les mêmes que lors d'une utilisation normale (`hasDoneDaily: true`, finalisation de la journée).

Non testé : la connexion par lien email (`app/auth/callback.tsx`, #3) et la fenêtre « Réinitialiser le mot de passe » (#5).

## Résultat

### Ce qui a été fait
- **Code mort supprimé** : 7 composants, `lib/useDailyScreen.ts`, `lib/eventEmitter.ts` et son appel dans `app/(tabs)/create-task.tsx`, plus `assets/animations/loading.json`.
- **Fichiers inutiles supprimés** : `test-swipe.tsx`, `build/` (et `/build` ajouté à `.gitignore`), `bg.svg` et `bg.jpg`, et 54 fichiers Inter. Il reste les 4 graisses chargées et la licence `OFL.txt`.
- **Scripts** : `reset-project` retiré de `package.json` ; le correctif `postinstall` est documenté en tête de `scripts/fix-expo-macros-plugin.js`.
- **Logs** :
  - nouveau `lib/logger.ts` (`warn` / `error`, actifs seulement en `__DEV__`) ;
  - 17 `console.log` supprimés et 96 `console.warn` / `console.error` remplacés ;
  - `Purchases.setLogLevel(DEBUG)` seulement en `__DEV__` ;
  - règle `no-console` en erreur sur `app/`, `components/`, `lib/` et `store/`.
- **Lint** : 90 avertissements ramenés à 0 ; commentaire sur React Compiler corrigé.
- Diff hors binaires : 56 fichiers, +253 / −1458.

### Vérification finale
- `npx tsc --noEmit` : seules restent les 7 erreurs connues de `supabase/functions/beta-signup/index.ts`.
- `npm run lint` : 0 erreur, 0 avertissement.
- Simulateur iOS (iPhone 17 Pro), après la relance de Supabase : parcours du CA11 en clair et en sombre, sans régression constatée (voir « Revue — tour 2 »). Un plantage natif intermittent a été observé une fois à la fin du Daily (R2-1).

### Décisions
- Logger maison plutôt que plugin Babel ou `if (__DEV__)` au cas par cas (choix de Yanis pendant la planification).
- Une seule étape pour les 5 cases du ménage (choix de Yanis).
- Correctif `postinstall` gardé et documenté, pas supprimé (plan validé tel quel).
- Les `require()` d'assets ne sont pas signalés par la config ESLint : ils restent tels quels.

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-2 | États qui ne servent plus qu'à leur setter | à décider |
| R1-3 | Style des imports du logger | à décider |
| R1-4 | `npx eslint .` signale des erreurs dans `scripts/` et `supabase/` | à décider |
| R2-1 | Plantage natif intermittent à la fin du Daily (Fabric / Reanimated) | à décider |

## Pour l'étape suivante
- **Supabase en pause.** Le projet Supabase gratuit se met en pause après une période d'inactivité. L'app reste alors bloquée sur l'écran de démarrage (erreur « hostname could not be found » dans Metro). Il faut le relancer depuis le tableau de bord Supabase. La case « Créer deux projets Supabase, dev et prod » de la phase 0 réglera la question durablement.
- **Plantage à la fin du Daily (R2-1).** Le reproduire sur `master` au prochain Daily, pour confirmer qu'il précède l'étape.
- **Piloter le simulateur.** L'app réagit avec du retard en mode debug, et les appuis trop brefs sont ignorés : utiliser un appui d'environ 0,15 s et attendre 2 à 3 s entre deux actions. Le Daily se rouvre par `exp+dun://daily`, avec quelques secondes de délai.
- **Metro et simulateur.** Le build de dev installé (`com.dunapp.Dun`) n'a pas de dev-client et cherche Metro sur le port 8081, parfois occupé par un autre projet de Yanis (Peanut). Pour tester sans le perturber :
  1. `npx expo start --port 8082` ;
  2. `xcrun simctl spawn booted defaults write com.dunapp.Dun RCT_jsLocation "localhost:8082"`, puis relancer l'app ;
  3. à la fin, `xcrun simctl spawn booted defaults delete com.dunapp.Dun RCT_jsLocation`.
- **Logs.** Tout nouveau log de l'app passe par `logger` (`lib/logger.ts`) ; `no-console` bloque `console.*` ailleurs. Le branchement sur Sentry est prévu en phase 5.
- **Lint.** `npm run lint` ne couvre ni `scripts/` ni `supabase/` (voir R1-4). À prendre en compte au moment de définir `npm run check`.
- **Prettier.** Les imports ajoutés n'ont pas de style homogène ; le formatage global de l'étape Prettier s'en chargera.
