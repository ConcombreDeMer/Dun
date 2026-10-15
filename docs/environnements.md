# Environnements dev et prod

Dun a deux environnements, dev et prod. Chacun a son projet Supabase et son fichier de variables. Expo choisit le fichier tout seul selon le type de build : il n'y a plus de lignes à commenter ou décommenter dans un `.env`.

Les builds se font avec Xcode. EAS n'est pas utilisé.

## Tableau des environnements

| Environnement | Type de build                                | Fichier lu         | Projet Supabase |
| ------------- | -------------------------------------------- | ------------------ | --------------- |
| dev           | Metro, `expo run:ios`, Debug Xcode           | `.env.development` | dev             |
| prod          | Archive Release Xcode, TestFlight, App Store | `.env.production`  | prod            |

Un build Release lit `.env.production` et pointe donc sur la prod, qu'il soit lancé depuis Xcode (bouton Run en Release, archive) ou avec `npx expo run:ios --configuration Release`. Seule exception : `npm run ios:device-dev`, qui installe un build Release sur l'iPhone avec la base de dev (voir « Tester un build Release sur l'iPhone avec la base de dev »).

## Fonctionnement

Expo charge les fichiers `.env*` selon un « mode » :

- **mode `development`** : Metro (`npx expo start`), `npx expo run:ios` et les builds Debug. En Debug, l'app charge son code depuis Metro.
- **mode `production`** : les builds Release. La phase « Bundle React Native code and images » de Xcode lance `expo export:embed --dev false`, qui passe en mode `production`. `npx expo run:ios --configuration Release` fait de même.

Au moment du bundle, Expo remplace chaque `process.env.EXPO_PUBLIC_…` écrit en toutes lettres dans le code par sa valeur. Seules les variables qui commencent par `EXPO_PUBLIC_` entrent dans le bundle. Leurs valeurs sont donc copiées en clair dans l'app, et n'importe qui peut les lire : on n'y met jamais de secret. Les autres variables (par exemple `SENTRY_AUTH_TOKEN`) restent côté machine de build.

La liste des variables, avec leur rôle, est dans [`.env.example`](../.env.example).

## Ordre de priorité des fichiers

Pour un mode donné, Expo lit ces fichiers, du plus prioritaire au moins prioritaire :

1. `.env.<mode>.local` (par exemple `.env.production.local`) ;
2. `.env.local` ;
3. `.env.<mode>` (`.env.development` ou `.env.production`) ;
4. `.env`.

Quand une variable apparaît dans plusieurs fichiers, c'est le plus prioritaire qui gagne. Une variable déjà définie dans le shell passe avant tous les fichiers.

Tous les fichiers `.env*` sont ignorés par Git, sauf `.env.example`.

### Dans un build Xcode

Les phases de build Xcode (« Bundle React Native code and images », « Upload Debug Symbols to Sentry », etc.) sourcent `ios/.xcode.env` puis `ios/.xcode.env.local`. Le plugin `plugins/with-ios-sentry-xcode-env.js` écrit dans `ios/.xcode.env.local` un bloc délimité par des marqueurs (`# >>> dun: SENTRY_AUTH_TOKEN …` / `# <<< dun: SENTRY_AUTH_TOKEN <<<`) qui :

- n'exporte que `SENTRY_AUTH_TOKEN`, lu dans `.env.local` (guillemets acceptés, lignes commentées ignorées) ;
- n'exporte rien d'autre de `.env.local`, et ne lit pas `.env` ;
- ne fait jamais échouer le build si `.env.local` est absent ou ne contient pas le jeton.

Aucune variable `EXPO_PUBLIC_*` ne devient donc une variable du shell de la phase de build : l'ordre de priorité ci-dessus vaut aussi pour les builds Xcode.

Le plugin réécrit ce bloc à chaque prebuild (`npx expo prebuild`, ou `npx expo run:ios` quand il régénère `ios/`). Il remplace le bloc existant, y compris l'ancien bloc `set -a … set +a` qui exportait `.env.local` et `.env` entiers, et ne touche pas aux autres lignes du fichier (par exemple `NODE_BINARY`). Ne pas modifier ce bloc à la main.

### Pièges

- **`.env.local` passe avant `.env.production`.** Expo le lit dans les deux modes. Une variable `EXPO_PUBLIC_*` posée dans `.env.local` écraserait donc la valeur prod dans un build Release. `.env.local` ne doit contenir **aucune** variable `EXPO_PUBLIC_*` : seulement `SENTRY_AUTH_TOKEN`, seule variable que les phases Xcode en extraient.
- **Le `.env` de base est lu par Expo dans les deux modes.** Une valeur oubliée dedans se retrouverait en dev comme en prod. On n'y met rien, et le mieux est de ne pas en avoir. Les phases Xcode, elles, ne le lisent plus.
- **Metro garde un cache.** Après une modification d'un fichier `.env*`, relancer Metro avec `npx expo start --clear`, sinon l'app peut garder les anciennes valeurs. Les builds Xcode, eux, vident ce cache à chaque fois.

## Tester un build Release sur l'iPhone avec la base de dev

Pour tester l'app en conditions réelles (build Release, sans Metro) sans toucher aux données de prod :

```bash
npm run ios:device-dev
```

- Brancher l'iPhone au Mac (câble ou même réseau, mode développeur activé). Expo propose la liste des appareils.
- Le script (`scripts/ios-device-dev.js`) :
  1. vérifie que `.env.development` existe, et s'arrête avec un message sinon ;
  2. le lit avec le parseur d'Expo (`@expo/env`) : mêmes règles que le bundle (guillemets, commentaires, expansion `${VAR}`). L'expansion ne lit que le fichier, jamais le shell ;
  3. vérifie que toutes les variables `EXPO_PUBLIC_*` de `.env.example` sont présentes dans `.env.development`. S'il en manque, il s'arrête (sortie 1) et liste les noms manquants ;
  4. impose les valeurs de `.env.development` dans l'environnement du processus, en écrasant celles du shell. Il affiche les noms des variables du shell ainsi remplacées ;
  5. lance `npx expo run:ios --configuration Release --device`.

  Comme une variable déjà définie dans l'environnement passe avant tous les fichiers `.env*`, les valeurs de `.env.development` l'emportent sur celles de `.env.production`. Les messages n'affichent que des noms, jamais de valeur.

Points d'attention :

- **Seule cette commande bascule sur dev.** Le bouton Run de Xcode (en Release) et les archives (*Product → Archive*, TestFlight, App Store) lisent toujours `.env.production`.
- **`.env.development` doit contenir toutes les variables `EXPO_PUBLIC_*` de `.env.example`**, y compris les deux variables Dun+ (mettre `false` si besoin). Le build reste en mode `production` : une variable absente de `.env.development` serait prise dans `.env.production`, et l'app mélangerait dev et prod (par exemple l'URL dev avec la clé `anon` prod). Le script le vérifie et refuse de lancer le build.
- **Se déconnecter à chaque bascule entre dev et prod.** Les deux builds ont le même identifiant d'app (`com.dunapp.Dun`) : l'un remplace l'autre sur l'iPhone, et les données locales sont conservées, dont la session Supabase. Cette session n'est pas valable dans l'autre projet. Se déconnecter avant d'installer l'autre build, puis se reconnecter (ou supprimer l'app avant l'installation).

## Où vivent les secrets serveur

Les fichiers `.env*` de l'app ne contiennent que des valeurs publiques (et `SENTRY_AUTH_TOKEN` dans `.env.local`, qui n'entre pas dans le bundle).

Les secrets serveur n'ont rien à faire dans un `.env` de l'app. En particulier, le **secret client Google OAuth** se règle à deux endroits seulement :

- dans le tableau de bord Supabase de chaque projet (*Authentication → Sign In / Providers → Google*) ;
- dans Google Cloud Console (*APIs & Services → Credentials*).

Pour le garder sous la main, le ranger dans un gestionnaire de mots de passe.

## Mise en place sur une machine neuve

1. Copier le modèle vers les deux fichiers :

   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   ```

2. Remplir `.env.development` avec les valeurs du projet Supabase **dev**, et `.env.production` avec celles du projet **prod** (dans *Project Settings*, rubriques API : URL du projet et clé `anon`). Remplir la clé RevenueCat depuis le tableau de bord RevenueCat (*Project → API keys*).
3. Si on envoie les symboles à Sentry depuis Xcode, créer `.env.local` avec la seule ligne `SENTRY_AUTH_TOKEN=…`.
4. Lancer `npx expo start --clear`.

## Migration depuis l'ancien `.env`

Avant cette étape, tout tenait dans un seul `.env`, avec des lignes commentées pour passer de dev à prod. Étapes manuelles, à faire une seule fois, sur la branche qui contient la nouvelle règle de `.gitignore` (ou après sa fusion), pour que les nouveaux fichiers ne soient jamais suivis par Git :

1. Créer `.env.development` et `.env.production` à partir de `.env.example`, en y reportant les valeurs dev et prod de l'ancien `.env`.
2. Supprimer le `.env` de base.
3. Ranger le secret Google OAuth dans un gestionnaire de mots de passe (voir « Où vivent les secrets serveur »).

`.env.local` reste tel quel, avec `SENTRY_AUTH_TOKEN` seulement.

## CLI Supabase

Le dossier `supabase/` du dépôt (migrations, fonctions) est relié à **un seul** projet à la fois.

- **Passer d'un projet à l'autre** :

  ```bash
  supabase link --project-ref <ref-du-projet>
  ```

  La référence est le sous-domaine de l'URL du projet (`https://<ref>.supabase.co`). La CLI demande le mot de passe de la base.

- **Vérifier le projet lié avant toute commande distante** : `supabase projects list` marque le projet lié dans la colonne `LINKED`.
- **Comparer les migrations** du dépôt avec celles du projet lié :

  ```bash
  supabase migration list
  ```

- **Appliquer les migrations** au projet lié, toujours sur dev d'abord :

  ```bash
  supabase db push
  ```

**Règle : on ne pousse jamais une migration en prod sans l'avoir appliquée sur dev.** L'ordre est donc : `link` sur dev, `db push`, vérification dans l'app en Debug, puis `link` sur prod, `db push`, et retour sur dev avec `link`.

## Vérifier quel projet un build utilise

Les deux projets se ressemblent. Pour savoir à quel projet un build est relié :

1. Se connecter dans l'app avec un compte de test.
2. Ouvrir le tableau de bord Supabase de chaque projet, dans *Authentication → Users*.
3. Le compte (ou sa dernière connexion) apparaît dans le projet que le build utilise.

À faire au moins une fois après la migration : un build Debug sur simulateur doit tomber sur dev, un archive Release (TestFlight interne, ou `npx expo run:ios --configuration Release`) sur prod.
