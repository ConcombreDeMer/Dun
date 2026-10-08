# Bilan technique de Dun — octobre 2026

Ce bilan porte sur la branche `master` au commit `a41e771`. Il confronte le code à l'offre décrite dans [`offre-commerciale-v1-pour-agents.md`](../offre-commerciale-v1-pour-agents.md). La suite du travail est décrite dans [`roadmap.md`](roadmap.md).

**Méthode.** J'ai lu les modules métier de `lib/` (tâches, Daily, abonnement, profil, notifications, statistiques, tags), la racine `app/_layout.tsx`, les écrans clés et le schéma SQL complet. J'ai aussi lancé `tsc --noEmit` et `expo lint`, cherché le code mort et relu l'historique Git. Les branches `roadmap-v1` et `roadmap-v2` n'ont pas été consultées.

**Contexte retenu.**
- Personne n'utilise l'application aujourd'hui, donc aucune donnée réelle n'est à préserver.
- Le développement se fait seul et à temps plein.
- Une journée se termine à minuit, partout dans l'app.

**Verdict en une phrase.** L'app est riche, soignée visuellement et bâtie sur une stack moderne. En revanche, son architecture (100 % en ligne, compte obligatoire, règles métier noyées dans les appels réseau et les écrans) contredit le cœur de l'offre V1 : une app hors ligne, sans compte, avec le cloud réservé à Dun+. La V1 ne demande pas des retouches : elle demande de refaire la couche de données et de remettre à plat les règles métier.

---

## 1. Ce qui est bien

- **Stack récente et cohérente.** Expo 56, React Native 0.85, React 19, Reanimated 4 et TypeScript en mode strict. `tsc` passe sur tout le code de l'app : les seules erreurs viennent de la fonction Deno, incluse par erreur (voir §4.11). `expo lint` donne 0 erreur et 90 avertissements.
- **De bonnes briques, bien choisies.**
  - React Query, avec des mises à jour optimistes ([`lib/useOptimisticTaskMutations.ts`](../lib/useOptimisticTaskMutations.ts)).
  - Zustand, utilisé de façon minimale.
  - Sentry, qui filtre les données personnelles (`sendDefaultPii: false` et `beforeSend` dans [`app/_layout.tsx`](../app/_layout.tsx)).
  - RevenueCat, encapsulé dans un contexte.
- **Une internationalisation sérieuse.** Les textes sont écrits en YAML (`locales/fr.yaml`, `locales/en.yaml`) puis transformés par un script en ressources typées. 49 écrans et composants utilisent la traduction, et il ne reste presque aucun texte en dur dans le JSX.
- **Une base sécurisée par défaut.** La RLS est activée sur toutes les tables, et les migrations sont versionnées dans `supabase/migrations`.
- **Des clés de date centralisées** dans [`lib/date.ts`](../lib/date.ts), au format `YYYY-MM-DD` en heure locale. C'est le bon réflexe pour éviter les décalages de fuseau.
- **Une expérience iOS soignée.** Des composants natifs spécifiques à iOS (`*.ios.tsx` avec `@expo/ui`) et des plugins Expo maison propres (`plugins/`).
- **Une fonction serveur `beta-signup` bien faite**, avec Turnstile, limitation de débit et réponses JSON propres.
- **Une offre commerciale écrite, précise et testable.** C'est rare à ce stade et c'est le meilleur actif du projet : chaque ligne peut devenir un critère d'acceptation et un test.

---

## 2. Écart bloquant : l'architecture contredit l'offre

L'offre pose trois principes :

> Le cœur de Dun est utilisable sans compte, sans abonnement et hors ligne. Les données locales sur l'iPhone sont la copie de travail de tous les utilisateurs.

Le code fait l'inverse :

- **Le compte est obligatoire.** Sans session, l'app redirige vers `/onboarding/start` ([`app/_layout.tsx:205`](../app/_layout.tsx#L205)).
- **Tout passe par le réseau.** Chaque lecture et chaque écriture interroge Supabase. Il n'existe aucun stockage local des tâches : le cache React Query n'est qu'un cache, pas une source de vérité.
- **Une action simple coûte plusieurs allers-retours.** Cocher une tâche ([`lib/tasks.ts:282`](../lib/tasks.ts#L282)) enchaîne :
  1. `supabase.auth.getUser()` (appel réseau au serveur d'authentification) ;
  2. la lecture de la tâche ;
  3. la lecture de `Profiles.lockPastDaysEnabled` ;
  4. la mise à jour.

  Sans réseau, rien ne fonctionne. Sur un réseau lent, chaque geste paraît lourd.
- **La logique est copiée.** La fonction `getUserId()` existe en trois exemplaires ([`lib/tasks.ts:45`](../lib/tasks.ts#L45), [`lib/daily.ts:51`](../lib/daily.ts#L51), [`lib/tags.ts:60`](../lib/tags.ts#L60)).

**Conséquence.** Avant toute fonctionnalité, il faut refaire la couche de données : une base locale (SQLite), puis une synchronisation optionnelle vers Supabase, réservée à Dun+. Ce chantier conditionne tout le reste de la roadmap.

---

## 3. Écarts avec la répartition gratuit / Dun+

| Point de l'offre | Code actuel | Où |
|---|---|---|
| Tâches datées **sans limite** | Limite de 6 tâches par jour en gratuit | [`lib/plan.ts:18`](../lib/plan.ts#L18), [`lib/useOptimisticTaskMutations.ts:166`](../lib/useOptimisticTaskMutations.ts#L166), `home.tsx` (`taskLimit`) |
| Box **gratuite** et sans limite | Box réservée au premium (`canUseTaskBox`) | `app/box.tsx`, `app/(tabs)/create-task.tsx`, `components/TaskItem.tsx`, `components/liquidCreateModal.tsx` |
| **5 tags** en gratuit ; après expiration, les tags existants restent actifs et modifiables | 2 tags ; les tags au-delà deviennent inactifs | [`lib/plan.ts:19`](../lib/plan.ts#L19), [`lib/tags.ts:89`](../lib/tags.ts#L89) (`getActiveTagIdsForPlan`) |
| Daily et verrouillage des jours passés **activables et désactivables en gratuit** | Désactivation réservée au premium, puis réactivation forcée par un `useEffect` | [`app/settings/index.tsx:129-202`](../app/settings/index.tsx#L129) |
| Rappel quotidien **week-end compris** en gratuit ; seules les répétitions sont Dun+ | Week-ends réservés au premium | `canUseNotificationWeekends` dans `app/settings/notifications.tsx` |
| À l'expiration, la palette et les dispositions déjà choisies **restent affichées** | Remise à zéro de la palette, du calendrier et de la progression | [`lib/usePremiumDowngradeCompliance.ts`](../lib/usePremiumDowngradeCompliance.ts), [`app/(tabs)/home.tsx:485-525`](../app/(tabs)/home.tsx#L485) |
| **Objectif** choisi à l'onboarding (1, 2, 3, 4, 7 ou 14 journées) | Choisi à l'écran mais jamais enregistré : seul le nom est sauvegardé | [`app/onboarding/tutorial.tsx:318`](../app/onboarding/tutorial.tsx#L318) |
| **Repos** neutre, avec date de fin incluse et sans effet rétroactif | Un booléen et une date de fin dans `Profiles`, sans historique : impossible de savoir après coup quels jours étaient en Repos | `Profiles.restMode` / `restEndDate`, `app/rest.tsx` |
| Statistiques qui tiennent compte du Repos | `isRestDay` teste 7 champs (`is_rest`, `isRest`, `rest_day`…) qui n'existent pas dans `Days`, donc le réglage `stats_include_rest` n'a aucun effet | [`lib/calculateStats.ts:58`](../lib/calculateStats.ts#L58) |
| La journée se clôt à **minuit** | Le Daily bascule à 4 h | [`lib/date.ts:2`](../lib/date.ts#L2) (`DAILY_ROLLOVER_HOUR`) |
| **Une seule règle de série** pour l'objectif et les statistiques ; journée vide ou incomplète qui rompt la série ; journée en cours provisoire | Deux implémentations distinctes, qui ignorent toutes deux le Repos et ne distinguent pas la journée vide | [`lib/daily.ts`](../lib/daily.ts) (`computeBaseStreak`), [`components/statsStreak.tsx`](../components/statsStreak.tsx) |
| Statistiques de la semaine en gratuit ; mois et année en Dun+ | Conforme dans l'esprit (`canUseAdvancedStats`), mais les périodes sont identifiées par des libellés français | [`lib/calculateStats.ts:1`](../lib/calculateStats.ts#L1) |
| Onglet **Profil / Mon système** (objectif, Daily, Repos, rappels, tags) | N'existe pas | — |
| Le serveur vérifie le droit Dun+ avant toute écriture cloud | Aucune vérification côté serveur | Schéma SQL |
| Synchronisation, restauration cloud et rétention de 90 jours | Rien de tout cela n'existe ; l'export et l'import manuels passent par Supabase et contiennent les tables `support_*` | `lib/exportData.ts`, `lib/importData.ts` |
| Pas de mode « premium obligatoire » | Restes à supprimer : `REQUIRE_PREMIUM_ACCESS`, `EXPO_PUBLIC_BETA_PREMIUM`, étape `trial` de l'onboarding | `lib/plan.ts`, `lib/subscription.tsx`, `app/_layout.tsx` (`PremiumAccessGate`), `components/onboarding/onboardingSteps.ts` |

Ce qui est déjà présent et réutilisable : thèmes clair, sombre et système, langue, taille du texte, calendrier en curseur ou en texte, progression linéaire ou circulaire, palettes, tags (3 maximum par tâche, avec un trigger SQL), rappels avec répétitions, paywall RevenueCat avec restauration des achats.

---

## 4. Architecture et code

### 4.1 Aucune couche métier
Les règles métier (verrouillage des jours passés, report, résolution des tâches en retard, calcul des journées) sont écrites au milieu des appels Supabase ([`lib/tasks.ts`](../lib/tasks.ts), 756 lignes) ou dans les écrans eux-mêmes. Douze écrans appellent `supabase` directement (`app/index.tsx`, `app/settings/*.tsx`, `app/onboarding/*.tsx`, `app/rest.tsx`…).

**Conséquences :**
- aucune règle ne peut être testée sans base de données ;
- une même règle est réécrite à plusieurs endroits ;
- changer de stockage (le chantier SQLite) oblige à toucher à presque tous les fichiers.

### 4.2 Écrans géants
| Fichier | Lignes |
|---|---|
| `app/onboarding/tutorial.tsx` | 1372 |
| `app/daily.tsx` | 1369 |
| `app/(tabs)/home.tsx` | 1195 |
| `components/popUpTask.tsx` | 1148 |
| `components/statsBarGraph.tsx` | 1142 |
| `app/settings/account.tsx` | 1066 |
| `components/calendar.tsx` | 975 |
| `components/TaskItem.tsx` | 914 |

Chacun mélange affichage, animations, état, accès aux données et règles métier. Au-delà d'environ 300 lignes, un fichier devient difficile à relire, à tester et à confier à un agent IA sans régression.

### 4.3 Contrôle d'accès premium éparpillé
`isPremium` ou un `canUse…` est testé dans une quinzaine de fichiers. Plusieurs `useEffect` écrivent en base pour « corriger » l'état quand l'utilisateur n'est pas premium :
- `app/settings/index.tsx:188-202` réactive le Daily et le verrouillage ;
- `app/(tabs)/home.tsx:485-525` remet le calendrier et la progression par défaut ;
- `lib/usePremiumDowngradeCompliance.ts` remet la palette et les rappels à zéro.

Ces écritures se déclenchent dès qu'un écran est monté. Elles sont invisibles à la lecture du code appelant, et elles détruisent les choix de l'utilisateur, ce que l'offre interdit. Il faut une seule table « fonction → droit » et une fonction `can(feature)`, sans écriture automatique.

### 4.4 Plusieurs sources de vérité
- **`Days` est calculé deux fois** : par un trigger SQL (`sync_days_after_tasks_change`) et côté client par [`syncDaySnapshot`](../lib/tasks.ts#L698).
- **Le trigger ne voit pas tous les changements.** Il ne se déclenche que sur `UPDATE OF user_id, date, done`, alors que la fonction appelée tient aussi compte de `late_adjusted_at`. Le compteur `late_adjusted_count` dépend donc de l'appel client qui le corrige après coup.
- **« Reporter » a deux sens.** [`resolveOverdueTask`](../lib/tasks.ts#L537) crée une copie de la tâche à la nouvelle date, alors que [`postponeDailyPendingTask`](../lib/daily.ts#L212) déplace la tâche d'origine. Les statistiques ne comptent pas la même chose selon l'écran utilisé.

### 4.5 Montée en charge
- [`fetchTaskList`](../lib/tasks.ts#L133) charge **toutes** les tâches de l'utilisateur, sans limite de date. Au bout d'un an d'utilisation quotidienne, c'est plusieurs milliers de lignes téléchargées à chaque rafraîchissement, puis filtrées en mémoire.
- [`normalizeTaskOrderForDate`](../lib/tasks.ts#L410) renumérote une journée avec **une requête par tâche**, l'une après l'autre.
- [`getNextTaskOrder`](../lib/tasks.ts#L201) lit toutes les tâches de la journée pour calculer un maximum. Deux créations rapprochées peuvent obtenir le même ordre.
- Le Daily recharge 365 jours d'historique pour calculer la série.

### 4.6 État dispersé
L'état de l'app est réparti entre :
- Zustand ([`store/store.ts`](../store/store.ts)) ;
- le cache React Query ;
- quatre contextes : `ThemeContext` (464 lignes), `FontContext`, `AuthSessionContext`, `createModalController` ;
- un `EventEmitter` maison ([`lib/eventEmitter.ts`](../lib/eventEmitter.ts)) qui émet `taskAdded` sans qu'aucun code ne l'écoute.

L'identifiant de l'utilisateur vit à la fois dans le store et dans le contexte. Pour chaque donnée, il est difficile de savoir quelle copie fait foi.

### 4.7 Typage
- 80 `any` ou `as any`.
- Les types de la base sont écrits à la main (`ProfilePreferencesRow` dans [`lib/profile.ts`](../lib/profile.ts)) au lieu d'être générés par `supabase gen types`. Ils ne suivent donc pas le schéma.
- `StatsPeriod` utilise des libellés français comme identifiants (`"Par semaine"`) : [`lib/calculateStats.ts:1`](../lib/calculateStats.ts#L1).
- Les heures et minutes de rappel sont stockées en texte (`alertSetupHour text`), d'où les `parseIntegerInput` partout.

### 4.8 Code mort et poids inutile
- **8 modules jamais importés** : `components/errorModal.tsx`, `components/statsStatut.tsx`, `components/progressBar.tsx`, `components/loading.tsx`, `components/createModal.tsx`, `components/popUpModal.tsx`, `components/checkboxAnimated.tsx`, `lib/useDailyScreen.ts`.
- **Fichiers parasites** : `test-swipe.tsx` à la racine et `build/config.gypi` suivi par Git.
- **Assets lourds** :
  - `assets/images/background/bg.svg` (32 Mo) et `bg.jpg` (2,7 Mo) ne sont pas utilisés ;
  - toute la famille Inter (20 Mo) est versionnée alors que 4 graisses servent.

  Metro n'embarque que ce qui est importé, mais le dépôt reste lourd à cloner.
- **Avertissements de lint** : 90, surtout des variables inutilisées et des dépendances de hooks manquantes.

### 4.9 Logs
- 119 `console.*`, dont 17 `console.log`. Ils partent en production, par exemple `"Informations de l'utilisateur mises à jour avec succès"` dans `app/settings/index.tsx`, ou le détail des offres RevenueCat dans `lib/subscription.tsx`.
- `Purchases.setLogLevel(LOG_LEVEL.DEBUG)` est toujours actif ([`lib/revenuecat.ts:34`](../lib/revenuecat.ts#L34)).

### 4.10 Conventions
- **Noms de fichiers sans règle commune** : `TaskItem.tsx`, `calendar.tsx`, `newProgressBar.tsx`, `popUpTask.tsx`. Côté routes, `app/settings/DataTransfer.tsx` et `ImportData.tsx` deviennent des URL en PascalCase.
- **Noms de tables et de colonnes mélangés** : tables en PascalCase entre guillemets (`"Tasks"`, `"Task_Tags"`) à côté de tables en snake_case (`support_issues`), et colonnes tantôt en camelCase (`"hasName"`, `"alertSetupHour"`), tantôt en snake_case (`display_theme`, `stats_include_today`).
- **Erreurs non traduites** : les messages d'erreur métier sont écrits en français en dur (`throw new Error("Tâche non trouvée")`), alors que l'app est bilingue.
- **Commentaire faux** : [`eslint.config.js`](../eslint.config.js) affirme que l'app n'est pas compilée avec React Compiler, alors que `app.json` active `reactCompiler: true`.
- **Noms obsolètes** : `newProgressBar`, `liquidCreateModal`, `create-task-v3`… Ces noms racontent l'historique au lieu de décrire le rôle.

### 4.11 Configuration
- **`tsc` échoue** : `tsconfig.json` inclut `supabase/functions` (code Deno), donc `tsc --noEmit` sort en erreur alors que le code de l'app est correct.
- **README périmé** : il annonce Expo 54, RN 0.81 et TypeScript 5.9, décrit une arborescence qui n'existe plus (`create-task.tsx`, `navbar.tsx`) et une table `Days` « historique journalier ».
- **Script hérité du template** : `reset-project` ne sert pas.
- **Correctif non documenté** : `postinstall` modifie un fichier d'Expo (`scripts/fix-expo-macros-plugin.js`) sans explication. Il cassera en silence lors d'une mise à jour.
- **Configuration Android inutile** : elle est conservée alors que la V1 sort sur iPhone seulement.
- **`eas.json` minimal** : pas de profil `development`, pas de variables d'environnement par profil.

---

## 5. Base de données et sécurité

### 5.1 Fonctions `SECURITY DEFINER` trop ouvertes
Ces fonctions s'exécutent avec les droits du propriétaire et contournent la RLS. Or elles sont accordées à `anon`, c'est-à-dire à n'importe qui possédant la clé publique de l'app :

| Fonction | Risque |
|---|---|
| `email_exists(email)` | Permet de tester si un email a un compte (énumération) |
| `refresh_day_from_tasks(p_user_id, p_date)` | Accepte n'importe quel `user_id` : on peut réécrire ou supprimer les lignes `Days` d'un autre utilisateur |
| `consume_beta_rate_limit(identifier, …)` | Permet d'épuiser le quota d'un autre identifiant, donc de bloquer ses inscriptions à la bêta |
| `delete_account()` | Accordée à `anon` (protégée par `auth.uid()`, mais inutilement exposée) |

`refresh_day_from_tasks` et `sync_days_after_tasks_change` n'ont pas de `search_path` figé, ce qui est une faiblesse connue des fonctions `SECURITY DEFINER`.

### 5.2 Règles et droits
- La règle d'insertion de `Profiles` est `WITH CHECK (true)` (ligne 732 de la migration). N'importe quel utilisateur connecté peut créer un profil portant l'identifiant d'un autre.
- `GRANT ALL` est accordé à `anon` sur toutes les tables. La RLS protège les lignes, mais il n'y a pas de seconde ligne de défense.
- Aucune vérification du droit Dun+ côté serveur : un client modifié peut écrire tout ce qu'il veut dans ses propres lignes.

### 5.3 Schéma trop permissif
- `Tasks.name`, `Tasks.done` et `Tasks.user_id` acceptent NULL.
- `Days.user_id` a pour valeur par défaut `gen_random_uuid()` : une ligne insérée sans utilisateur reçoit un propriétaire inventé.
- `Tasks.date` est un `timestamp without time zone` (valeur par défaut `now()`), alors que `Days.date` est une `date`. Les comparaisons mélangent les deux (`gte`/`lt` sur des chaînes de date).
- `Tasks.user_id` référence `Profiles` sans `ON DELETE CASCADE`, alors que `Tags` référence `auth.users` avec cascade.
- Les tables `support_issues*` et `Beta` partagent la base de l'app sans être utilisées par celle-ci.

### 5.4 Suppression de compte
[`deleteUserAccount`](../lib/supabase.ts) supprime les tâches, les jours, puis le profil en trois appels client séparés, puis appelle la RPC `delete_account`, qui refait exactement la même chose. Si un appel échoue au milieu, le compte reste à moitié supprimé. Les tags et liaisons de tags ne sont supprimés que grâce à la cascade de `auth.users`.

### 5.5 Migrations et environnements
- La migration de base est un export brut du schéma distant (`20260630143004_remote_schema.sql`, 1223 lignes dont plusieurs centaines de lignes vides). Il n'y a ni seed, ni base locale (`supabase start`) documentée.
- Le passage entre dev et prod se fait en commentant des lignes du `.env`.

### 5.6 Secrets
- `.env` et `.env.local` ne sont pas suivis par Git. C'est correct.
- En revanche, les commits `1e20054` et `8ff5dc7` (« Codex worktree snapshot: archive-cleanup »), présents dans la base locale mais sur aucune branche, contiennent un `.env` avec le **secret client Google OAuth** (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`). Il faut vérifier qu'ils n'ont jamais été poussés ; dans le doute, régénérer ce secret dans Google Cloud.
- `.env.local` contient un `SENTRY_AUTH_TOKEN`. C'est correct tant qu'il ne quitte pas la machine ; en CI, il doit passer par les secrets EAS ou GitHub.

---

## 6. Qualité, outillage et workflow

- **Aucun test.** Aucune règle métier (série, verrouillage, report, statistiques) n'est vérifiée automatiquement. C'est la cause directe des allers-retours visibles dans l'historique.
- **Aucune CI suivie par Git.** Les fichiers `.github/workflows/quality.yml` et `.nvmrc`, non suivis, viennent d'une tentative précédente : ils appellent `npm run quality`, `npm run test:ci` et un dossier `tests/` qui n'existent pas. Il faut les supprimer ou les réécrire.
- **Pas de formatage automatique.** Il n'y a pas de Prettier : l'indentation varie d'un fichier à l'autre (2 ou 4 espaces, guillemets simples ou doubles).
- **Historique peu lisible.** Il compte 305 commits. Les messages sont disparates (`[fix]` 59 fois, `fix` 30 fois, `new`, `implementing`, `adding`, `restart`) et 25 commits de merge s'y mêlent.
- **Branches abandonnées.** Il y a 38 branches locales, dont 23 `codex/*` jamais supprimées après fusion, et une branche distante `ia`.
- **Workflow avec l'IA.**
  - **Constat.** Des tâches Codex ont été lancées en parallèle sur des branches courtes, sans spécification écrite ni tests. L'historique en garde la trace : « rollback », « back to freemium version », « restart ».
  - **Cause.** Ce n'est pas l'usage de l'IA qui pose problème, c'est l'absence de règles écrites que l'agent puisse respecter et vérifier.
  - **Ce qui manque.** L'offre commerciale règle désormais la question côté produit. Il manque son pendant technique : des règles métier codées et testées, un `AGENTS.md` et une CI qui refuse ce qui casse.

---

## 7. Ce qui manque pour une V1 publiable

1. **Une base locale** qui sert de source de vérité, et une app utilisable sans compte ni réseau.
2. **Un noyau métier pur et testé** : journée, série, objectif et Repos.
3. **Une table unique des droits gratuit / Dun+**, et un comportement à l'expiration conforme à l'offre.
4. **La persistance de l'objectif et un historique des périodes de Repos.**
5. **Une synchronisation cloud** réservée à Dun+, vérifiée côté serveur (webhook RevenueCat), avec une rétention de 90 jours puis une purge.
6. **Une suppression de compte atomique côté serveur.**
7. **Des tests** (unitaires et de bout en bout) et une **CI**.
8. **Des environnements dev et prod séparés**, des profils EAS et des releases Sentry avec sourcemaps.
9. **Un README, un AGENTS.md et des conventions écrites.**
10. **L'accessibilité** (Dynamic Type, VoiceOver) et une fiche App Store alignée sur les fonctions réellement livrées.
