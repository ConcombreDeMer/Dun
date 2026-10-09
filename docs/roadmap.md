# Roadmap V1 de Dun

Cette roadmap applique l'offre décrite dans [`offre-commerciale-v1-pour-agents.md`](../offre-commerciale-v1-pour-agents.md) et corrige les problèmes relevés dans [`audit.md`](audit.md).

**Hypothèses.**
- Développement solo, à temps plein.
- Personne n'utilise l'app aujourd'hui, donc aucune donnée réelle n'est à préserver. L'étape « les personnes ayant déjà un compte choisissent un nouvel objectif lors de la migration » de l'offre devient sans objet ; on peut la retirer du document commercial ou la laisser comme cas théorique.
- La journée se clôt à minuit partout : Daily, objectif et statistiques suivent la même règle.

## État d'avancement

- **Phase en cours** : 0 — Assainir.
- **Dernière étape terminée** : [P0-02 — Outillage](etapes/P0-02-outillage.md).
- **Prochaine étape** : la première case non cochée de la phase 0 (section « Environnements »).

Cette section est mise à jour à la fin de chaque étape par l'agent principal (voir [Workflow](#workflow)).

---

**Durée estimée : environ 15 semaines.** Les estimations servent à prioriser, pas à s'engager : chaque phase a un critère de fin vérifiable, et c'est ce critère qui compte.

| Phase | Contenu | Semaines |
|---|---|---|
| 0 | Assainir le dépôt et l'outillage | 1 |
| 1 | Noyau métier testé | 2-3 |
| 2 | Données locales, app sans compte | 3-7 |
| 3 | Offre gratuit / Dun+ | 7-9 |
| 4 | Cloud Dun+ | 9-13 |
| 5 | Publication | 13-15 |

**L'ordre est volontaire.**
1. On fixe d'abord les règles (phase 1), parce que le stockage local (phase 2) et la synchronisation (phase 4) en dépendent.
2. L'app gratuite hors ligne est complète avant d'ajouter le cloud. Ainsi, Dun+ s'ajoute par-dessus un socle stable au lieu de le conditionner.

---

## Architecture cible

```
src/
  app/            Routes Expo Router. Écrans fins : ils assemblent des composants
                  de fonctionnalité, sans logique métier ni accès direct aux données.
  domain/         TypeScript pur, sans React ni stockage : clés de date (minuit),
                  état d'une journée, série, objectif, Repos, statistiques, report.
                  Testé à 100 %.
  data/           expo-sqlite + Drizzle ORM : schéma typé, migrations embarquées,
                  requêtes en direct (useLiveQuery). Un repository par entité.
  sync/           Outbox, push et pull vers Supabase. Activé seulement avec Dun+.
  entitlements/   Table « fonction → gratuit / Dun+ » et can(feature), calculé
                  depuis RevenueCat. Seule source de vérité des droits.
  features/       tasks, box, daily, rest, goal, tags, reminders, stats,
                  settings, profile, paywall, account, backup.
  ui/             Design system : boutons, cartes, interrupteurs, feuilles, typographie, couleurs.
  i18n/           Ressources générées depuis locales/*.yaml.
```

**Choix structurants.**
- **SQLite local comme source de vérité, pour tout le monde.** Les écrans lisent la base locale par requêtes en direct : quand elle change, l'écran se met à jour, sans invalidation de cache ni mise à jour optimiste à maintenir. React Query reste réservé au réseau (offres RevenueCat, état de la synchronisation).
- **Drizzle** apporte un schéma typé, des migrations versionnées embarquées dans l'app et des requêtes vérifiées par TypeScript.
- **Des identifiants UUID v7 générés sur l'appareil.** Une tâche existe avant même d'être envoyée au serveur, sans identifiant temporaire à remplacer.
- **`updated_at` et `deleted_at` sur chaque ligne.** La suppression est logique : la synchronisation peut ainsi propager les suppressions.
- **Un ordre par indexation fractionnaire** (clé texte entre deux voisines). Insérer ou déplacer une tâche ne modifie qu'une ligne, sans renuméroter toute la journée.
- **Synchronisation en « dernière écriture gagnante », par ligne.** Pour un seul utilisateur sur plusieurs appareils, les conflits sont rares ; inutile de construire un moteur de fusion complexe.
- **Les journées closes sont enregistrées** (`day_records`) avec leur date locale et leur résultat. Une journée close garde sa date, même après un voyage (offre : « Une journée déjà enregistrée garde sa date »).

---

## Phase 0 — Assainir (semaine 1)

**But :** repartir d'un dépôt propre, avec des garde-fous automatiques.

### Ménage
- [x] Supprimer le code mort : `errorModal`, `statsStatut`, `progressBar`, `loading`, `createModal`, `popUpModal`, `checkboxAnimated`, `useDailyScreen`, `lib/eventEmitter.ts` et son unique appel. → [P0-01](etapes/P0-01-menage.md)
- [x] Supprimer `test-swipe.tsx`, `build/`, `assets/images/background/bg.svg` et `bg.jpg`, ainsi que les fichiers Inter inutilisés (garder les 4 graisses chargées). → [P0-01](etapes/P0-01-menage.md)
- [x] Retirer le script `reset-project`. Documenter le correctif `postinstall` ou le supprimer s'il n'est plus nécessaire avec Expo 56. → [P0-01](etapes/P0-01-menage.md)
- [x] Supprimer les `console.log`, garder `console.warn` et `console.error` en développement seulement. N'activer `Purchases.setLogLevel(DEBUG)` qu'en `__DEV__`. → [P0-01](etapes/P0-01-menage.md)
- [x] Corriger les 90 avertissements de lint et le commentaire faux de `eslint.config.js` sur React Compiler. → [P0-01](etapes/P0-01-menage.md)

### Outillage
- [x] Exclure `supabase/functions` de `tsconfig.json` et lui donner sa propre configuration Deno. Corriger au passage les erreurs que `npx eslint .` signale hors de `npm run lint` : `no-undef '__dirname'` dans `scripts/*.js` et `import/no-unresolved` sur les imports Deno (voir [P0-01, R1-4](etapes/P0-01-menage.md)). → [P0-02](etapes/P0-02-outillage.md)
- [x] Ajouter Prettier et formater tout le dépôt en un seul commit dédié. → [P0-02](etapes/P0-02-outillage.md)
- [x] Ajouter Jest (`jest-expo`) et `@testing-library/react-native`, avec un premier test. → [P0-02](etapes/P0-02-outillage.md)
- [x] Ajouter les scripts `typecheck`, `lint`, `test`, `format:check` et `check` (qui enchaîne les quatre). → [P0-02](etapes/P0-02-outillage.md)
- [x] Supprimer le `.github/workflows/quality.yml` non suivi et le remplacer par une CI simple : `npm ci`, puis `npm run check`, à chaque PR et sur `master`. Garder `.nvmrc`. → [P0-02](etapes/P0-02-outillage.md)

### Environnements
- [ ] Ajouter les profils EAS `development`, `preview` et `production`, avec les variables d'environnement EAS au lieu de lignes commentées dans `.env`.
- [ ] Créer deux projets Supabase, dev et prod, et documenter le passage de l'un à l'autre.
- [ ] Vérifier que les commits `1e20054` et `8ff5dc7` n'ont jamais été poussés. Dans le doute, régénérer le secret client Google OAuth.

### Documentation et Git
- [ ] Réécrire le README : installation, commandes, architecture réelle, environnements.
- [x] Écrire les instructions des agents et les conventions dans `CLAUDE.md`, avec le skill `/etape-suivante` et le sous-agent `implementeur` → [P0-00](etapes/P0-00-workflow-agents.md)
- [x] Mettre à jour la section « Vérification » de `CLAUDE.md` une fois `npm run check` créé. → [P0-02](etapes/P0-02-outillage.md)
- [ ] Supprimer les branches fusionnées ou abandonnées : `codex/*`, `create-task-v2`, `create-task-v3`, etc. Archiver par un tag celles qu'on veut garder pour mémoire.

**Terminé quand :** la CI est verte sur `master` et `npm run check` passe sans aucun avertissement.

---

## Phase 1 — Noyau métier testé (semaines 2 et 3)

**But :** traduire chaque règle de l'offre en fonctions pures testées, dans `src/domain`. Ce code ne dépend ni de React ni du stockage. Il devient la spécification exécutable de Dun.

### Dates et journées
- [ ] `dateKey(date, timeZone)` : clé `YYYY-MM-DD` de la journée locale, clôture à minuit. Supprimer `DAILY_ROLLOVER_HOUR`.
- [ ] Une nouvelle journée suit le fuseau de l'iPhone ; une journée déjà enregistrée garde sa date. Tests avec un passage de Paris à New York et retour.
- [ ] `dayStatus(tasks, restPeriods, dateKey, now)` → `success | failed | empty | rest | provisional` :
  - seule une journée **close** à 100 % est un succès ;
  - une journée en cours à 100 % est provisoire ;
  - une journée vide hors Repos est un échec, de même qu'une journée incomplète.

### Série et objectif
- [ ] `streak(dayStatuses)` : **une seule règle**, utilisée par l'objectif et par les statistiques. Le Repos est neutre : il ne compte pas, mais ne rompt pas la série.
- [ ] `goalProgress(goal, dayStatuses)` :
  - cibles 1, 2, 3, 4, 7 ou 14 ;
  - la journée de confirmation compte si elle se clôt à 100 %, même si des tâches ont été faites avant la confirmation ;
  - la première réussite datée et la série en cours sont distinctes.

### Repos
- [ ] `isRestDay(restPeriods, dateKey)` :
  - un Repos activé pendant une journée ouverte rend toute la journée neutre ;
  - la date de fin est incluse ;
  - une annulation avant minuit rend la journée en cours normale ;
  - aucun Repos n'est appliqué rétroactivement à une journée close.

### Tâches et statistiques
- [ ] Verrouillage des jours passés (activable) : quelles actions sont permises sur une tâche d'un jour clos.
- [ ] **Une seule sémantique pour « reporter »** : déplacer la tâche et incrémenter `delay_count`. Écrire la décision dans `CLAUDE.md`.
- [ ] Statistiques de la semaine, du mois et de l'année : complétion, charge, journées parfaites, série. Les périodes sont identifiées par `week | month | year`, plus par des libellés.

**Terminé quand :** chaque puce des sections « Objectif, journées et Repos » de l'offre correspond à au moins un test nommé d'après elle, et la couverture de `src/domain` est de 100 %.

---

## Phase 2 — Données locales, app sans compte (semaines 3 à 7)

**But :** l'app gratuite complète fonctionne hors ligne, sans compte et sans aucun appel à Supabase.

### Base locale
- [ ] Écrire le schéma Drizzle : `tasks` (date nulle = Box), `tags`, `task_tags`, `day_records`, `rest_periods`, `goal`, `settings`, `reminders`, `outbox`. Toutes les tables ont `id` UUID, `created_at`, `updated_at` et `deleted_at`.
- [ ] Écrire un repository par entité. Les écrans ne parlent qu'aux hooks de `features/`, qui appellent `domain/` et `data/`.
- [ ] Clôturer les journées : au lancement et au retour au premier plan, enregistrer les journées closes depuis la dernière ouverture dans `day_records`.

### Fonctionnalités à reconstruire sur la base locale
Pour chacune : la découper en composants de moins de 300 lignes et supprimer l'ancien code Supabase.
- [ ] Home : calendrier, liste du jour, progression.
- [ ] Création et édition de tâche ; une seule modale au lieu de `popUpTask` et `liquidCreateModal`.
- [ ] Box, sans limite.
- [ ] Daily : revue des tâches en retard, reporter, terminer en retard, supprimer.
- [ ] Repos : activer, annuler, consulter la date de fin.
- [ ] Tags : créer, modifier, supprimer, 3 maximum par tâche.
- [ ] Statistiques de la semaine.
- [ ] Réglages d'affichage : thème, langue, taille du texte, calendrier, progression, palette. Fusionner `ThemeContext` et `FontContext` dans un seul module de préférences lu depuis `settings`.
- [ ] Écran Affichage : le titre « Affichage » chevauche son sous-titre (constaté en [P0-02, R2-1](etapes/P0-02-outillage.md)).
- [ ] Rappel quotidien local : heure et jours choisis, week-end compris.

### Onboarding et sauvegarde
- [ ] Onboarding sans compte, qui enregistre le nom **et l'objectif**. Supprimer l'étape `trial` et les écrans d'inscription obligatoires (ils reviendront en phase 4 pour activer le cloud).
- [ ] Export manuel en fichier JSON local (via la feuille de partage), et restauration depuis ce fichier, avec un format versionné.
- [ ] Supprimer Zustand s'il ne sert plus, ainsi que `AuthSessionContext` et les appels `supabase` dans `app/`.

**Terminé quand :** sur une installation neuve en mode avion, on peut faire l'onboarding, créer des tâches et des tags, utiliser la Box, réussir une journée, passer le Daily le lendemain, activer le Repos, voir les statistiques de la semaine, exporter puis restaurer. Tout cela sans erreur et sans aucune requête réseau (vérifié dans Sentry et dans les journaux).

---

## Phase 3 — Offre gratuit / Dun+ (semaines 7 à 9)

**But :** appliquer exactement le tableau de l'offre, depuis un seul endroit.

### Table des droits
- [ ] `src/entitlements/features.ts` : la table « fonction → `free` | `plus` » recopiée de l'offre, et `can(feature, { isPlus })`.
- [ ] Supprimer `FREE_DAILY_TASK_LIMIT`, `REQUIRE_PREMIUM_ACCESS`, `EXPO_PUBLIC_BETA_PREMIUM`, `PremiumAccessGate`, `usePremiumDowngradeCompliance`, `getActiveTagIdsForPlan` et tous les `useEffect` qui écrivent pour « corriger » un droit.

### Répartition
| Gratuit | Dun+ |
|---|---|
| Tâches et Box sans limite, calendrier, historique | Synchronisation entre appareils |
| Daily, verrouillage et Repos activables | — |
| Objectif de l'onboarding | — |
| 5 tags créés au maximum, 3 par tâche | Tags sans plafond, 3 par tâche |
| Rappel quotidien, week-end compris | Répétitions du rappel |
| Statistiques de la semaine | Mois, année, analyses détaillées |
| Thèmes, langue, taille du texte, calendrier en curseur, progression linéaire | Palettes, calendrier en texte, progression circulaire |
| Export et restauration manuels | Synchronisation et restauration cloud |

### Expiration (fin effective du droit, pas simple annulation du renouvellement)
- [ ] Les données locales restent intactes.
- [ ] Les tags existants restent actifs et modifiables ; la création est refusée tant qu'il y en a au moins 5.
- [ ] La palette et les dispositions Dun+ déjà choisies restent affichées ; seul le choix d'une **nouvelle** variante Dun+ est verrouillé.
- [ ] Les répétitions de rappel s'arrêtent ; le rappel quotidien continue. Il faut reprogrammer les notifications au changement de droit.

### Écrans
- [ ] Onglet **Profil / Mon système** : objectif, Daily, Repos, rappels, tags. La roue dentée garde les paramètres généraux. Pas de carte « Delay ».
- [ ] **Paywall** :
  - il présente uniquement les avantages Dun+ disponibles ;
  - prix total, durée, essai éventuel, renouvellement, gestion et restauration, tous tirés des produits Apple via RevenueCat ;
  - liens vers les conditions d'utilisation et la politique de confidentialité.
- [ ] Relire onboarding, réglages, aide et paywall : aucune mention des routines ou de fonctions absentes.

**Terminé quand :** chaque ligne du tableau a un test sur `can()`, et une vérification manuelle est faite dans trois états (gratuit, Dun+ actif, Dun+ expiré) avec un compte sandbox.

---

## Phase 4 — Cloud Dun+ (semaines 9 à 13)

**But :** une copie cloud et une synchronisation réservées à Dun+, vérifiées côté serveur.

### Nouveau schéma Supabase
Aucun utilisateur à préserver : on repart de zéro dans le projet prod.
- [ ] Tables en snake_case, calquées sur le schéma local : `user_id uuid not null references auth.users on delete cascade`, `NOT NULL` partout où c'est pertinent, `updated_at` et `deleted_at`.
- [ ] RLS stricte `user_id = (select auth.uid())`, aucun `GRANT` pour `anon` sur les données, aucune fonction `SECURITY DEFINER` exposée au client, `search_path` figé partout.
- [ ] Générer les types avec `supabase gen types` et les mettre à jour en CI.
- [ ] Sortir `Beta` et `support_issues*` dans un projet séparé, ou les supprimer s'ils ne servent plus.
- [ ] Une base locale (`supabase start`), un seed et une migration initiale propre, à la place de l'export brut.

### Droit Dun+ côté serveur
- [ ] Une fonction serveur `revenuecat-webhook` alimente une table `entitlements` (`user_id`, `active`, `expires_at`, `ended_at`). Elle vérifie la signature du webhook.
- [ ] Les écritures cloud passent par une fonction `sync-push` qui refuse toute écriture sans droit actif. On peut aussi utiliser une règle RLS qui consulte `entitlements`.

### Compte et synchronisation
- [ ] Le compte (Apple, Google, email) est demandé seulement pour activer ou récupérer la copie cloud. L'identifiant RevenueCat est relié au compte.
- [ ] **Push** : l'outbox locale est envoyée par lots, puis vidée après accusé de réception.
- [ ] **Pull** : un curseur `updated_at` par table ; la dernière écriture gagne.
- [ ] Première activation : envoyer toute la base locale. Nouvel appareil : restaurer la copie cloud.
- [ ] Un indicateur de synchronisation dans Profil, avec l'heure de la dernière synchronisation et les erreurs éventuelles.

### Expiration et suppression
- [ ] À la fin effective du droit, la synchronisation s'arrête. La copie cloud reste lisible et récupérable pendant 90 jours.
- [ ] Passé ce délai, un job `pg_cron` revérifie le droit, puis supprime les données de productivité cloud.
- [ ] Suppression de compte par une fonction serveur atomique (données et utilisateur `auth`). Elle n'affecte pas les données locales sauf demande explicite.

**Terminé quand :**
- deux simulateurs connectés au même compte convergent après des modifications hors ligne de part et d'autre ;
- une écriture sans droit actif est refusée par le serveur, et pas seulement masquée par l'interface ;
- la purge à J+90 est vérifiée sur la base locale avec une date simulée ;
- la suppression de compte ne laisse aucune ligne.

---

## Phase 5 — Publication (semaines 13 à 15)

- [ ] **Tests de bout en bout** avec Maestro sur simulateur iOS :
  - onboarding ;
  - journée complète et Daily ;
  - Repos ;
  - achat sandbox ;
  - expiration ;
  - restauration cloud ;
  - export et import.

  Les lancer en CI sur les PR de `master` si le coût reste raisonnable, sinon avant chaque build.
- [ ] **Sentry** : releases, sourcemaps envoyées par EAS, environnement `production` / `preview`.
- [ ] **Accessibilité** : Dynamic Type (la taille du texte de l'app comprise), libellés VoiceOver sur les cases à cocher et les boutons-icônes, contrastes des palettes.
- [ ] **Performance** : démarrage à froid, listes longues (un an de tâches), animations du calendrier.
- [ ] **App Store** :
  - fiche, captures et textes limités aux fonctions livrées ;
  - étiquettes de confidentialité (données locales, compte optionnel, Sentry) ;
  - politique de confidentialité et conditions publiées.
- [ ] Bêta TestFlight externe, puis correction des retours.
- [ ] Rédiger `docs/release-checklist.md` et la valider entièrement.

**Terminé quand :** la checklist de publication est entièrement cochée et le build de production est soumis.

---

## Après la V1

1. **Routines et tâches récurrentes**, première mise à jour. Elles ne sont mentionnées nulle part avant leur livraison.
2. Widgets iOS (série, journée en cours).
3. Android, si la demande le justifie : l'architecture locale le rend possible sans refonte.

---

## Workflow

La procédure détaillée est dans le skill [`/etape-suivante`](../.claude/skills/etape-suivante/SKILL.md). Les règles permanentes sont dans [`CLAUDE.md`](../CLAUDE.md).

### Une étape, de bout en bout
1. **Plan.** `/etape-suivante` : l'agent principal lit cette roadmap et le dernier fichier d'étape, choisit la prochaine étape (de la taille d'une PR) et soumet un plan à Yanis.
2. **Préparation.** Une fois le plan validé, l'agent crée la branche et le fichier d'étape dans [`docs/etapes/`](etapes/README.md).
3. **Implémentation.** Le sous-agent `implementeur` réalise le plan.
4. **Revue.** L'agent principal relit le diff, relance lui-même la vérification et classe chaque problème en bloquant ou non bloquant.
5. **Correction.** S'il reste un problème bloquant, le même sous-agent corrige, puis une nouvelle revue a lieu. Au bout de 3 tours, Yanis est consulté.
6. **Documentation.** L'agent principal met à jour le fichier d'étape et cette roadmap **dans la même branche**, puis résume la situation et donne la commande de commit.
7. **Publication.** Yanis teste, commite, pousse, ouvre et fusionne la PR. L'étape suivante part du `master` à jour.

### Règles
- **Une étape à la fois.** On ne lance pas l'étape suivante tant que la PR précédente n'est pas fusionnée.
- **Un jalon par phase.** Une phase ne commence que lorsque le critère « Terminé quand » de la précédente est atteint.
- **Les règles métier commencent par les tests**, tirés de l'offre.
- **Toute décision produit est écrite** dans l'offre, cette roadmap ou un fichier d'étape, jamais seulement dans une conversation.
- **Commits conventionnels, une PR par étape, CI verte avant fusion** (dès que la CI existe). La fusion se fait par commit de merge, sans squash : l'historique de la branche est conservé, d'où l'importance de commits propres et conventionnels.
- **Un build TestFlight interne à la fin de chaque phase**, testé sur un vrai iPhone.

La définition de « terminé » est dans [`CLAUDE.md`](../CLAUDE.md#définition-de--terminé-).
