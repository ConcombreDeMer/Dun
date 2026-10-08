# Contrat de données V1 — PROD-007 / DUN-047

Statut : contrat préparatoire, 01/10/2026. Référence métier : [product-v1.md](product-v1.md) et section 12 de `ROADMAP_PRODUCTION.md`. Types : `lib/contracts/data-v1.ts` ; validation de snapshots : `lib/contracts/validate-v1.ts` ; exemples exécutables : `tests/contracts/`. Aucun module de ce dossier n'est utilisé par l'app actuelle. Aucun stockage, migration ou synchronisation n'est implémenté ici.

## 1. Identité et propriété

Un **espace** est une copie de travail isolée. `spaceId` UUID v4 généré localement est distinct de l'identifiant Auth. Il porte une génération UUID et une liaison locale `ownerId` nullable. L'espace invité a un propriétaire local ; un espace lié est accessible uniquement avec l'identité correspondante. Le serveur déduit le propriétaire du jeton vérifié et de sa propre table de liaison ; jamais de l'export ni d'un `user_id` fourni comme preuve.

Connexion : retrouver l'espace du compte ou en créer un séparé. Ne pas réassigner silencieusement l'espace invité. Un transfert explicite sélectionne source et destination, montre l'aperçu puis réutilise le protocole de remplacement. La source est conservée jusqu'au succès vérifié ; aucune suppression automatique. Les IDs métier sont conservés et les clés de base sont composites `(space_id, id)` pour permettre une copie dans un autre espace sans mélange. Une relation ne traverse jamais un espace.

Déconnexion : masquer l'espace du compte, vider les caches éphémères et suspendre son journal, sans supprimer ses données. Suppression explicite du compte : état durable de suppression, arrêt des envois, opération serveur récupérable, puis effacement local de cet espace après confirmation ; une réponse perdue doit pouvoir être reconnue. Les autres espaces restent intacts. Un appareil hors ligne apprend la suppression à sa prochaine vérification ; aucun journal ancien ne la ressuscite.

## 2. Formats et champs communs

| Champ / format | Sens, autorité, cycle de vie |
|---|---|
| `id`, `spaceId` | UUID canoniques en minuscules, stables, produits localement ; aucun changement lors d'un retry. UUID existants valides acceptés ; nouveaux IDs en v4. Uniques dans un snapshot, relations dans le même espace |
| `createdAt` | Instant UTC de création conservé lors du report de métadonnées/export ; une nouvelle tâche reportée a son propre ID et instant |
| `updatedAt` | Instant UTC local de dernière mutation, diagnostic/affichage ; ne départage jamais les conflits. Ne recule pas avant `createdAt` si horloge corrigée |
| `deletedAt` | Null si vivant ; instant UTC si marque de suppression. Ce marqueur est transporté, distinct de `resolution` |
| `serverRevision` | Null avant ACK ; entier décimal sérialisé en chaîne (pas de perte bigint). Attribué par le serveur ; valeur importée informative, jamais reprise comme ACK |
| `DateKey` | Date grégorienne valide `YYYY-MM-DD`, année 0001–9999 ; pas de conversion implicite UTC/local |
| `Instant` | ISO UTC exact `YYYY-MM-DDTHH:mm:ss.sssZ`. Horloge injectée dans les futurs services ; aucune comparaison date/instant |
| `generation` | Jeton d'époque de l'espace cloud ; serveur autoritaire. Changement lors d'un remplacement/purge/recréation ; ancien appareil doit se rebaser explicitement |

Les chaînes de contenu restent Unicode sans troncature ni normalisation silencieuse. Les limites techniques de taille/volume seront explicites et mesurées dans PROD-012/015 ; aucun quota commercial caché. Le validateur actuel est destiné aux fixtures, **pas encore un lecteur de fichiers non fiables en production** : taille avant parsing, budget mémoire, profondeur JSON et coût des chaînes de reports doivent être bornés dans PROD-012.

## 3. Dictionnaire des entités

Tous les champs des types sont obligatoires dans le format V1 ; `null` exprime une absence connue, pas un champ manquant. Une version inconnue est rejetée avant toute écriture.

| Entité et champs spécifiques | Donnée persistée / relations / cycle |
|---|---|
| `Task.name`, `description` | Texte utilisateur, export/sync, aucun contenu dans les logs |
| `Task.day` | Date d'une `Day` de l'espace ou null pour Box ; clé maintenue lors des voyages |
| `Task.order` | Entier sûr ≥0 dans la liste date/Box. Tri total `(order, id)` pour départager les collisions hors ligne ; normalisation dans une transaction de réordonnancement |
| `Task.done`, `completedAt` | État canonique de complétion ; date présente si et seulement si terminée |
| `Task.resolution`, `resolvedAt` | Décision Daily : `deleted`, `postponed`, `late_completed`, `ignored`, ou null ; les deux champs présents ensemble. Une résolution passée n'est pas automatiquement une suppression physique |
| `Task.carriedFromId`, `delayCount` | Lien au parent du report et entier ≥0 ; chaîne acyclique, parent conservé même supprimé logiquement. Ni relation à un index de tableau ni correspondance par ordre de réponse |
| `Task.lateAdjustedAt` | Trace canonique d'ajustement tardif, nullable ; les agrégats en dérivent |
| `Task.tagIds` | Liste unique de 0–3 IDs de tags ; une tâche vivante ne référence pas un tag supprimé. Localement, table de liaison avec FK composite ; sur le réseau/export, partie du même agrégat que la tâche |
| `Tag.name`, `color` | Texte et clé de couleur. Tous les tags existants restent utilisables après expiration ; seuil de 5 testé lors d'une nouvelle création, pas à la lecture/import |
| `Day.date`, `timeZone` | Clé civile unique par espace, fuseau IANA de référence à l'enregistrement. UUID technique pour sync ; unicité supplémentaire `(spaceId,date)` |
| `Day.closedAt` | Null tant qu'ouverte, sinon instant du minuit acquis. Fermeture irréversible même lors d'un voyage ou d'un retry ; un snapshot ne prouve pas à lui seul la transition |
| `Day.isRest` | Vérité datée pour cette journée ; gelée après clôture. Ne se recalcule pas depuis le seul Repos courant |
| `Day.dailyReviewedAt` | Marque durable de revue Daily, indépendante de `closedAt`. La revue peut suivre la clôture |
| `RestPeriod.startDate`, `endDate`, `activatedAt`, `cancelledAt` | Intention de Repos datée, fin incluse ; historique d'activation/annulation. Appliquer aux jours ouverts/futurs seulement. Les statuts des jours clos font foi |
| `Objective.target`, `confirmedAt`, `startDate` | Une cible 1/2/3/4/7/14 et premier jour éligible, mêmes tâches éligibles toute la journée de confirmation. Null avant choix initial ; jamais de cible inventée |
| `Objective.firstAchievedAt`, `firstAchievedDate` | Événement historique indivisible, nullable avant réussite ; date close depuis début de l'objectif. Une modification passée ne le supprime pas. Pas de nouvelle cible V1 |
| `Preferences.displayName`, `onboardingCompletedAt` | Nom privé et progression durable de l'onboarding ; email/identifiants Auth restent séparés |
| `dailyEnabled`, `lockPastDaysEnabled` | Booléens indépendants, gratuits ; aucune influence sur la règle de série |
| `language`, `theme`, `textSize`, `palette`, `calendar`, `progress`, `stackCompletedTasks` | Préférences durables ; enum du contrat pour les dispositions ; palette acquise préservée. Table de conversion des anciennes valeurs dans le futur adaptateur |
| `statsVisibility.today/future/empty/rest` | Préférences de visibilité uniquement ; n'altèrent ni objectif ni dénominateurs métier |
| `reminders.enabled/hour/minute/weekdays` | Heure locale, jours ISO 1=lundi à 7=dimanche, liste unique ; liste vide = aucun jour programmé |
| `reminders.repetitionsEnabled/repetitions/delayMinutes` | Intention conservée à expiration ; nombre 1–3, délai 15–240 min. L'état effectif dépend du droit, du Repos et du minuit |

Journées, objectif et préférences ne sont pas des enregistrements supprimables isolément par l'utilisateur V1. Remplacement d'espace et suppression de compte suivent leurs propres transactions. Une édition ancienne peut modifier les tâches et les agrégats, mais ne retire ni clôture, ni statut de Repos clos, ni première réussite historique.

## 4. Canonique, dérivé et propre à l'appareil

**Canonique exportable/synchronisable :** tâches et leurs liens, tags, dates/clôtures/Repos journaliers, périodes de Repos, objectif et première réussite, préférences, ordre, traces et suppressions utiles. L'export inclut la provenance (espace/propriétaire/génération) mais ne lui donne aucune autorité à la restauration.

**Dérivé, recalculable :** série actuelle, taux, charge, jours parfaits, compteurs, projections de calendrier et état effectif des rappels. Les anciens `Days.total/done_count/late_adjusted_count` deviennent des projections, pas une deuxième vérité importable. Une projection locale peut être mise en cache avec version de calcul et invalidation ; elle n'est ni exportée comme canonique ni synchronisée indépendamment.

**Persisté uniquement sur appareil :** liaison espace/session autorisée, espace sélectionné, `deviceId`, file sortante et séquence, ACK, curseur, étapes de remplacement, IDs de notifications iOS, permissions système, cache de droit lié à l'identité et sa dernière échéance vérifiée. Ne jamais restaurer ces informations à partir d'un fichier utilisateur. Un snapshot de réparation interne peut les conserver séparément pour reprendre la même opération ; ce n'est pas un export partageable.

**Éphémère :** modales, gestes, sélection provisoire, cache React Query, état UI Zustand. Aucun succès durable fondé seulement sur ces valeurs.

**Hors snapshot de productivité :** sessions, secrets, justificatifs RevenueCat, données Beta/support du site, diagnostics et sauvegardes d'exploitation. Leur périmètre/rétention reste PROD-024/026 ; le support existant ne doit pas être effacé par une restauration de productivité.

## 5. Contrat des opérations et transactions futures

| Opération | Ensemble atomique | Échec / reprise |
|---|---|---|
| Création | Tâche + journée si nécessaire + relations + ordre + opération sortante | Rien visible comme enregistré avant commit ; même ID au retry |
| Report | Résolution source + nouvelle tâche/ID + lien parent + copie de tags + ordre + journal | Source jamais résolue seule ; aucune tâche cible dupliquée |
| Association / suppression tag | Ensemble des liens concernés + version tâche + tag/suppression + journal | Pas d'état transitoire sans tags exposé ; suppression détache les tâches vivantes atomiquement |
| Réordonnancement | Positions complètes de la liste concernée + journal groupé | Échec laisse l'ordre antérieur ; collisions départagées par ID avant prochain ordre explicite |
| Finalisation Daily | Décisions de toutes les tâches traitées + marque de revue + journal | Le marqueur n'est jamais écrit avant les décisions |
| Clôture / Repos | Journées concernées + intention Repos + première réussite éventuelle + journal | Garde sur jour clos ; idempotent au retour au premier plan |
| Pull | Page valide + versions + checkpoint | Si interruption, ni données partielles ni curseur avancé seul |
| Remplacement | Nouvel ensemble canonique + génération locale de restauration + commande sortante de remplacement | Ancien ensemble et sauvegarde disponibles si échec avant commit |

Le moteur PROD-008 décidera les clôtures avec une horloge et un fuseau injectables : prochain minuit civil, y compris jours de 23/25 heures. Il matérialisera les jours vides nécessaires entre début de l'objectif et aujourd'hui (série interrompue hors Repos). Pas de précréation infinie de journées. Les lectures distinguent absence, indisponibilité et corruption.

## 6. Export et remplacement sûr

Format JSON `dun-productivity`, `formatVersion=1`, instant d'export, provenance puis collections canoniques. Tous les objets sont validés ; les champs inconnus sont rejetés afin de ne pas accepter silencieusement des secrets, états dérivés ou futures versions. Les exemples de `tests/contracts/fixtures.ts` servent de spécification exécutable.

Export futur : lire une transaction snapshot cohérente, vérifier comptes et relations, sérialiser sans changer IDs/ordre/timestamps, puis partager. Aucune pagination réseau implicite. Nettoyage du fichier temporaire dans PROD-012 avec recette iPhone.

Remplacement futur :

1. Lire avec limite technique explicite, identifier version, valider entièrement et produire aperçu. Tout défaut = aucune écriture, aucune relation silencieusement omise.
2. Choisir l'espace cible et confirmer le remplacement et sa propagation cloud éventuelle. L'identité du fichier ne peut choisir cet espace ni authentifier son propriétaire.
3. Écrire une sauvegarde de réparation vérifiée de la destination et un état durable `prepared` avec ID d'opération ; si sauvegarde impossible, abandonner sans mutation.
4. Construire et valider en staging les données rebornées vers l'espace cible ; conserver IDs métier et liens ; effacer les révisions serveur importées, ne pas importer de curseur/ACK/droit. Aucun mélange avec le contenu remplacé.
5. Transaction locale de remplacement + état `committed` + commande de remplacement durable. Invalidations UI et reprogrammation des notifications seulement après commit.
6. Si droit cloud vérifié : envoyer le remplacement comme une opération serveur atomique avec génération attendue. Sinon conserver en attente. Staging distant possible par lots mais activation finale atomique après validation ; aucun autre appareil ne voit un demi-remplacement.
7. Retirer l'état pending seulement après ACK durable. Une réponse perdue rejoue le même ID et reçoit le même résultat. Les appareils anciens récupèrent la nouvelle génération avant tout nouvel envoi.

Un crash entre 3 et 5 conserve l'ancien espace ; entre 5 et 7 retrouve le nouvel espace et la commande en attente. Une nouvelle tentative utilisateur n'est pas un retry automatique : nouvel aperçu/confirmation et nouvel ID. Les réparations internes sont conservées tant que l'opération n'est pas acquittée ou que l'utilisateur n'a pas confirmé la réparation ; après réussite vérifiée, une seule copie de récupération remplaçable reste explicitement visible. La politique de durée/nettoyage et de stockage plein sera arrêtée dans PROD-012, sans conservation cachée illimitée.

## 7. Synchronisation et conflits

Chaque opération porte ID, espace, génération, appareil, séquence locale et instant de diagnostic. Les changements d'un report/Daily/réordonnancement forment un lot atomique. Le serveur valide Auth, propriétaire, génération et entitlement avant commit. Il attribue un ordre monotone de réception **acceptée**, pas l'horodatage du téléphone. Aucun ACK sur échec de validation.

Granularité : tâche entière avec ses tags ; autres entités individuellement, en respectant les transactions ci-dessus. Une édition ne fusionne pas les champs silencieusement. Sur suppression/modification concurrentes, la dernière action distincte validée gagne (Q04), donc une nouvelle édition peut rétablir une tâche supprimée ; un simple retry ancien ne peut pas la rétablir. Restaurer une version précédente est une nouvelle action explicite, validée et journalisée.

Une suppression de tag détache les associations atomiquement ; une modification de tâche référençant un tag désormais supprimé est refusée avec conflit de dépendance, jamais amputée silencieusement. La version antérieure conserve de quoi montrer les tags historiques et demander une restauration explicite si nécessaire.

Les règles monotones ont priorité sur une simple réécriture de snapshot : `Day.closedAt` ne redevient pas null ; date et Repos clos restent acquis ; première réussite historique ne disparaît pas lors d'une édition. Un conflit entre premières réussites conserve l'événement déjà accepté par le serveur et garde l'autre version récupérable ; le moteur recalcule séparément la série courante.

| Scénario | Résultat contractuel |
|---|---|
| A modifie op-1, B supprime op-2 reçue ensuite | Tâche supprimée ; version op-1 récupérable 7 jours |
| Réponse op-1 perdue, A rejoue op-1 après op-2 | ACK original, aucun nouveau changement, suppression conservée |
| A crée une nouvelle édition op-3 reçue après op-2 | Tâche rétablie si références et invariants valides ; version supprimée conservée |
| Pull interrompu après écriture de lignes avant curseur | Transaction annulée ; même page redemandée puis commit complet |
| Expiration pendant un envoi | Refus sans perte locale ; file conservée jusqu'à vérification/réabonnement |
| Purge puis ancien appareil renvoie une ancienne génération | Refus `generation_mismatch`, récupération/transfert explicite ; pas de recréation silencieuse |
| Remplacement concurrent d'un autre remplacement | Comparer génération attendue ; refuser le second devenu périmé et refaire aperçu/confirmation |

Les tombstones nécessaires à la convergence ne suivent pas le délai des versions de contenu. Après 7 jours, expurger le contenu des versions remplacées mais conserver un marqueur technique minimal (ID/génération/révision), sans titre ni description, tant que la génération existe. Les IDs de déduplication restent pour cette génération ; supprimer ces informations exige d'invalider la génération et les anciens curseurs. Purge cloud ou suppression du compte retire contenu et marqueurs de productivité ; contrôle de liaison/autorisation empêche ensuite les anciennes opérations d'être acceptées.

Versions : 7×24 h UTC depuis `replacedAt` serveur. Copie expirée : 90×24 h UTC depuis fin effective du droit. Intervalle `[début, échéance)`. Inconnu → différer purge et refuser nouvelles écritures jusqu'à vérification. Détails commerciaux dans `product-v1.md` ; sauvegardes d'exploitation ne doivent pas ressusciter ce contenu.

## 8. Passage depuis le modèle actuel et réparation

| Existant | Cible / traitement |
|---|---|
| `Tasks.id` bigint / `carried_from_id` | UUID + mapping persistant `(sourceProject, sourceUser, table, legacyIdText) → UUID` si import ancien nécessaire. Rejeter un nombre JS non sûr plutôt que l'arrondir |
| `Tags.id` UUID / `Task_Tags` | Préserver UUID valides et relations explicites ; vérifier propriétaire et maximum 3. Ne pas deviner par position |
| `Tasks.date` timestamp sans fuseau | Conversion uniquement selon provenance documentée ; si ambiguë, bloquer/présenter réparation, pas supposer UTC |
| `Days` agrégats | Recalcul depuis tâches ; les agrégats anciens ne prouvent ni Repos ni fermeture |
| `Profiles` | Séparer identité, préférences locales et données par appareil ; convertir valeurs de présentation explicitement |
| `hasDoneDaily`, `last_opened` | Ne pas inventer une revue pour chaque jour ancien ; mapping documenté selon preuve disponible |
| `restMode`, `restEndDate` | Intention actuelle seulement ; aucun historique de Repos inventé |
| Objectif absent | Choix neuf avec date persistée, sans reconstruire une cible passée |
| Export ancien sans version | Détecter séparément ; adaptateur dédié seulement si besoin réel, après validation complète. Pas accepté comme V1 par ce validateur |

Q01 : aucun chantier de migration clientèle maintenant. Cette table conserve le chemin de compatibilité et protège les fixtures/tests existants. Pas de reset des données de test.

Migrations SQLite futures (PROD-010) : table de version de schéma, sauvegarde préalable vérifiée, transaction, garde idempotente et checkpoint. Une migration interrompue se relance ou restaure une copie compatible ; une version de schéma plus récente arrête les écritures avec message, jamais un effacement automatique. Ne pas promettre un downgrade de base : réparation additive ou restauration explicite du snapshot compatible. PROD-012 traite séparément versions de fichiers et migration du schéma.

Réparation : détecter doublons, orphelins, cycles, données invalides ; conserver une copie de diagnostic locale avant action destructive ; rejet explicite ou choix utilisateur, aucune correction silencieuse amputant des données. Recalculer les caches puis comparer totaux/relations canoniques. Les tests de vraies transactions interrompues, espace disque plein, iPhone et RLS restent dans leurs lots d'implémentation.

## 9. Preuves et portée

`npm run test:ci -- tests/contracts` vérifie les exemples création/Box/report/suppression/Repos/réussite/restauration, le round-trip JSON et les rejets structurels/relationnels sans mutation. Les scénarios réseau/transactionnels de la section 7 sont des critères pour PROD-010/012/015/016, **pas un moteur de sync simulé présenté comme preuve réelle**.

Le contrat est utilisable pour PROD-008/009. Limites encore ouvertes sans bloquer ces lots : limites de payload et politique des copies de réparation (012), réglages RevenueCat réels (013), rétention diagnostics/sauvegardes (024/026), preuve du runtime serveur et tests RLS (004/014), second appareil (016/027).
