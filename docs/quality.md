# Contrôles de reprise — PROD-006

## Commandes reproductibles

Node 24.21.0 (`.nvmrc`), npm 11.6.2 (`packageManager`, `engines`), Deno 2.9.6 installé par `npm ci`. Le patch 2.9.7 cité lors de la planification n'était pas disponible dans npm ; 2.9.6 a été vérifié puis épinglé, sans changement de runtime déployé.

```sh
npm ci
npm run quality
npm run i18n:generate
git diff --exit-code -- lib/i18n/resources.ts package.json package-lock.json
TZ=America/Los_Angeles npm run test:ci
```

`quality` exécute successivement :

| Commande | Périmètre |
|---|---|
| `npm run tools:check` | Node, npm et Deno aux versions approuvées ; échec explicite si différentes |
| `npm run typecheck:app` | Expo/React Native strict, `app`, `components`, `lib`, `store`, expérimentation racine ; aucune émission |
| `npm run typecheck:node` | JS scripts, plugins et configurations ; `checkJs`, JSDoc, types Node 24 ; aucune exécution de plugin |
| `npm run typecheck:tests` | Types des fixtures, tests et imports métier ; pas de globals Jest ajoutés au mobile |
| `npm run typecheck:functions` | Deno strict + lockfile gelé, fonction bêta non exécutée |
| `npm run lint` | Tout le dépôt source, y compris logique métier ; pas de cache ni auto-fix |
| `npm run test:ci` | Jest 29.7 + jest-expo 56.0.5, horloge/fixtures maîtrisées, aucune connexion Supabase |

Installer Node/npm avec le gestionnaire habituel. Aucun outil global n'est installé automatiquement par le dépôt. Les dépendances Deno distantes publiques sont téléchargées au premier contrôle ; leur lockfile ne remplace pas un build/test du runtime Edge Supabase. Les déclarations de types distribuées par esm.sh restent dépendantes de ce fournisseur ; ce contrôle statique n'est pas une certification de toute la chaîne d'approvisionnement.

Ne pas utiliser `--no-check`, `--legacy-peer-deps`, `--force` ou désactiver les scripts pour obtenir une preuve d'installation. Le `postinstall` existant ne génère pas iOS : il crée un lien dans `node_modules` pour les macros Expo. Sa validation native reste PROD-025.

## Choix de configuration

Un seul runner JS : Jest, avec preset Expo SDK 56. `@react-native/jest-preset` 0.85.3 correspond à React Native. Le preset fournit indirectement son renderer compatible React 19.2.3 ; aucune suite de snapshots UI ajoutée. npm place `expo-modules-core` sous Expo dans ce lockfile : le mapper Jest résout cette dépendance effectivement installée, sans deuxième copie ni modification native.

ESLint garde ses règles d'erreur. Les globals CommonJS sont déclarés seulement pour Node ; Deno traite ses imports URL (exception limitée à `import/no-unresolved` sur `https://` dans `supabase/functions`). `deno check` reste obligatoire dans `quality` et la CI : le dossier serveur n'est pas abandonné au lint.

React Compiler est activé dans `app.json`. Ses quatre règles auparavant désactivées sont rétablies comme avertissements. Aucune règle globale supplémentaire n'est coupée. Le passage de 92 à 215 avertissements rend visibles des diagnostics existants ; il ne certifie pas qu'ils sont tous des faux positifs. Les hooks sensibles seront traités dans leurs lots. Les nouveaux fichiers de cette reprise doivent rester sans avertissement.

Les contrôles Node ont révélé des paramètres implicitement `any`, l'objet accumulateur i18n non typé et le type `unknown` du catch du correctif macros. Corrections : JSDoc et déclaration typée du preset ESLint qui ne fournit pas de types. Aucun changement de logique dans ces scripts/plugins ; aucune génération native exécutée.

## Défauts connus : reproduction distincte de conformité

Trois attentes V1 sont exécutées avec `test.failing` dans `tests/regressions/known.test.ts` :

| Défaut | Résultat attendu / observé avant correction | Lot |
|---|---|---|
| E08 | 01/10 00:01 → 01/10 ; code actuel → 30/09 | PROD-008 |
| E09 | Repos avec une tâche faite → zéro jour parfait ; code actuel → un | PROD-008 |
| E04 | `Tasks: [null]` rejeté ; lecture actuelle accepte le fichier | PROD-012 |

```sh
npm run test:regressions
```

Cette commande active **les mêmes assertions sans inversion** : elle doit actuellement échouer exactement sur ces trois attentes (code 1). Elle a vocation à devenir verte dans leurs lots de correction ; alors retirer `test.failing` pour le cas corrigé. Ce n'est pas une commande de CI que l'on ignore silencieusement. La CI normale exécute les cas explicitement attendus et rappelle cette dette dans son résumé. Aucun cas `skip`/`todo` ne remplace une preuve.

Les tests d'import simulent uniquement la lecture de fichier et remplacent le module Supabase avant import du code testé. Ils ne lancent jamais `replaceUserDataFromImport`. Aucun test n'attend que 4 h ou la perte de données soient un comportement correct.

## CI préparée, pas encore exécutée sur GitHub

`.github/workflows/quality.yml` : PR et déclenchement manuel, Ubuntu 24.04, Node/npm fixes, `npm ci`, génération i18n sans dérive, tous les contrôles et second fuseau. Actions épinglées par SHA, permissions `contents: read`, pas de credentials persistants ni secrets de production. Aucun workflow de migration/build/release ajouté.

Références des actions vérifiées : [checkout 4.2.2](https://github.com/actions/checkout/commit/11bd71901bbe5b1630ceea73d27597364c9af683), [setup-node 4.4.0](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020).

Une PR échouera sur les erreurs de type/lint/tests/installation/génération. Rendre ce statut obligatoire pour fusionner exige une protection de branche distante, non configurée ici. Sans push ni exécution GitHub, PROD-006 reste **partiel** au sens de sa preuve CI distante. Les commandes sont vérifiées séparément dans une copie locale propre.

## Journal de validation

État initial `ed6cba1` : seul `ROADMAP_PRODUCTION.md` non suivi ; copie exacte conservée hors dépôt pendant la reprise, SHA-256 `7da3fbf71f89e09f22b5a8a5b5f9741b0ff620509f8a7d4ad9e3c20a3456bd7f`. Aucun fichier suivi modifié avant le travail.

Inspection avant modification : TypeScript global 7 diagnostics Deno, mobile isolé 0 ; lint global 5 erreurs / 92 avertissements. Les 5 erreurs étaient des problèmes de globals Node/imports Deno.

Résultats locaux finaux, **02/10/2026**, avec le runtime épinglé :

| Contrôle exécuté | Résultat |
|---|---|
| Copie propre des sources suivies et nouveaux fichiers du lot, sans `.env`, `.expo`, projets natifs ni `node_modules` existant ; `npm ci --offline --no-audit --no-fund` | Code 0, 1 123 paquets installés depuis le cache public alimenté lors de l'installation ; `postinstall` exécuté. Ce n'est pas un clone GitHub ni une installation Linux |
| `npm run quality` dans cette copie, environnement vidé (`env -i`), sans secrets ni variables du shell utilisateur | Code 0 ; versions conformes, quatre contrôles de types réussis, lint global 0 erreur / 215 avertissements, cinq suites Jest |
| `npm run test:ci`, Europe/Paris puis America/Los_Angeles | 74 cas dans chaque fuseau : 71 attentes ordinaires satisfaites et 3 défauts connus exécutés en `test.failing` ; aucun test ignoré |
| `npm run test:regressions` dans la copie propre | Code 1 attendu, exactement les trois assertions métier du tableau ci-dessus échouent ; ces défauts ne sont pas corrigés |
| Erreur de type injectée dans un script temporaire de la copie, puis fichier retiré | `typecheck:node` code 2 avec TS2322 ; prouve que les scripts JS sont contrôlés |
| Identifiant inexistant injecté en mémoire via ESLint, chemin de script Node | Erreur `no-undef` détectée ; aucune règle désactivée pour contourner ce test |
| `npm run i18n:generate`, puis `git diff --exit-code -- lib/i18n/resources.ts` dans le dépôt | Code 0, ressource générée identique |
| Lecture YAML du workflow, vérification des déclencheurs, permissions et SHA d'actions | Réussie localement ; exécution GitHub non réalisée |

Les nouveaux modules/tests/configurations n'ajoutent aucun avertissement lint ; les 215 avertissements portent sur le code préexistant. Les trois défauts connus restent E08/E09/E04, pas des régressions du lot. Les contrôles ne valident ni l'app sur iPhone, ni une archive Xcode, ni les transactions SQLite, achats, RLS ou synchronisation. La résolution réseau et les binaires Linux du premier `npm ci` GitHub restent à démontrer par une vraie exécution distante. Aucun push effectué.

## Revenir sur ce lot

Les modifications de scripts/plugins sont seulement du typage ; les sources des écrans, services métier existants, migrations SQL et fonction bêta restent intactes. Les modules de contrat ne sont pas branchés sur l'app. Pour revenir, appliquer l'inverse des seuls diffs de ce lot après inspection de l'état courant ; restaurer `package.json` et son lockfile ensemble puis réinstaller. Ne pas supprimer les nouveaux fichiers de l'utilisateur, les données de test, `.env`, `ios/` ou `android/`. Conserver la roadmap préexistante même si elle n'était pas suivie. Aucun `git reset --hard` ou nettoyage global.

### Dépendances : comparaison ciblée après installation

`npm audit --package-lock-only --ignore-scripts --json` exécuté sur le lockfile initial puis celui du lot : **33 alertes dans les deux**, 1 faible / 20 modérées / 11 hautes / 1 critique ; aucun nouveau nom de paquet vulnérable. L'alerte critique préexistante concerne `shell-quote` ([GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p)), également signalé pour [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv). Ce relevé ne mesure pas l'exploitabilité dans Dun et ne prouve pas l'absence de vulnérabilités. Aucun `npm audit fix` exécuté ; analyse/remédiation ciblée à rattacher à PROD-025 avant candidat.

Le lockfile ajoute les outils Jest/Deno et leurs dépendances (226 entrées). Versions déjà présentes modifiées : `@types/node` 25.5.0 → 24.19.0, `undici-types` 7.18.2 → 7.24.6 (types Node), `hasown` 2.0.2 → 2.0.4 lors de la résolution npm. Aucune version des dépendances directes de l'app modifiée ; aucune suppression d'entrée du lockfile. Les avertissements de dépréciation transitifs de Jest sont visibles à l'installation.
