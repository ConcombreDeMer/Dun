# DUN-047 — Contrat des données locales V1

**État : contrat et plan de migration revus le 25 septembre 2026 ; DUN-047 terminé.** Ce document définit la cible de DUN-037/048, pas un schéma déjà déployé. La [matrice commerciale V1](../ROADMAP.md) prévaut sur les limites présentes dans le code : tâches et Box illimitées, 5 créations de tags en gratuit, Daily/verrouillage/Repos/objectif disponibles à tous, export et restauration locaux gratuits. La synchronisation seule dépend de Dun+ ; une expiration ne supprime jamais SQLite. Les routines de DUN-053 sont hors V1.

## Périmètre et invariants

- Une base SQLite par installation, avec un `workspace` actif. Son UUID est l'identité stable de l'ensemble de données, même si l'utilisateur crée un compte plus tard. Un compte Supabase peut être lié à ce workspace ; changer de compte sélectionne un autre workspace ou exige un choix explicite de restauration, jamais une fusion implicite.
- SQLite est la source immédiatement lue par les parcours. Une opération métier réussit quand sa transaction locale a été validée. Le réseau ne conditionne pas la réussite locale. Une erreur de disque ou de migration empêche l'affichage d'un succès et laisse une erreur réessayable.
- UUID v4 générés sur l'appareil pour `workspace`, tâche, tag, objectif et mutation. Les IDs numériques historiques Supabase restent dans une table de correspondance, jamais utilisés comme nouveaux IDs. Une relation ne traverse pas deux workspaces. Les suppressions métier produisent des tombstones conservées pour export/synchronisation ; leur purge attend une politique de convergence prouvée.
- `date_key` est un texte `YYYY-MM-DD` validé comme date civile. Un instant est un entier UTC en millisecondes depuis epoch. Aucun `Date.parse` d'une clé civile et aucune comparaison directe entre clé et timestamp. La **nouvelle** clé du jour suit le fuseau IANA actuel de l'iPhone ; une clé déjà enregistrée ne change jamais lors d'un voyage. Enregistrer les changements de fuseau observés pour expliquer les bornes et la reprise sur un autre appareil.
- Toutes les écritures métier, y compris rangs, relations, marqueurs Daily, repos et entrée du journal de synchro, sont dans **une** transaction SQLite. `PRAGMA foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout` et contrôle d'intégrité au démarrage. Les règles de droit sont évaluées au service métier, avec contrôle serveur séparé pour toute écriture cloud Dun+.

## Inventaire des accès actuels et écarts

| Domaine | Lectures actuelles | Écritures actuelles et risque pour la bascule |
| --- | --- | --- |
| Tâches / Box | `lib/taskRepository.ts` centralise la lecture complète partagée par l'accueil et la Box ; `lib/daily.ts:getDailyData` lit aussi les tâches. La liste entière est encore chargée. | `lib/tasks.ts` crée, modifie, reporte, supprime et finalise ; `lib/daily.ts` traite les retards ; `lib/taskOrderRepository.ts` écrit les rangs Supabase ligne par ligne. Création puis tags, report puis copie de tags, normalisation puis mise à jour de `Days` ne sont pas atomiques. |
| Tags / relations | `lib/tags.ts` lit `Tags` et `Task_Tags`, dont la jointure de statistiques. | `lib/tags.ts` crée/modifie/supprime et remplace les relations par delete puis insert ; le plafond actuel et l'activation alphabétique après expiration contredisent la V1. Conserver 3 tags maximum par tâche, refuser l'opération entière si cette limite est dépassée. |
| Days / statistiques | `lib/daily.ts`, `app/(tabs)/stats/index.tsx` et `lib/calculateStats.ts` lisent les agrégats `Days`; Daily et stats ont deux calculs de série distincts. | `lib/tasks.ts:syncDaySnapshot` écrit `Days` tandis que le trigger SQL les recalcule aussi. Les erreurs de lecture des tâches remontent désormais dans l'accueil et la Box ; les stats peuvent encore présenter une erreur comme un résultat vide. Les `Days` locaux seront dérivés des tâches et du repos, avec une seule fonction de série. |
| Profil / Daily | `lib/profile.ts`, `lib/useDailyScreen.ts`, `lib/useStatsPreferences.ts`, thèmes, police, langue, notifications, `app/index.tsx` et plusieurs écrans lisent `Profiles`. `store/store.ts` garde seulement des états UI volatils. | `lib/dailyRepository.ts` centralise l'ouverture du Daily ; `lib/profile.ts:useUpdateProfile`, `lib/daily.ts`, `app/daily.tsx`, `app/settings/index.tsx`, notifications, accueil, onboarding/login, contextes thème/police/langue et `lib/usePremiumDowngradeCompliance.ts` écrivent encore directement ou indirectement `Profiles`. `last_opened` + `hasDoneDaily` ne donnent aucun historique. AsyncStorage conserve actuellement langue, thème, taille de police et IDs de notifications : les préférences métier doivent rejoindre SQLite, les IDs OS restent un état technique reconstructible. |
| Repos / objectif | `Profiles.restMode` et `restEndDate` sont lus dans `lib/useDailyScreen.ts` et via `lib/restRepository.ts` depuis l'écran Repos. L'onboarding affiche les cibles 1/2/3/4/7/14 via `components/onboarding/onboardingSteps.ts`. | `lib/restRepository.ts` centralise activation, prolongation, annulation et expiration de l'ancien Repos. Ni historique de repos ni cible/début d'objectif ne sont persistés : `app/onboarding/tutorial.tsx` ne sauve que le nom. Ne pas inventer ces valeurs à l'import historique. |
| Export / import / compte | `lib/exportData.ts` lit huit tables Supabase, sans version ni pagination vérifiée ; le support est distinct des données locales métier. | `lib/importData.ts:replaceUserDataFromImport` efface puis réinsère en appels distants successifs, remappe les IDs et peut perdre des relations. `lib/supabase.ts` efface des données avant `delete_account`. Le nouvel export/restauration local ne réutilise pas cette procédure destructive. |

`lib/date.ts:getTodayAppDateKey` basculait déjà à minuit alors que `toDailyDateKey` appliquait un décalage ; les tâches et le Daily pouvaient diverger après minuit. Le helper Daily a été aligné sur minuit le 25 septembre 2026. DUN-013 doit encore vérifier les requêtes, les écrans et les cas limites sur iPhone. Les clés React Query actuelles (`["profile", userId]`, tâches, tags, `days`) et les états Zustand ne sont pas un stockage. DUN-037 remplacera `userId` par `workspaceId` dans les clés locales, invalidera les plages touchées après commit, puis utilisera la relecture SQLite comme vérité. Un brouillon optimiste doit être annulé si la transaction échoue ; aucun état UI « sauvé » avant validation.

## Schéma SQLite cible (migration locale `001_init.sql`)

Ce DDL décrit les colonnes métier. L'implémentation peut répartir les index/triggers dans la même migration, mais ne doit pas affaiblir les clés ou les contraintes. Les booléens sont des entiers 0/1. Les préférences sont des colonnes typées, pas un JSON opaque, pour permettre validation et migration. `updated_at_ms` avance pour chaque mutation métier, `created_at_ms` ne change jamais.

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY, checksum TEXT NOT NULL,
  applied_at_ms INTEGER NOT NULL
);
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY, current_timezone TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','locked'))
);
CREATE TABLE timezone_events (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  timezone TEXT NOT NULL, observed_at_ms INTEGER NOT NULL,
  local_day_key TEXT NOT NULL,
  UNIQUE(workspace_id,observed_at_ms)
);
CREATE TABLE profile (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  name TEXT, has_name INTEGER NOT NULL DEFAULT 0 CHECK(has_name IN (0,1)),
  has_seen_tutorial INTEGER NOT NULL DEFAULT 0 CHECK(has_seen_tutorial IN (0,1)),
  daily_enabled INTEGER NOT NULL DEFAULT 1 CHECK(daily_enabled IN (0,1)),
  lock_past_days INTEGER NOT NULL DEFAULT 1 CHECK(lock_past_days IN (0,1)),
  reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK(reminder_enabled IN (0,1)),
  reminder_hour INTEGER NOT NULL DEFAULT 8 CHECK(reminder_hour BETWEEN 0 AND 23),
  reminder_minute INTEGER NOT NULL DEFAULT 0 CHECK(reminder_minute BETWEEN 0 AND 59),
  reminder_weekends INTEGER NOT NULL DEFAULT 1 CHECK(reminder_weekends IN (0,1)),
  repeat_enabled INTEGER NOT NULL DEFAULT 0 CHECK(repeat_enabled IN (0,1)),
  repeat_delay_min INTEGER NOT NULL DEFAULT 30 CHECK(repeat_delay_min > 0),
  repeat_count INTEGER NOT NULL DEFAULT 1 CHECK(repeat_count >= 0),
  display_theme TEXT NOT NULL DEFAULT 'system', display_color TEXT NOT NULL DEFAULT 'neutre',
  display_font TEXT NOT NULL DEFAULT 'medium', language TEXT NOT NULL DEFAULT '',
  custom_calendar INTEGER NOT NULL DEFAULT 1, custom_progressbar INTEGER NOT NULL DEFAULT 1,
  stack_completed_tasks INTEGER NOT NULL DEFAULT 0 CHECK(stack_completed_tasks IN (0,1)),
  stats_include_today INTEGER NOT NULL DEFAULT 0, stats_include_following INTEGER NOT NULL DEFAULT 0,
  stats_include_empty INTEGER NOT NULL DEFAULT 0, stats_include_rest INTEGER NOT NULL DEFAULT 0,
  last_opened_day_key TEXT, last_closed_day_key TEXT,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE tasks (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0), description TEXT NOT NULL DEFAULT '',
  date_key TEXT, position INTEGER NOT NULL CHECK(position >= 0),
  done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
  created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER, resolved_at_ms INTEGER,
  resolution TEXT CHECK(resolution IN ('deleted','postponed','late_completed','ignored')),
  carried_from_id TEXT, delay_count INTEGER NOT NULL DEFAULT 0 CHECK(delay_count >= 0),
  late_adjusted_at_ms INTEGER, deleted_at_ms INTEGER,
  UNIQUE(workspace_id,id),
  FOREIGN KEY(workspace_id,carried_from_id) REFERENCES tasks(workspace_id,id)
);
CREATE INDEX tasks_by_day ON tasks(workspace_id,date_key,position,id);
CREATE INDEX tasks_box ON tasks(workspace_id,position,id) WHERE date_key IS NULL;
CREATE TABLE tags (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0), color TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL, deleted_at_ms INTEGER,
  UNIQUE(workspace_id,id)
);
CREATE UNIQUE INDEX tags_active_name ON tags(workspace_id,name COLLATE NOCASE)
  WHERE deleted_at_ms IS NULL;
CREATE TABLE task_tags (
  workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, tag_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL, deleted_at_ms INTEGER,
  PRIMARY KEY(workspace_id,task_id,tag_id),
  FOREIGN KEY(workspace_id,task_id) REFERENCES tasks(workspace_id,id),
  FOREIGN KEY(workspace_id,tag_id) REFERENCES tags(workspace_id,id)
);
CREATE INDEX task_tags_by_tag ON task_tags(workspace_id,tag_id,task_id);
CREATE TABLE daily_reviews (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), day_key TEXT NOT NULL,
  opened_at_ms INTEGER, completed_at_ms INTEGER, updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY(workspace_id,day_key)
);
CREATE TABLE rest_days (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), day_key TEXT NOT NULL,
  recorded_at_ms INTEGER NOT NULL, revoked_at_ms INTEGER, updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY(workspace_id,day_key)
);
CREATE TABLE goals (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  target_days INTEGER NOT NULL CHECK(target_days IN (1,2,3,4,7,14)),
  started_at_ms INTEGER NOT NULL, first_eligible_day_key TEXT NOT NULL,
  first_achieved_day_key TEXT, first_achieved_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL,
  deleted_at_ms INTEGER,
  CHECK((first_achieved_day_key IS NULL) = (first_achieved_at_ms IS NULL)),
  UNIQUE(workspace_id,id)
);
CREATE UNIQUE INDEX one_active_first_goal ON goals(workspace_id) WHERE deleted_at_ms IS NULL;
CREATE TABLE legacy_ids (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), source_user_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK(entity IN ('task','tag')),
  remote_id TEXT NOT NULL, local_id TEXT NOT NULL,
  PRIMARY KEY(workspace_id,source_user_id,entity,remote_id),
  UNIQUE(workspace_id,entity,local_id)
);
CREATE TABLE outbox (
  op_id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL,
  payload_version INTEGER NOT NULL, base_revision TEXT,
  payload_json TEXT NOT NULL, created_at_ms INTEGER NOT NULL,
  sent_at_ms INTEGER
);
CREATE INDEX outbox_pending ON outbox(workspace_id,created_at_ms,op_id) WHERE sent_at_ms IS NULL;
CREATE TABLE cloud_links (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id), auth_user_id TEXT NOT NULL UNIQUE,
  sync_cursor TEXT, linked_at_ms INTEGER NOT NULL
);
CREATE TRIGGER task_tags_limit_insert BEFORE INSERT ON task_tags
WHEN NEW.deleted_at_ms IS NULL
BEGIN
  SELECT RAISE(ABORT,'tag parent deleted') WHERE
    EXISTS (SELECT 1 FROM tasks WHERE workspace_id=NEW.workspace_id AND id=NEW.task_id AND deleted_at_ms IS NOT NULL)
    OR EXISTS (SELECT 1 FROM tags WHERE workspace_id=NEW.workspace_id AND id=NEW.tag_id AND deleted_at_ms IS NOT NULL);
  SELECT RAISE(ABORT,'three tags per task') WHERE
    (SELECT count(*) FROM task_tags WHERE workspace_id=NEW.workspace_id
      AND task_id=NEW.task_id AND deleted_at_ms IS NULL) >= 3;
END;
CREATE TRIGGER task_tags_limit_update BEFORE UPDATE OF deleted_at_ms,task_id,tag_id ON task_tags
WHEN NEW.deleted_at_ms IS NULL
BEGIN
  SELECT RAISE(ABORT,'tag parent deleted') WHERE
    EXISTS (SELECT 1 FROM tasks WHERE workspace_id=NEW.workspace_id AND id=NEW.task_id AND deleted_at_ms IS NOT NULL)
    OR EXISTS (SELECT 1 FROM tags WHERE workspace_id=NEW.workspace_id AND id=NEW.tag_id AND deleted_at_ms IS NOT NULL);
  SELECT RAISE(ABORT,'three tags per task') WHERE
    (SELECT count(*) FROM task_tags WHERE workspace_id=NEW.workspace_id
      AND task_id=NEW.task_id AND deleted_at_ms IS NULL
      AND NOT (tag_id=OLD.tag_id AND task_id=OLD.task_id)) >= 3;
END;
```

Valider en code les clés civiles avec parse strict + aller retour calendrier, les timestamps entiers et la zone IANA. Les triggers refusent une quatrième relation active ou un parent supprimé ; les clés composites interdisent un parent d'un autre workspace. La suppression logique d'une tâche ou d'un tag marque ses relations dans **la même transaction**. Une position peut avoir des trous pendant une ancienne migration, puis une normalisation transactionnelle donne `0..n-1` par jour ou Box. Les tris sont `(position,id)`. Les champs nullable de résolution restent fidèles au modèle historique ; un `deleted_at_ms` retire la tâche des lectures ordinaires, et `resolution='deleted'` est également exclue des agrégats de performance, tout en restant exportée.

`Days` n'est **pas** une table d'autorité locale. Une requête de plage produit `day_key, total, done_count, late_adjusted_count, is_rest` à partir des tâches actives et de `rest_days`. Une éventuelle table cache `day_summaries` est purement dérivée, reconstruite après migration, restauration ou modification passée, et absente de l'export. Les jours vides sont générés par la règle de calendrier de la période demandée. Une tâche Box n'appartient à aucun jour. Les compteurs bruts de tâches terminées sur un jour de repos restent consultables, mais ce jour est exclu des taux, de la charge moyenne et des jours parfaits.

## Journée à minuit, repos et premier objectif

La journée de clé `D` est l'intervalle civil semi-ouvert `[D 00:00, D+1 00:00)` dans le fuseau de l'iPhone au moment où cette journée est vécue. `23:59` appartient à `D`, `00:00` au jour suivant. Aux changements d'heure, calculer les bornes à partir des dates civiles dans le fuseau, jamais par addition de 24 h en UTC : si minuit est ambigu, prendre la **dernière** occurrence ; s'il n'existe pas, prendre le premier instant valide suivant. Une journée peut donc durer 23 ou 25 heures. Lorsqu'un nouveau fuseau est observé, écrire `timezone_events` et la nouvelle `current_timezone` ensemble, puis utiliser le fuseau de l'iPhone pour les **nouvelles** clés. Les tâches, repos, revues et réussites déjà enregistrés gardent leur `day_key`. `last_closed_day_key` avance de façon monotone : un voyage vers l'ouest ne rouvre pas un jour clos ; si la date de l'iPhone recule sur une clé déjà close, l'écran montre cette date comme historique jusqu'à ce qu'une nouvelle clé s'ouvre. DUN-013 doit vérifier explicitement ce parcours et les journées sautées pendant un voyage.

Le repos commence sur la journée produit **ouverte** au moment de la confirmation, même si elle a commencé avant l'action ; ceci est une pause explicite de cette journée entière pour les indicateurs. La date de fin choisie est **inclusive** en clés de journée produit : « jusqu'au 28 » couvre aussi le 28. Enregistrer une ligne par clé de la journée courante jusqu'à cette fin, dans une transaction ; prolonger par upsert idempotent. Refuser toute insertion/révocation portant sur une clé déjà close, y compris après import ou synchro. Annuler le repos avant minuit marque `revoked_at_ms` pour le jour courant et les jours futurs : le jour courant redevient normal pour l'objectif et les statistiques, sans modifier les jours clos. `restMode`/`restEndDate` deviennent un affichage dérivé des lignes actives. Un jour de repos clos est neutre pour la série, même si des tâches y ont été terminées ; il n'incrémente pas, ne casse pas et ne compte pas dans les dénominateurs.

À la confirmation de l'onboarding, écrire en une transaction le profil et l'objectif choisi. `started_at_ms` est l'instant réel de confirmation et `first_eligible_day_key` est la date civile **de cette confirmation** dans le fuseau de l'iPhone. Le jour peut compter s'il se clôt à 100 %, même si certaines tâches du même jour ont été créées ou terminées avant la confirmation. Aucun jour civil antérieur ne compte ; le jour en cours reste provisoire jusqu'à minuit.

Pour chaque clé close de `[first_eligible_day_key, clé courante)`, classification unique : `rest` si repos actif, sinon `perfect` si au moins une tâche datée active et **toutes** sont `done`, sinon `broken` (vide ou incomplète). Parcourir les clés dans l'ordre : `rest` laisse le compteur, `perfect` ajoute 1, `broken` remet à zéro. La série courante est ce compteur à la fin de la dernière clé close ; les statistiques appellent la même fonction. À la première fois où le compteur atteint la cible, enregistrer `first_achieved_day_key` et l'instant de constatation `first_achieved_at_ms` dans la même transaction que le changement de tâches ou au recalcul au démarrage ; ne jamais reculer ni effacer cet événement. La série courante reste recalculable après une édition passée autorisée, y compris pour une tâche reportée ou supprimée. L'événement de première réussite est un jalon historique : une correction ultérieure peut changer la série affichée sans inventer une nouvelle « première » réussite. Si la preuve de cette réussite manque lors d'un import ancien, laisser `NULL` ; aucune cible par défaut n'est inventée.

Le Daily est indépendant : `daily_reviews` conserve ouverture et finalisation par clé, même si le réglage Daily est ensuite désactivé. Le passage à la nouvelle clé n'efface pas la veille et ne modifie pas les tâches à lui seul. Une revue terminée est idempotente ; traitement des retards, copie/report et marqueur de fin se valident ensemble. `last_opened_day_key` pilote seulement la navigation. Le verrouillage des jours passés est une règle de modification des tâches, pas une règle de calcul de série ; le repos rétroactif reste interdit même si ce verrou est désactivé.

## Migrations, ancien compte et reprise

1. DUN-037 pose les interfaces de dépôt et fait passer les écritures des écrans par une seule façade, sans changer encore la source. DUN-048 ajoute la migration `001_init.sql` et bascule les lectures/écritures par parcours limité. La migration tourne avant le rendu des écrans, dans une transaction `BEGIN IMMEDIATE`; enregistrer version, checksum et date avec le DDL. Refuser une version future ou un checksum changé, montrer une erreur avec possibilité d'export/assistance ; ne jamais recréer silencieusement la base. Une migration ultérieure est `002_...sql` append only, avec test sur base vierge et sur copie de chaque version précédente.
2. Pour un compte existant (DUN-049), créer d'abord un workspace local lié au `auth_user_id` validé. Lire les tables distantes par pages ordonnées et avec totaux contrôlés. Pour chaque tâche numérique, enregistrer `legacy_ids` ; préserver les UUID de tags s'ils sont valides et non conflictuels, sinon conserver aussi leur correspondance. `Days.id` n'a pas d'équivalent métier local : conserver son total dans le rapport d'import, puis recalculer les jours depuis les tâches. Importer parents, tâches, tags, relations, puis préférences dans une transaction par lot avec état de progression durable ; relancer un lot par upsert sur la clé distante. Ne jamais interpréter une page vide après erreur réseau comme fin. Après la dernière page, comparer les totaux de chaque table, les relations orphelines et les agrégats recalculés ; seulement alors choisir SQLite comme source immédiate et cesser les anciennes écritures cloud directes.
3. `Profiles.last_opened` et `hasDoneDaily` ne permettent de reconstruire qu'au plus la revue de cette clé, si cohérente. `restMode` et `restEndDate` ne prouvent pas les jours passés : ne pas créer d'historique rétroactif ; demander une nouvelle confirmation pour les jours encore ouverts. Le choix de cible n'existe pas dans Supabase : **demander un choix d'objectif neuf** et commencer à sa nouvelle confirmation, sans valeur arbitraire. Conserver les dates, statuts, ordre, `carried_from_id`, timestamps et relations des tâches. Les dates historiques SQL `timestamp without time zone` doivent être converties selon une règle documentée après inspection des valeurs réelles ; ne pas leur ajouter `Z` aveuglément. Quarantainer les lignes ambiguës et proposer une réparation vérifiable.
4. Avant migration ou restauration, produire une copie locale vérifiée de la base ou un export complet dans un emplacement distinct. Si une migration échoue, rollback et réouverture de l'ancienne version en lecture seule ; ne pas supprimer la copie. Après validation, `PRAGMA foreign_key_check`, `integrity_check`, comptages et comparaison de contrôles de somme ; l'UI n'annonce la réussite qu'après ces contrôles. Un crash pendant transaction laisse l'état précédent ; un crash après commit laisse un marqueur de progression permettant une reprise idempotente. Tout échec d'une étape cloud garde la base locale exploitable et la synchronisation en attente.

## Export et restauration locale (DUN-011/035)

Format JSON versionné `dun-local-export/v1` : `format`, `schema_version`, `exported_at_ms`, `workspace_id`, `current_timezone`, `counts`, `sha256` du contenu canonique hors ce champ, puis `profile`, `timezone_events`, `tasks`, `tags`, `task_tags`, `daily_reviews`, `rest_days`, `goals` et tombstones avec IDs et timestamps stables. `legacy_ids` est inclus pour une restauration du même ensemble déjà importé ; `outbox`, curseur, identifiants RevenueCat, jetons d'authentification, IDs de notifications OS et caches dérivés ne le sont pas. Le fichier peut contenir des données sensibles : partager explicitement, conserver un fichier temporaire le moins longtemps possible et l'effacer après le flux de partage ; ne pas journaliser son contenu.

L'export prend un snapshot SQLite cohérent, compte toutes les lignes par table dans ce même snapshot (tombstones comprises), écrit vers un nom temporaire, relit/valide taille + hash + comptages, puis renomme atomiquement avant partage. Un fichier incomplet n'est jamais présenté comme export. La restauration lit sous limite de taille définie et testée, vérifie version, types, dates, valeurs, UUID, unicité, 3 tags max, relations et hash **avant** toute écriture. Elle montre le workspace cible et les totaux, crée une copie de secours, puis remplace le workspace choisi dans une seule transaction ou importe dans un nouveau workspace isolé. Sur échec, rollback intégral et conservation de la copie initiale. Un export lié à un autre `auth_user_id` ne s'attache jamais automatiquement au compte courant. Restaurer deux fois le même fichier doit produire les mêmes lignes/IDs, sans doublon ; l'outbox sera reconstruite en opérations idempotentes si un cloud est ensuite activé.

L'ancien format `UserDataExport` Supabase n'est pas ce format. Son éventuelle conversion passe par le même validateur et la même table `legacy_ids`; elle n'appelle jamais `replaceUserDataFromImport`. Le support (`support_issues`, commentaires, votes) n'est pas dans le workspace de productivité local ; son export de compte, si requis, reste une procédure séparée de DUN-011.

## Données nécessaires à la synchronisation Dun+ (DUN-050/041/052)

Chaque transaction locale ajoute dans `outbox` une mutation avec UUID d'opération, entité/ID stable, version de payload, révision serveur de base et contenu suffisant pour un rejeu idempotent. Les tombstones de tâche, tag, relation, objectif et repos ainsi que l'historique des fuseaux observés sont synchronisés ; un téléchargement ne peut pas ressusciter une suppression plus récente ou reclasser une date passée. Le serveur doit stocker `(workspace_id, entity_id, revision, deleted_at)` et dédupliquer `op_id`, puis fournir un curseur monotone et une capture initiale paginée. Les relations et références sont appliquées après leurs parents. Pour une collision de modifications, conserver localement la version refusée et l'état serveur dans un journal de conflit récupérable ; ne jamais écraser silencieusement. Définir la résolution par champ/entité et la tester sur deux iPhone dans DUN-050 avant d'activer la synchro.

L'activation du cloud lie `workspace_id` à un compte authentifié et à l'identité RevenueCat vérifiée côté serveur. Les droits de création de tags et de répétitions s'appliquent aux **nouvelles actions** ; les tags existants et les choix visuels restent. À la fin **effective** de l'entitlement, l'outbox continue à enregistrer le travail local mais aucun envoi cloud n'est autorisé. La copie serveur reste en lecture seule 90 jours, puis DUN-052 la purge après une nouvelle vérification du droit ; la base et les tombstones locales restent. Une reprise avant purge réconcilie le curseur et les mutations sans doublon. Les RLS/RPC et le service serveur doivent empêcher un client gratuit de fabriquer des écritures cloud, y compris en appelant directement Supabase.

## Confrontation aux migrations Supabase et DUN-003

Les trois fichiers versionnés présents sont `20260630143004_remote_schema.sql`, `20260706120000_stats_query_indexes.sql` et `20260709120000_add_lock_past_days_preference.sql`. Le tableau ci-dessous décrit **leurs définitions**. La vérification distante partielle du 25 septembre 2026 est consignée après le tableau.

| Source distante versionnée | Correspondance / écart local |
| --- | --- |
| `Tasks.id` et `Days.id` sont `bigint` identity ; `Tags.id` est UUID ; `Profiles.id` est l'UUID auth. `Task_Tags` a `(task_id,tag_id)` pour PK ; `Tasks.carried_from_id` référence la tâche précédente. | UUID locaux pour toutes les entités ; `legacy_ids` conserve les clés anciennes et `carried_from_id` est remappé. `Days` est recalculé et son ID ne devient pas une identité métier. |
| `Tasks.date` est `timestamp without time zone`, `Days.date` est `date`, `Tasks.created_at` n'a pas de fuseau tandis que plusieurs autres timestamps en ont un. | Clé civile + instants UTC distincts ; conversion historique à auditer sur des valeurs réelles. Les jours Box restent `NULL`. |
| `Profiles` contient préférences, Daily (`last_opened`, `hasDoneDaily`) et repos (`restMode`, `restEndDate`), mais ni cible/début d'objectif ni historique de repos. La dernière migration ajoute `lockPastDaysEnabled`. | `profile`, `daily_reviews`, `rest_days`, `goals` séparés. L'historique absent ne peut pas être reconstruit. |
| `Days` est unique par `(user_id,date)` et recalculé par `refresh_day_from_tasks`. Le trigger `tasks_sync_days_trigger` ne porte que sur `user_id,date,done`, alors que sa fonction traite aussi `late_adjusted_at`. | Agrégats locaux dérivés après toute mutation ; l'écart du trigger laisse potentiellement des compteurs distants faux (DUN-007). Recalculer avant comparaison/migration. |
| `Tags` est unique par `(user_id,name)` ; `check_task_tags_limit` limite les relations à 3. Index de plage sur `Tasks`, `Days` et `Task_Tags` dans la migration suivante. | Conserver la limite de 3, normaliser la casse pour nouveaux noms sans perdre les tags anciens ; vérifier les collisions à l'import. Lire SQLite par plages indexées. |
| RLS des tables cœur lie surtout `user_id` à `auth.uid()`. `Profiles` a une policy INSERT `WITH CHECK (true)` ; aucune colonne/contrôle d'entitlement cloud n'apparaît ici. | DUN-005/041 doivent corriger et tester les politiques côté serveur. Une vérification client ne suffit pas. |

La commande `supabase migration list --linked` avait échoué le 24 septembre 2026 avec `LegacyPlatformAuthRequiredError: Access token not provided`. Le 25 septembre, le connecteur Supabase a permis de confirmer que l'URL **active** de `.env` et le lien local pointent tous deux sur le projet actif « Dun Prod » (`znljjqikmmcvacpkvbvs`) ; les autres références présentes dans des commentaires de `.env` ne sont pas la configuration active. Le projet distant enregistre les trois versions de migration ci-dessus, et `list_tables` y montre les dix tables publiques correspondantes, toutes avec RLS activé. Les colonnes cœur visibles incluent `Tasks.date`/`created_at` sans fuseau, `Days.date`, `Tasks.late_adjusted_at` et `Profiles.lockPastDaysEnabled`. Ces lectures ne prouvent pas l'identité complète du DDL ni l'efficacité des règles RLS.

Les requêtes SQL en lecture seule visant les politiques, fonctions, triggers et index ont été refusées lors de cette vérification ; aucune donnée de tâche ou de compte n'a été lue et aucune écriture distante n'a été faite. **DUN-003 reste ouvert.** Il faut encore comparer un catalogue ou dump du schéma réellement utilisé aux fichiers pour les contraintes, index, triggers, fonctions, vues, grants et politiques ; vérifier particulièrement le trigger lié à `late_adjusted_at`, la policy INSERT `Profiles`, les droits des fonctions privilégiées et les dépendances de `delete_account`. Il faut ensuite convertir tout écart en migration versionnée, rejouer les migrations sur une base vierge, puis tester `anon`, compte A/B et la comparaison de schéma. Aucun changement distant manuel n'est prescrit par ce document.

## Cas d'échec à démontrer avant bascule

| Cas | Résultat attendu / reprise |
| --- | --- |
| Disque plein, FK ou validation échouée au milieu de création + tags, report + copie, réordre, Daily ou repos | Rollback intégral, aucune réussite visuelle, relecture SQLite ; même `op_id` rejoué au besoin. |
| Crash pendant une migration, un lot d'import ou une restauration | Base précédente/copie intacte ou transaction entièrement validée ; relance depuis marqueur durable, sans doublon. |
| Export interrompu ou fichier corrompu/ancien/trop grand | Aucun fichier présenté comme valide ; restauration refusée avant écriture, données initiales intactes. |
| Fuseau de l'appareil changé, 23:59/00:00, passage heure été/hiver | Nouvelles clés dans le fuseau de l'iPhone, clés passées immuables ; aucun jour clos rouvert ni repos rétroactif ; bornes sans addition de 24 h. |
| Édition d'une ancienne tâche, journée vide, repos avec tâches, journée en cours à 100 % | Recalcul commun objectif/stats ; journée en cours exclue, repos neutre, vide casse la série. |
| Réseau coupé, droit Dun+ expiré, webhook en retard, conflit multi-appareil | Mutation locale et outbox conservées ; aucune écriture cloud hors droit ; reprise/déduplication et conflit récupérable. |

## Revue du critère de sortie DUN-047

Le schéma, les identifiants/relations, les migrations, l'objectif, le repos, les journées, les données dérivées, l'effacement, l'export et la restauration sont **spécifiés** ici et confrontés au code ainsi qu'aux trois migrations versionnées. La revue technique du 25 septembre a vérifié le DDL dans SQLite (13 tables, clés étrangères intègres, quatrième tag refusé), les accès réels des écrans et les scénarios de reprise ci-dessus. Les décisions produit sur minuit, le jour de confirmation, le fuseau mobile, le Repos du jour ouvert, sa date de fin inclusive, son annulation et le nouvel objectif des comptes existants sont confirmées. Le critère de DUN-047, **schéma et plan de migration revus avant toute bascule d'écran**, est satisfait : aucune bascule SQLite n'a encore eu lieu. Les tests de comportement sur iPhone et l'implémentation de la migration appartiennent à DUN-013 et DUN-048. DUN-003 reste nécessaire à la validation de l'import distant et du cloud ; seul un inventaire distant partiel est désormais vérifié.

**Premiers changements limités DUN-037 réalisés :** `TaskOrderRepository` et son adaptateur Supabase centralisent les deux boucles d'écriture de rang auparavant présentes dans l'accueil et la Box. `TaskRepository` centralise leur lecture complète et leur clé React Query commune ; une erreur de chargement apparaît avec un réessai au lieu de devenir une liste vide. `RestRepository` centralise les opérations de Repos de l'ancien profil et vérifie qu'une ligne a réellement été mise à jour. `DailyRepository` centralise l'ouverture du Daily ; une écriture échouée ne route plus vers le Daily comme si elle avait réussi. Les caches sont relus après un échec de réordonnancement, car les écritures Supabase successives peuvent avoir été partiellement appliquées. Le prochain lot ajoute de vraies lectures `listByDateRange` et `listBox` avec des caches adaptés, puis les autres mutations métier ; la bascule SQLite du réordonnancement attend une transaction et un test d'échec intermédiaire. DUN-037 reste ouvert tant que d'autres écritures de tâches, tags, profil et Daily résident dans les composants.
