# Dun — instructions pour les agents

Dun est une application iPhone de suivi de tâches quotidiennes (Expo 56, React Native 0.85, TypeScript strict, Supabase, RevenueCat). Le projet est mené par un seul développeur, Yanis, avec Claude Code.

## Sources de vérité

Lire selon le besoin, dans cet ordre :

1. [`offre-commerciale-v1-pour-agents.md`](offre-commerciale-v1-pour-agents.md) : ce que l'app doit faire. En cas de conflit avec le code, c'est l'offre qui a raison.
2. [`docs/roadmap.md`](docs/roadmap.md) : ce qui reste à faire, phase par phase. Chaque case cochée renvoie vers son fichier d'étape.
3. [`docs/etapes/`](docs/etapes/) : un fichier par étape réalisée (plan, revues, décisions). Le plus récent décrit l'état le plus à jour.
4. [`docs/audit.md`](docs/audit.md) : photo du projet en octobre 2026. Il n'est pas mis à jour ; il sert de contexte.

Une décision produit n'est valable que si elle est écrite dans l'un de ces fichiers. Une décision prise en conversation doit y être reportée.

## Workflow de développement

Tout travail de la roadmap passe par le skill **`/etape-suivante`** (`.claude/skills/etape-suivante/SKILL.md`), qui décrit la procédure complète :

1. Proposer un plan pour la prochaine étape.
2. Faire implémenter ce plan par le sous-agent `implementeur`.
3. Relire les modifications et classer chaque problème en bloquant ou non bloquant.
4. Corriger en boucle, 3 tours au maximum.
5. Mettre à jour la documentation, puis rendre la main.

Une demande ponctuelle hors roadmap (question, petite correction) suit les mêmes principes : plan validé avant de modifier, vérification avant de rendre la main.

## Règles absolues

- **Ne jamais commiter, pousser, fusionner ni ouvrir de PR.** Yanis le fait lui-même. L'agent prépare le travail et donne la commande prête à coller (`git add … && git commit -m "…"`), avec un heredoc si le message est long. `.claude/settings.json` bloque ces commandes.
- **Créer une branche est autorisé ; ne jamais travailler directement sur `master`.**
- **Ne jamais trancher une question produit.** En cas d'ambiguïté ou de contradiction avec l'offre ou la roadmap, poser la question.
- **Ne jamais présenter comme disponible une fonction absente**, dans l'app, le paywall ou la documentation (les routines, par exemple, ne font pas partie de la V1).
- **Ne jamais lire les branches `roadmap-v1` et `roadmap-v2`** : ce sont des tentatives abandonnées.
- **Ne jamais afficher ni copier le contenu de `.env` ou de `.env.local`.**

## Vérification

`npm run check` est la vérification de référence. La CI le lance à chaque PR et sur `master` (`.github/workflows/ci.yml`, Node de `.nvmrc`).

```bash
npm run check
```

Il enchaîne, et s'arrête au premier échec :

1. `npm run typecheck` : `tsc --noEmit` ;
2. `npm run lint` : `eslint . --max-warnings 0` ;
3. `npm run format:check` : `prettier --check .` (corriger avec `npm run format`) ;
4. `npm run test` : `jest`.

Il doit passer sans aucune erreur ni aucun avertissement.

Quand une modification touche l'interface, la vérifier sur le simulateur iOS, en thème clair et en thème sombre.

## Conventions

Elles s'appliquent au code neuf ou réécrit. Le code existant est migré au fil de la roadmap, pas d'un seul coup.

- **Architecture cible** (voir la roadmap) :
  - `src/domain` contient les règles métier pures et testées ;
  - `src/data` contient le stockage local ;
  - `src/entitlements` contient les droits gratuit / Dun+ ;
  - `src/features` et `src/ui` contiennent l'interface.
- **Pas de règle métier dans un écran, et pas d'accès direct à Supabase ou au stockage depuis un écran.**
- **Droits Dun+** : passer uniquement par la table des droits. Ne jamais écrire en base pour « corriger » un droit.
- **Typage** : TypeScript strict, aucun `any` nouveau.
- **Textes** : tout texte visible passe par `locales/fr.yaml` et `locales/en.yaml`, puis `npm run i18n:generate`.
- **Dates** : utiliser les clés `YYYY-MM-DD` en heure locale. La journée se termine à minuit, partout.
- **Noms de fichiers** :
  - composants en `PascalCase.tsx` ;
  - hooks en `useCamelCase.ts` ;
  - routes en `kebab-case.tsx` ;
  - SQL en snake_case.
- **Taille des fichiers** : au-delà d'environ 300 lignes, découper.
- **Logs** : pas de `console.log` dans le code livré.
- **Commits** : messages en commits conventionnels (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`), avec le préfixe de l'étape quand il y en a une, par exemple `chore(P0-01): …`.
- **Branches** : `type/sujet`, par exemple `chore/p0-menage`.

## Définition de « terminé »

- Le critère d'acceptation du plan est atteint.
- La vérification passe et les tests sont ajoutés ou mis à jour quand une règle métier est touchée.
- Aucune modification hors du périmètre du plan.
- Les textes existent en FR et en EN.
- La roadmap et le fichier d'étape sont à jour dans la même branche.
