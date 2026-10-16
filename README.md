<div align="center">
  <img src="./assets/images/icon.png" alt="Icône de Dun" width="72" height="72">

# Dun

Application iPhone pour organiser et suivre ses journées.

</div>

## Ce que fait Dun

- **Tâches datées et Box** : chaque tâche appartient à une journée, ou attend sans date dans la Box.
- **Calendrier** : naviguer d'une journée à l'autre et revoir les journées passées.
- **Daily** : à l'ouverture, un bilan de la veille pour terminer, reporter ou supprimer les tâches restées en suspens. Activable ou désactivable.
- **Verrouillage des jours passés** : protège l'historique une fois la journée close. Activable ou désactivable.
- **Repos** : mettre ses journées en pause jusqu'à une date choisie.
- **Tags** : classer ses tâches.
- **Rappel quotidien** : une notification à l'heure choisie.
- **Statistiques** : par semaine, par mois et par année.
- **Affichage** : thèmes clair, sombre et système, palettes de couleurs, langue (français ou anglais), taille du texte, calendrier en curseur ou compact, progression linéaire ou circulaire.
- **Export et import** : sauvegarder ses données dans un fichier, puis les restaurer.

### V1 en préparation

Dun est en cours de refonte pour sa première version publique. La cible est décrite dans l'[offre commerciale](offre-commerciale-v1-pour-agents.md) et le chemin pour y arriver dans la [roadmap](docs/roadmap.md) : une app utilisable sans compte et hors ligne, avec une version gratuite et un abonnement Dun+. Ce n'est pas encore le cas : aujourd'hui, l'app demande un compte et lit ses données sur Supabase.

## Prérequis

La V1 vise uniquement l'iPhone.

- macOS avec Xcode et un simulateur iOS ;
- Node.js, dans la version indiquée par [`.nvmrc`](.nvmrc) (24) ;
- CocoaPods (`pod`).

## Installation

1. Installer les dépendances :

   ```bash
   npm ci
   ```

2. Créer les fichiers de variables à partir du modèle, puis les remplir (valeurs dev dans l'un, prod dans l'autre). La marche à suivre est dans [`docs/environnements.md`](docs/environnements.md).

   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   ```

3. Compiler et lancer l'app sur le simulateur :

   ```bash
   npx expo run:ios
   ```

   La première fois, le prebuild génère le dossier `ios/`. Ce dossier n'est pas suivi par Git : il est reconstruit depuis `app.json` et les plugins de `plugins/` (Continuous Native Generation).

## Commandes

| Commande                 | Rôle                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `npm start`              | Lance Metro (`expo start`).                                                                 |
| `npm run ios`            | Compile et lance l'app iOS en Debug (`expo run:ios`).                                       |
| `npm run ios:device-dev` | Installe un build Release sur l'iPhone branché, avec la base de dev.                        |
| `npm run typecheck`      | Vérifie les types (`tsc --noEmit`).                                                         |
| `npm run lint`           | Lance ESLint, sans aucun avertissement toléré.                                              |
| `npm run test`           | Lance les tests Jest.                                                                       |
| `npm run format`         | Formate le code avec Prettier.                                                              |
| `npm run format:check`   | Vérifie le formatage sans rien modifier.                                                    |
| `npm run check`          | Enchaîne `typecheck`, `lint`, `format:check` et `test`. C'est la vérification de référence. |
| `npm run i18n:generate`  | Régénère `lib/i18n/resources.ts` depuis `locales/*.yaml`.                                   |
| `npm run android`        | Non pris en charge.                                                                         |
| `npm run web`            | Non pris en charge.                                                                         |

## Environnements

Dun a deux environnements, chacun avec son projet Supabase. Expo choisit le fichier de variables selon le type de build :

| Environnement | Type de build                                         | Fichier lu         |
| ------------- | ----------------------------------------------------- | ------------------ |
| dev           | Metro, `npx expo run:ios`, Debug Xcode                | `.env.development` |
| prod          | Release Xcode (Run ou archive), TestFlight, App Store | `.env.production`  |

Seule exception : `npm run ios:device-dev` installe un build Release avec les valeurs de `.env.development`.

Les variables `EXPO_PUBLIC_*` sont copiées en clair dans l'app : on n'y met **jamais de secret**.

Le détail (ordre de priorité des fichiers, pièges, secrets serveur, CLI Supabase) est dans [`docs/environnements.md`](docs/environnements.md).

## Builds iOS et pods

- **Debug** charge le code JavaScript depuis Metro. **Release** l'embarque dans l'app.
- Après un changement de dépendances (ou d'un fichier `.env*`), relancer Metro en vidant son cache :

  ```bash
  npx expo start --clear
  ```

### Reconstruire `ios/Pods` après un passage Debug ↔ Release

Quand on alterne les builds Debug et Release, les pods précompilés (`React-Core-prebuilt`, `ExpoModulesCore.xcframework`) peuvent garder la variante de l'autre configuration.

Symptômes :

- échec de l'édition de liens, avec un symbole `Sealable::Sealable()` introuvable ;
- crash au lancement de l'app, dans `Props::Props()`.

Correction :

```bash
cd ios && rm -rf Pods && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

Si le problème persiste, fermer Xcode, supprimer le dossier DerivedData du projet, puis recompiler :

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/Dun-*
```

## Architecture

### Stack

Versions lues dans [`package.json`](package.json).

| Rôle                     | Outil                                 |
| ------------------------ | ------------------------------------- |
| Framework                | Expo 56, React Native 0.85, React 19  |
| Langage                  | TypeScript 6, en mode strict          |
| Navigation               | Expo Router                           |
| Compte et données        | Supabase                              |
| Données serveur en cache | React Query                           |
| État global              | Zustand                               |
| Animations               | Reanimated                            |
| Abonnement               | RevenueCat (`react-native-purchases`) |
| Suivi des erreurs        | Sentry                                |
| Traductions              | i18next, avec des fichiers YAML       |

### Arborescence

```
app/          Routes Expo Router : onglets, onboarding, réglages, Box, Daily, Repos
components/   Composants d'interface
lib/          Logique partagée : Supabase, tâches, statistiques, notifications,
              abonnement, thème, traductions
  i18n/       Ressources générées depuis locales/ (ne pas modifier à la main)
store/        État global Zustand
locales/      Textes de l'app en français et en anglais (YAML)
assets/       Polices, images, animations Lottie, icône
supabase/     Migrations SQL et fonctions Edge (Deno)
plugins/      Plugins de configuration Expo, appliqués au prebuild
scripts/      Scripts Node (génération des traductions, build iPhone en dev)
docs/         Roadmap, fichiers d'étape, environnements, audit
```

Ce code sera réorganisé au fil de la roadmap : la structure visée est décrite dans l'[architecture cible](docs/roadmap.md#architecture-cible).

## Traductions

Tout texte visible passe par les fichiers [`locales/fr.yaml`](locales/fr.yaml) et [`locales/en.yaml`](locales/en.yaml). Après une modification, régénérer les ressources :

```bash
npm run i18n:generate
```

## Contribuer

- Les règles du projet, pour les humains comme pour les agents, sont dans [`CLAUDE.md`](CLAUDE.md).
- Le travail suit la [roadmap](docs/roadmap.md), étape par étape, avec le skill `/etape-suivante` ([`.claude/skills/etape-suivante/SKILL.md`](.claude/skills/etape-suivante/SKILL.md)). Chaque étape a son fichier dans [`docs/etapes/`](docs/etapes/).
- Messages de commit en commits conventionnels (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`), préfixés par l'étape quand il y en a une, par exemple `docs(P0-05): …`.
- La CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) lance `npm run check` à chaque PR et sur `master`. Il doit passer sans erreur ni avertissement.
