# Roadmap de mise en production de Dun

> État initial : 23 septembre 2026. Cible : première sortie publique **iOS**. Priorités : **fiabilité des données**, puis **vitesse de livraison**. Android et web sont hors du périmètre de cette première sortie.

Cette roadmap est une liste de contrôle. Cocher une tâche uniquement quand son **critère de sortie** est vérifié et qu'une preuve est liée à la PR ou à la fiche de release. Une compilation réussie ne suffit pas à valider un parcours utilisateur. La refonte locale décidée pour la V1 précède la sortie ; garder les autres changements limités au périmètre nécessaire.

**Source de vérité produit :** la section « Matrice commerciale décidée pour la V1 publique » et la politique cloud qui la suit. Les tableaux précédents sont un inventaire du code actuel et des propositions abandonnées ; ils ne prescrivent pas la V1.

## Règles de suivi

- Une PR traite un problème principal. Elle contient le contexte, le changement, le risque, la manière de tester et, pour une migration, le plan de retour ou de réparation.
- Une tâche est terminée quand son code, ses tests pertinents et sa vérification sur la cible indiquée sont terminés.
- Garder un journal de release avec : commit, version, numéro de build, environnement Supabase, configuration RevenueCat, identifiant du build EAS, état TestFlight, résultats des tests et décisions de publication.
- Toute anomalie qui menace l'intégrité des données, l'authentification, le paiement ou la suppression du compte bloque la sortie. Les améliorations visuelles mineures peuvent attendre.

## Phase 0 — Figer le contrat de la première version

**Objectif :** éviter de tester et publier des règles produit différentes de celles voulues.

- [ ] **DUN-001 — Finaliser le modèle commercial iOS V1.** Le choix **version gratuite + abonnement Dun+**, la **refonte locale avant publication** et la **Box entièrement gratuite** sont actés. La matrice V1 ci-dessous fixe les limites et les droits ; **les routines et tâches récurrentes sont reportées à la première mise à jour** et absentes du paywall de lancement. Préparer la migration des comptes déjà présents et vérifier la politique cloud de DUN-052. Fixer `EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS=false` pour le build public. **Sortie :** spécification utilisable pour les tests, paywall et textes alignés sur les fonctions livrées.
- [ ] **DUN-002 — Fixer les drapeaux de production.** Désactiver `EXPO_PUBLIC_BETA_PREMIUM` dans le build public ; confirmer les valeurs des variables `EXPO_PUBLIC_*` dans l'environnement EAS et l'absence de secret serveur dans le bundle. **Sortie :** configuration de release relue, valeurs non secrètes consignées dans le journal.
- [ ] **DUN-003 — Établir la vérité du schéma.** Comparer `supabase/migrations` avec la base Supabase réellement utilisée par l'app ; relever toute modification faite dans le tableau de bord et la convertir en migration versionnée. **Sortie :** migrations rejouables sur une base vierge et liste des écarts résolue.
- [ ] **DUN-004 — Geler le périmètre fonctionnel V1.** iOS seulement. **Retirer l'import destructif actuel** et le remplacer avant la sortie par la restauration locale sûre de DUN-035. Conserver l'export uniquement après DUN-011. Si un nouveau module premium est retenu dans DUN-001, décrire son parcours et ses critères d'acceptation avant de coder. **Sortie :** écrans et documentation cohérents avec les fonctions réellement livrées.

### Arbitrages produit encore bloquants

| Priorité | Décision à prendre | Proposition pour avancer | Tâches concernées |
| --- | --- | --- | --- |
| 1 | Comment migrer les comptes Supabase existants vers l'app locale ? | Import idempotent sans doublon, comparaison des totaux, reprise après interruption ; proposer de définir un objectif neuf sans inventer l'ancien choix non sauvegardé. | DUN-049, DUN-051, DUN-054 |
| 2 | Que montre la carte après la première réussite ? | Garder la première réussite acquise comme événement daté ; afficher séparément la série courante, recalculée après modification des tâches. Décider si la configuration d'un autre objectif appartient à la V1. | DUN-054, DUN-055 |
| 3 | Quel périmètre exact pour la première mise à jour des routines ? | Spécifier après la V1 les règles de récurrence, exceptions, occurrences et comportement après expiration, puis annoncer une date seulement après estimation. | DUN-053 |

### Inventaire commercial actuel — base de discussion pour DUN-001

Relevé du code au **24 septembre 2026**, sans validation sur un build iOS ni sur la configuration distante RevenueCat. Ce tableau décrit le comportement prévu par l'application **si `EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS=false`** (valeur par défaut) et **si `EXPO_PUBLIC_BETA_PREMIUM` est désactivé**. Il ne constitue pas encore la décision commerciale V1.

| Domaine | Fonctionnalité | Gratuit aujourd'hui | Dun+ aujourd'hui | Nuance à conserver pour la décision V1 |
| --- | --- | --- | --- | --- |
| Accès | Utiliser l'app après inscription et onboarding | Oui | Oui | Si `EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS=true`, le paywall bloque l'app sans premium après l'onboarding. |
| Tâches | Créer des tâches datées | Jusqu'à **6 par journée** | Sans limite prévue | Le contrôle des 6 tâches est dans un chemin de création côté app ; il n'est pas garanti par Supabase. Les tâches déjà créées restent conservées. |
| Tâches | Voir le calendrier et l'historique ; consulter, modifier, terminer, reporter, supprimer et réordonner des tâches | Oui | Oui | Les jours passés sont verrouillés en gratuit ; voir la ligne dédiée. |
| Tâches | Ajouter un nom, une description et une date à une tâche | Oui | Oui | La Box est traitée séparément. |
| Tags | Créer des tags | Jusqu'à **2** | Sans limite prévue | Limite appliquée dans l'écran de gestion, pas par une règle serveur de forfait. |
| Tags | Associer des tags à une tâche | Parmi les **2 tags actifs** ; **3 tags maximum par tâche** | Tous les tags ; **3 tags maximum par tâche** | La limite de 3 par tâche est commune aux deux offres et a un trigger SQL. |
| Tags | Après expiration, conserver les tags supplémentaires | Oui, mais inactifs pour les nouvelles associations | Tous actifs | Les 2 tags actifs sont les premiers **par ordre alphabétique** ; les autres restent consultables, modifiables, supprimables ou désassignables. |
| Box | Ajouter des tâches sans date, les déplacer vers la Box et organiser la Box | Non | Oui | Après expiration, un compte gratuit peut encore voir ses anciennes tâches Box, les dater ou les supprimer ; il ne peut plus en ajouter ni les réordonner. |
| Daily | Faire la revue quotidienne et traiter les tâches non résolues | Oui | Oui | La revue quotidienne est imposée en gratuit. |
| Daily | Désactiver la revue quotidienne | Non | Oui | Le réglage est réactivé lors du retour au gratuit. |
| Journées passées | Désactiver le verrouillage des jours passés | Non | Oui | En gratuit, le verrouillage est activé ou rétabli ; les actions sur le passé dépendent de ce réglage. |
| Repos | Activer et prolonger le mode repos | Non dans le parcours normal | Oui | Le contrôle est surtout dans l'entrée des réglages ; les écritures sur `Profiles` ne vérifient pas le droit premium. |
| Statistiques | Résumé hebdomadaire, série de jours, tâches terminées, jours parfaits, taux de complétion et charge | Oui | Oui | Les préférences d'affichage des statistiques sont accessibles aux deux offres. |
| Statistiques | Périodes mensuelle et annuelle, graphique détaillé, usage des tags | Non | Oui | Le menu visible propose semaine, mois et année. |
| Statistiques | Indicateur des ajustements tardifs | Non | Oui, si le verrouillage des jours passés est actif | Cette mesure disparaît aussi en premium quand le verrouillage est désactivé. |
| Notifications | Rappel quotidien à une heure choisie | Oui, les jours de semaine | Oui | Sous réserve de l'autorisation iOS ; l'accueil peut reprogrammer avec des valeurs par défaut, voir DUN-012. |
| Notifications | Répétitions du rappel, avec délai et nombre paramétrables | Non | Oui | Les préférences sont désactivées après expiration. |
| Notifications | Rappels le week-end | Non | Oui | Les préférences sont désactivées après expiration ; la reprogrammation depuis l'accueil peut contredire ce réglage. |
| Apparence | Mode clair, sombre ou système ; taille du texte ; français ou anglais | Oui | Oui | Ces options ne dépendent pas de l'abonnement. |
| Apparence | Couleur neutre | Oui | Oui | La couleur revient au neutre après expiration. |
| Apparence | Autres palettes de couleurs | Non | Oui | L'écran de sélection renvoie au paywall en gratuit. |
| Apparence | Calendrier en curseur et barre de progression linéaire | Oui | Oui | Options par défaut. |
| Apparence | Calendrier en texte et barre de progression circulaire | Non | Oui | Options rétablies aux valeurs gratuites après expiration. |
| Données | Exporter ses données | Oui | Oui | La roadmap demande de fiabiliser l'export avant la V1 (DUN-011). |
| Données | Importer un fichier en remplaçant les données | Oui, avec avertissement | Oui | **Présent dans le code actuel**, mais la roadmap prévoit de retirer cet import dangereux de la V1 (DUN-004, 009, 010). |
| Compte | Inscription, connexion, profil, gestion et suppression du compte | Oui | Oui | Aucun avantage premium identifié dans ces parcours. |
| Abonnement | Acheter, restaurer et gérer Dun+ | Achat et restauration disponibles | Statut et gestion disponibles | Offres mensuelle et annuelle lues dans RevenueCat ; l'accès repose sur l'entitlement `dun_plus`. |

**Points commerciaux à trancher avant d'approuver DUN-001 :**

- Choisir entre accès gratuit limité et abonnement obligatoire. `EXPO_PUBLIC_BETA_PREMIUM=true` accorde actuellement Dun+ à tout le monde, même sans achat ; ce drapeau doit être désactivé pour un test représentatif de la V1.
- Définir le sort des données et préférences créées en premium après expiration, notamment Box, tags, calendrier, couleurs, Daily et jours passés. Le tableau décrit la logique actuelle, pas une promesse produit approuvée.
- Vérifier les offres réelles dans RevenueCat et App Store Connect. Le paywall affiche des prix issus des produits, mais annonce en dur **« essai 14j »** et **« -40 % »** : ces textes ne prouvent ni la durée ni la remise effectivement configurées.
- Définir si les quotas et droits doivent être opposables côté serveur. Les limites de tâches, de tags et plusieurs réglages premium reposent aujourd'hui sur le client ; la base ne connaît pas l'entitlement RevenueCat.

**Sources principales :** [`lib/plan.ts`](lib/plan.ts), [`lib/subscription.tsx`](lib/subscription.tsx), [`app/_layout.tsx`](app/_layout.tsx), [`lib/useOptimisticTaskMutations.ts`](lib/useOptimisticTaskMutations.ts), [`lib/tags.ts`](lib/tags.ts), [`app/settings/index.tsx`](app/settings/index.tsx), [`app/settings/notifications.tsx`](app/settings/notifications.tsx), [`app/(tabs)/stats/index.tsx`](<app/(tabs)/stats/index.tsx>), [`app/settings/display.tsx`](app/settings/display.tsx), [`app/settings/DataTransfer.tsx`](app/settings/DataTransfer.tsx), [`app/settings/ImportData.tsx`](app/settings/ImportData.tsx), [`app/settings/premium.tsx`](app/settings/premium.tsx).

### Proposition initiale de répartition V1 — écartée en l'état

**Historique de discussion :** la version gratuite permettait de construire et d'utiliser un système de productivité personnel complet ; Dun+ ajoutait surtout les analyses détaillées. Le porteur du projet a écarté cette répartition en l'état : coût potentiel des comptes gratuits hébergés et bénéfice Dun+ trop étroit. **Ne pas implémenter le tableau suivant sans nouvelle décision.**

| Domaine | Fonctionnalité | Gratuit V1 proposé | Dun+ V1 proposé | Changement par rapport au code actuel |
| --- | --- | --- | --- | --- |
| Accès | Application après onboarding | Oui, sans achat ni essai obligatoire | Oui | Confirmer le mode freemium dans le build ; paywall facultatif. |
| Tâches | Créer des tâches datées | Illimité | Illimité | Supprimer la limite de 6 et son compteur. |
| Tâches | Consulter le calendrier et l'historique ; créer, modifier, terminer, reporter, supprimer et réordonner des tâches | Oui | Oui | Conserver le cœur fonctionnel pour tous. |
| Tâches | Nom, description et date | Oui | Oui | Aucun changement commercial. |
| Tags | Créer et utiliser des tags | Illimité | Illimité | Supprimer la limite de 2 et la notion de tags inactifs après expiration. |
| Tags | Nombre de tags sur une tâche | 3 maximum | 3 maximum | Conserver la limite technique commune, sous réserve de retour produit ; ce n'est pas une limite commerciale. |
| Box | Créer des tâches sans date, déplacer et réordonner dans la Box | Oui | Oui | Déverrouiller tout le parcours Box ; l'utilisateur peut choisir une méthode avec ou sans planification immédiate. |
| Daily | Effectuer et activer/désactiver la revue quotidienne | Oui | Oui | Supprimer la contrainte qui force le Daily en gratuit et sa réactivation après expiration. |
| Journées passées | Activer/désactiver leur verrouillage | Oui | Oui | Supprimer la contrainte qui force le verrouillage en gratuit et sa réactivation après expiration. |
| Repos | Activer, prolonger et quitter le mode repos | Oui | Oui | Rendre le réglage accessible à tous. |
| Statistiques | Résumé hebdomadaire, série, tâches terminées, jours parfaits, complétion et charge | Oui | Oui | Conserver un retour utile dans l'offre gratuite. |
| Statistiques | Périodes mensuelle et annuelle, graphique détaillé, analyse par tag, indicateur des ajustements tardifs | Aperçu des avantages seulement | Oui | Conserver la séparation actuelle ; l'indicateur d'ajustements reste soumis à sa condition fonctionnelle. |
| Statistiques | Préférences d'affichage des statistiques accessibles | Oui pour les statistiques gratuites | Oui pour toutes | Éviter de présenter en gratuit des réglages sans effet visible. |
| Notifications | Rappel quotidien à une heure choisie, activation/désactivation | Oui | Oui | Conserver et fiabiliser. |
| Notifications | Répétitions, délai, nombre et choix des jours de week-end | Oui | Oui | Déverrouiller ces réglages : la cadence des rappels fait partie du système personnel. |
| Apparence | Clair/sombre/système, langue et taille du texte | Oui | Oui | Aucun changement commercial. |
| Apparence | Toutes les palettes de couleurs | Oui | Oui | Déverrouiller les couleurs : elles participent à l'appropriation de l'app. |
| Apparence | Calendrier en curseur ou en texte ; progression linéaire ou circulaire | Oui | Oui | Déverrouiller les deux dispositions et ne plus les réinitialiser après expiration. |
| Données | Export | Oui | Oui | Conserver pour tous après DUN-011. |
| Données | Import destructif actuel | Indisponible en V1 | Indisponible en V1 | Retrait déjà prévu par DUN-004, DUN-009 et DUN-010 ; le statut premium ne change pas le risque. |
| Compte | Inscription, connexion, profil, suppression du compte | Oui | Oui | Aucun changement commercial. |
| Abonnement | Acheter, restaurer, consulter et gérer Dun+ | Oui, selon l'action | Oui, selon l'action | Offres et essai à vérifier dans RevenueCat et App Store Connect. |

**Règle proposée à l'expiration :** toutes les tâches, tags, données Box, préférences de travail et choix d'apparence restent disponibles. Seuls les écrans d'analyse avancée redeviennent verrouillés. L'abonnement donne accès à Dun+ tant que l'entitlement RevenueCat est actif ; l'annulation seule ne doit pas retirer immédiatement les avantages.

**Avis commercial et limite assumée :** Dun+ serait cohérent mais aurait une proposition de valeur V1 étroite : les statistiques détaillées déjà présentes. Éviter de recréer une frustration artificielle sur les tâches ou les préférences pour compenser. Mettre en avant l'analyse par tag, les tendances mensuelles/annuelles et la lecture de progression **au moment où l'utilisateur consulte ses statistiques**, avec un paywall qu'il peut fermer. Une étude RevenueCat indique que les conversions freemium peuvent arriver plusieurs semaines après l'installation ; c'est une donnée agrégée, pas une prévision pour Dun. Après la sortie, mesurer consultation des statistiques, ouverture du paywall, essai, conversion et rétention avant d'investir dans les analyses personnalisées de DUN-046. [Source RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps), [recommandations Apple pour les abonnements](https://developer.apple.com/app-store/subscriptions/).

**Conséquences qui avaient été envisagées pour cette proposition écartée :**

- Supprimer les quotas commerciaux de `lib/plan.ts`, `lib/useOptimisticTaskMutations.ts`, `app/settings/tags.tsx` et l'indicateur de quota de l'accueil ; garder la contrainte commune de 3 tags par tâche tant qu'elle est voulue.
- Retirer les contrôles premium de la Box, du Daily, du verrouillage, du repos, des rappels, des couleurs et des deux dispositions ; supprimer les réinitialisations correspondantes après expiration. Réduire `lib/subscription.tsx` aux droits réellement payants, principalement les statistiques avancées.
- Corriger la reprogrammation des notifications (DUN-012) et tester chaque réglage après connexion, relance, changement de compte et expiration ; ouvrir une fonction gratuitement ne corrige pas son défaut actuel.
- Adapter les textes d'onboarding, le paywall, les badges, la FAQ et la fiche App Store : ne promettre que des bénéfices Dun+ réels. Afficher durée d'essai, prix et remise vérifiés à partir des produits/offres disponibles ; Apple demande des conditions et un prix de renouvellement clairs. [Référence Apple](https://developer.apple.com/app-store/subscriptions/).
- Tester les parcours gratuit et Dun+ ainsi que l'expiration. Avec cette répartition, les quotas économiques disparaissent ; réévaluer DUN-041 seulement si de futurs calculs ou données réservés à Dun+ sont servis par le backend.

### Orientation retenue avant publication — stockage local et cloud Dun+

**Décision de trajectoire :** entreprendre la refonte locale **avant** la première publication, en acceptant de revoir la date de sortie. Cible architecturale : une base locale pour tous les utilisateurs, avec synchronisation et restauration Dun via Supabase pour les abonnés. La matrice commerciale V1 est fixée ci-dessous. Une base SQLite locale est possible dans Expo, mais le dépôt actuel n'a pas `expo-sqlite` et les parcours tâches, Daily, tags, statistiques, profil et onboarding dépendent directement de Supabase. [Documentation Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

| Sujet à décider | Hypothèse de travail | Vérification requise |
| --- | --- | --- |
| Coût des comptes gratuits | Pas de compte Supabase obligatoire, pas de tâches synchronisées | Mesurer d'abord MAU, taille Postgres et trafic ; l'économie n'est pas proportionnelle à chaque installation. [Tarifs Supabase](https://supabase.com/pricing). |
| Stockage local | Une seule base SQLite pour les tâches et préférences de tous les utilisateurs | Définir schéma local, migrations, IDs stables, transactions, calcul des jours et tests de reprise. |
| Achat et identité | RevenueCat peut commencer avec un identifiant anonyme ; ne demander un compte Supabase que pour la synchro payante | Tester achat avant/après compte, restauration, réinstallation, changement d'appareil et identité RevenueCat. Apple demande l'accès sans connexion si l'app n'a pas besoin d'un compte pour ses fonctions principales. [Identité RevenueCat](https://www.revenuecat.com/docs/customers/identifying-customers), [règles Apple](https://developer.apple.com/app-store/review/guidelines/). |
| Passage gratuit → Dun+ | Copier et synchroniser les données locales sans perte ni doublon | Prévoir reprise après interruption, conflits, suppressions et import des comptes déjà présents dans Supabase. |
| Expiration Dun+ | L'application locale continue à fonctionner ; la synchro cesse ; copie cloud en lecture seule pendant 90 jours | Implémenter et tester la politique V1 ci-dessous, y compris restauration/export et suppression programmée. |
| Sauvegarde gratuite | Export **et restauration locale sûre** accessibles et vérifiés | DUN-011 et DUN-035 sont maintenant avant la sortie. Expliquer qu'une suppression de l'app ou perte du téléphone peut faire perdre les données locales ; la sauvegarde iCloud du téléphone, si activée, est distincte de la synchro Dun. [Documentation Apple](https://developer.apple.com/documentation/foundation/using-the-file-system-effectively). |
| Droits cloud | Vérification serveur de l'abonnement avant les écritures Supabase payantes | Un drapeau dans l'application ne suffit pas ; DUN-041 est maintenant bloquant avant la sortie. |

**Première piste de répartition locale — jugée encore trop permissive :** le tableau suivant est conservé pour comparer les options, mais ne doit pas devenir la matrice V1 sans nouvelle décision.

| Fonction | Gratuit local | Dun+ | Raison proposée |
| --- | --- | --- | --- |
| Tâches datées, calendrier, historique et Box | Illimités sur l'iPhone | Identiques et synchronisés | La méthode de base reste utilisable sans plafond de tâches. |
| Tags | Création de **5 tags**, seuil provisoire à tester | Création illimitée | Deux tags ne suffisent pas à évaluer une organisation personnelle ; un plafond modéré peut rester une limite commerciale. Après expiration, les tags déjà créés restent utilisables. |
| Daily, verrouillage des jours passés et repos | Activables/désactivables | Identiques | L'utilisateur choisit les règles de sa méthode, quel que soit son forfait. |
| Rappel quotidien, heure et jours choisis | Oui | Oui | Une notification utile ne doit pas imposer un rythme identique à tous. |
| Rappels répétés avec délai et nombre | Non | Oui | Module avancé qui ajoute une possibilité sans retirer les rappels de base. |
| Apparence | Clair/sombre/système, langue, taille du texte et présentation de base | Palettes et dispositions supplémentaires | Différenciation visuelle secondaire, sans réduire l'accessibilité. |
| Statistiques | Résumé hebdomadaire de base | Périodes longues, graphiques détaillés et analyse par tag | Valeur d'analyse déjà présente en grande partie. |
| Sauvegarde et multi-appareils Dun | Export/restauration manuels, pas de synchro Dun | Synchro, restauration et accès sur plusieurs appareils | Bénéfice récurrent et coût de service associé à l'abonnement. |

### Matrice commerciale décidée pour la V1 publique

**Positionnement de lancement :** « Gratuit : créer son système de productivité sur cet iPhone. Dun+ : enrichir ce système, comprendre ses progrès et le retrouver sur ses appareils. » Les routines seront une fonction de la première mise à jour après publication ; ne pas les afficher comme disponibles dans le paywall V1.

| Brique | Gratuit V1 | Dun+ V1 | Règle à implémenter |
| --- | --- | --- | --- |
| Tâches et journée | Tâches datées illimitées, calendrier/historique, Daily et verrouillage du passé activables ou désactivables, mode Repos | Même base | Retirer le plafond actuel de six tâches et les droits premium des réglages de base. |
| Premier objectif et série | Choix de l'onboarding, objectif atteint, série courante et statistiques de série | Même accès, synchronisé | Une journée ne compte qu'après clôture à 4 h ; repos neutre, journée vide hors repos ou incomplète rompant la série. |
| Box | Accès complet, tâches sans date, déplacement et réordonnancement | Même accès, synchronisé | Aucun verrou ni quota propre à la Box. |
| Tags | **5 tags créables**, jusqu'à **3 tags par tâche** | Création de tags sans plafond produit, toujours 3 par tâche en V1 | Après expiration, tous les tags déjà créés restent actifs et éditables ; seule la création est bloquée tant que le total est au moins 5. |
| Rappels | Un rappel quotidien à l'heure choisie, sur les jours choisis **y compris le week-end** | Rappels répétés avec délai et nombre configurables | Après expiration, conserver les réglages avancés sans programmer les répétitions ; le rappel de base continue. |
| Statistiques | Semaine, série courante et compte de jours parfaits | Mois, année, historique global, graphiques détaillés et analyse par tag | Une même règle de repos et de jour clos s'applique aux séries sur les deux offres. |
| Apparence | Clair/sombre/système, langue, taille de texte, calendrier en curseur et progression linéaire | Palettes de couleurs supplémentaires, calendrier en texte et progression circulaire | Après expiration, conserver la palette et les dispositions sélectionnées, mais réserver la sélection de nouvelles variantes Dun+. Ne pas monétiser l'accessibilité. |
| Données | SQLite sur l'iPhone, export et restauration manuels ; aucun compte ni cloud Dun requis | Sauvegarde Dun, synchronisation et restauration sur plusieurs appareils | La source de travail reste locale ; droits cloud vérifiés côté serveur. |
| Routines et tâches récurrentes | Indisponibles au lancement | **Indisponibles au lancement** ; module Dun+ prévu pour la première mise à jour | Aucune promesse de fonction déjà disponible dans le paywall V1. |

**Valeur Dun+ au lancement :** synchronisation et restauration, tags sans plafond de création, rappels répétés, analyses avancées, palettes et dispositions supplémentaires. La valeur commerciale reste à mesurer après sortie ; ne pas annoncer la première mise à jour comme une fonction déjà livrée.

### Conservation cloud après expiration — politique V1

- Le délai commence à la **fin effective de l'entitlement Dun+**, pas lors de l'annulation du renouvellement. Une période de grâce qui maintient l'entitlement actif conserve les droits. [Cycle RevenueCat](https://www.revenuecat.com/docs/integrations/webhooks/event-flows), [périodes de grâce](https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work).
- La synchronisation et les écritures cloud s'arrêtent à l'expiration ; toutes les données locales restent disponibles. La dernière copie cloud reste **90 jours en lecture seule**, avec une restauration/export vers l'iPhone possible pendant cette période sans réabonnement. Cette fenêtre est un **choix produit**, pas une durée légale imposée.
- Si l'abonnement reprend avant l'échéance, reprendre la synchronisation en résolvant les changements locaux sans doublon. Après 90 jours sans droit actif, supprimer les données de productivité cloud et conserver seulement les données de compte nécessaires à son fonctionnement et aux obligations applicables. Une suppression explicite du compte suit son propre parcours, sans attendre 90 jours.
- Afficher la date de suppression prévue et le moyen de récupérer les données dès l'expiration, puis rappeler l'échéance dans l'app. Le nettoyage serveur doit vérifier de nouveau le droit actif, être idempotent et journaliser son résultat ; tester renouvellement tardif, délai de webhook et échec de tâche planifiée. La durée et ses finalités doivent figurer dans la politique de confidentialité. [Principe de conservation CNIL](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees), [suppression de compte Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app).

**Dépendance :** les phases suivantes utilisent ces décisions. Elles peuvent être préparées en parallèle, mais aucun build candidat ne peut être validé avant la fin de cette phase.

## Phase 0 bis — Refaire le stockage avant la publication

**Objectif :** une seule logique métier locale pour les comptes gratuits et Dun+ ; le cloud payant synchronise cette base sans devenir la seule copie de travail. Cette phase remplace l'hypothèse initiale d'une sortie dans les prochains jours.

- [ ] **DUN-047 — Écrire le contrat de données local.** Inventorier `Tasks`, `Tags`, `Task_Tags`, `Days`, `Profiles` et les états du Daily ; choisir des identifiants stables, des migrations SQLite versionnées, les règles de calcul de journée et les données dérivées. Prévoir la persistance de la cible et du début de l'objectif choisis à l'onboarding ainsi que l'historique daté des jours de repos nécessaire à son calcul (DUN-054). Définir les cas d'effacement, d'export et de restauration. **Sortie :** schéma et plan de migration revus avant toute bascule d'écran.
- [ ] **DUN-037 — Centraliser les opérations métier derrière un dépôt de données.** Faire passer écrans et hooks par des fonctions communes de lecture/écriture avant de remplacer Supabase comme source immédiate ; clarifier les clés de cache React Query et les états Zustand. **Sortie :** plus d'écriture de tâche, tag, profil ou Daily éparpillée dans les composants.
- [ ] **DUN-048 — Ajouter la base SQLite locale et migrer les parcours.** Faire fonctionner tâches, Box, tags, Daily, préférences, calendrier et statistiques sans session ni réseau ; rendre les écritures atomiques et les lectures par plage de dates. **Sortie :** compte invité utilisable hors ligne de l'onboarding à l'export, y compris après relance de l'app.
- [ ] **DUN-049 — Migrer les comptes déjà présents dans Supabase.** Importer leurs données vers SQLite sans doublon, avec état de progression et reprise après interruption ; vérifier les relations tâches/tags et les agrégats. Définir quand l'ancienne copie cloud cesse d'être écrite. **Sortie :** comptes de test existants et historiques volumineux migrés, totaux comparés avant/après.
- [ ] **DUN-050 — Construire la synchronisation Dun+.** Journaliser les changements locaux, suppressions comprises, avec identifiants stables et opérations rejouables ; choisir une règle de conflit explicite ; tester deux iPhone, absence de réseau, reprise et nouvelle installation. **Sortie :** aucune tâche perdue ou dupliquée dans ces scénarios ; restauration d'un appareil neuf démontrée.
- [ ] **DUN-051 — Rendre le compte facultatif en gratuit et fiable en premium.** Démarrer sans connexion Supabase, puis lier le compte et l'identité RevenueCat au moment d'activer le cloud. Tester achat, restauration, changement de compte, suppression et retour en gratuit sans mélange de données locales. **Sortie :** parcours invités et abonnés validés sur appareil réel.
- [ ] **DUN-041 — Protéger le cloud payant côté serveur.** Vérifier un droit RevenueCat synchronisé côté serveur avant toute écriture ou synchronisation Supabase ; permettre seulement la lecture/restauration de la copie existante pendant les 90 jours après expiration. Définir RLS ou fonctions serveur et le comportement si RevenueCat est indisponible. **Sortie :** un compte gratuit n'ayant jamais eu Dun+ ne peut ni écrire ni créer de sauvegarde cloud ; un ancien abonné expiré ne peut pas écrire et ne lit que sa copie pendant la fenêtre prévue.
- [ ] **DUN-052 — Implémenter la politique d'expiration Dun+.** À la fin effective de l'entitlement, arrêter la synchronisation sans toucher à SQLite. Garder la copie cloud 90 jours en lecture seule, permettre sa restauration/export local, afficher l'échéance, reprendre sans doublon si l'abonnement revient, puis supprimer les données de productivité cloud après nouvelle vérification du droit actif. Tester annulation avant échéance, période de grâce, remboursement, webhook tardif, renouvellement à J+89 et J+91, suppression explicite du compte et échec du nettoyage. **Sortie :** aucune perte locale ; échéance et récupération compréhensible dans l'app ; nettoyage serveur contrôlé, journalisé et reproductible.
- [ ] **DUN-011 — Garantir un export complet.** Exporter depuis la source locale après DUN-048, vérifier le total attendu par table et signaler toute ligne manquante. Tester un jeu volumineux ; définir quand le fichier temporaire est effacé après partage. **Sortie :** nombre de lignes exportées égal au nombre dans SQLite, puis lecture du fichier validée.
- [ ] **DUN-035 — Fournir une restauration locale sûre.** Versionner le format exporté en DUN-011, valider toutes les lignes et relations avant écriture, limiter la taille lue et restaurer dans une transaction locale. Tester fichier incorrect, interruption et historique de plus de 1 000 lignes. **Sortie :** un utilisateur gratuit peut sauvegarder et restaurer manuellement ses données sans écraser ses données initiales en cas d'échec.
- [ ] **DUN-054 — Définir et enregistrer le premier objectif.** Enregistrer la cible de l'onboarding (1, 2, 3, 4, 7 ou 14 jours), un instant de démarrage et sa première clé de journée éligible. Calculer la série uniquement sur les journées **closes à 4 h** dans l'intervalle `[premier jour éligible, jour courant)` : aucune journée antérieure ou future ne compte et le jour en cours reste provisoire, même à 100 %. Un jour réussi comporte au moins une tâche et 100 % des tâches terminées ; un jour incomplet ou vide hors repos rompt la série ; un jour couvert par le mode Repos est ignoré sans incrémenter ni rompre la série. Le repos ne peut pas être ajouté à un jour déjà clos. Le Daily peut être désactivé sans effet sur ce calcul. Conserver une première réussite datée distincte de la série courante, qui continue et se recalcule après modification des tâches passées éligibles ; partager la règle de série avec les statistiques. Conserver l'historique daté du repos ; préciser avec DUN-013 le fuseau et le cas d'un objectif démarré avant 4 h. Inclure cible, début, réussite et repos dans l'export/restauration locaux et la synchronisation Dun+ ; migrer sans inventer d'historique pour les comptes existants. **Sortie :** résultat exact pour chaque cible, y compris avant le début, aujourd'hui, futur, jour vide, repos, jour manqué, édition rétroactive, relance, import et synchronisation.

**Porte de sortie phase 0 bis :** gratuit réellement utilisable sans Supabase ; achat et synchro Dun+ fiables ; restauration locale gratuite et restauration cloud payante prouvées sur deux appareils. Les tests de cette phase conditionnent la suite de la roadmap.

## Phase 1 — Sécuriser la base et les données

**Objectif :** aucune action courante ne doit pouvoir perdre, exposer ou corrompre les données d'un autre compte.

- [ ] **DUN-005 — Corriger les permissions RLS et RPC.** Restreindre l'insertion de `Profiles` à `id = auth.uid()`. Retirer l'accès public direct à `consume_beta_rate_limit` et `refresh_day_from_tasks` ; limiter les fonctions privilégiées au rôle nécessaire et fixer leur `search_path`. Revoir `email_exists` et remplacer l'énumération publique des adresses par un flux d'inscription qui ne la révèle pas. **Sortie :** migration appliquée ; tests `anon`, compte A et compte B prouvant les accès autorisés et les refus.
- [ ] **DUN-006 — Rendre la suppression du compte atomique.** Supprimer les effacements côté client avant `delete_account` ; faire porter l'opération complète et ses dépendances par une transaction serveur. Vérifier les tables `Tasks`, `Days`, `Tags`, `Task_Tags`, support et, selon le contrat produit, `Beta`. **Sortie :** test de réussite et test d'échec forcé montrant qu'un échec ne laisse pas un compte partiellement supprimé ; parcours iOS vérifié.
- [ ] **DUN-007 — Réparer la synchronisation `Tasks` → `Days`.** Déclencher le recalcul lors d'une modification de `late_adjusted_at` ; confirmer le résultat sur insertion, changement de date, complétion, ajustement tardif et suppression. Prévoir un recalcul des lignes `Days` déjà incorrectes. **Sortie :** tests SQL des cinq cas et comparaison des agrégats recalculés aux tâches sources.
- [ ] **DUN-008 — Vérifier les opérations multi-écritures.** Rendre atomiques, ou rendre explicitement réparables, report de tâche, réorganisation et finalisation quotidienne. Empêcher qu'une erreur après la première écriture laisse un état visuel différent de la base. **Sortie :** scénarios d'échec intermédiaire testés ; relecture après relance correcte.
- [ ] **DUN-009 — Retirer l'ancien import destructif.** Désactiver les routes et actions qui appellent `replaceUserDataFromImport` ; les remplacer avant la sortie par la restauration locale sûre de DUN-035. **Sortie :** aucun utilisateur du build public ne peut lancer le remplacement destructif.
- [ ] **DUN-010 — Contrôler l'ancien mécanisme d'import.** Identifier tous les points d'entrée et vérifier qu'aucun lien profond ou écran caché ne permet d'exécuter `replaceUserDataFromImport` dans le build public. **Sortie :** vérification sur le build TestFlight, pas seulement dans le code source.

**Porte de sortie phase 1 :** migrations rejouées, matrice RLS verte, suppression atomique démontrée, agrégats cohérents et aucune fonction d'import dangereuse accessible en V1.

## Phase 2 — Corriger les parcours qui conditionnent la confiance

- [ ] **DUN-012 — Unifier les notifications.** Un seul service synchronise les préférences locales avec les notifications iOS ; l'accueil ne reprogramme plus avec des valeurs par défaut. Tester activation, désactivation, répétitions, week-ends, changement de langue, changement de compte, refus d'autorisation et retour de l'app au premier plan. **Sortie :** notifications planifiées conformes aux préférences après chaque parcours.
- [ ] **DUN-013 — Unifier les règles de date.** Documenter la journée qui bascule à 4 h, le sens inclusif ou exclusif de `restEndDate`, le verrouillage des jours passés, le fuseau utilisé et le début effectif d'une pause activée avant ou après 4 h. Interdire l'ajout de repos à un jour déjà clos. Éliminer la comparaison d'une date `YYYY-MM-DD` avec un horodatage ISO. **Sortie :** tests à 23 h 59, 00 h 01, 03 h 59, 04 h 01, changement d'heure et dernière journée de repos.
- [ ] **DUN-014 — Afficher les vraies erreurs de chargement.** Une erreur SQLite ou, pour Dun+, une panne de synchronisation Supabase doit produire l'état approprié avec réessai, pas « aucune tâche » ou des statistiques vides. Conserver séparément chargement, vide, erreur et succès. **Sortie :** essais hors ligne puis reconnexion sur accueil, calendrier, statistiques et synchro.
- [ ] **DUN-015 — Stabiliser auth et navigation.** Vérifier le parcours invité sans session, les redirections entre `app/_layout.tsx`, `app/index.tsx` et le callback email, et la connexion nécessaire au cloud Dun+. Supprimer la temporisation fixe du callback si elle masque une course. Tester compte local, création de compte, connexion, déconnexion, relance et session expirée. **Sortie :** chaque parcours aboutit à un seul écran attendu, sans boucle ni mélange de données.
- [ ] **DUN-016 — Stabiliser l'identité RevenueCat.** Configurer le SDK une fois, puis utiliser son flux d'identification lors des connexions et changements de compte. Tester achat, annulation, restauration, renouvellement/expiration, autre compte sur le même appareil et absence de réseau. **Sortie :** entitlement affiché pour le bon utilisateur dans l'app **et** RevenueCat ; aucun accès premium attribué au mauvais compte.
- [ ] **DUN-017 — Vérifier le paywall public.** Contrôler produits, prix localisé, période, essai, conditions, gestion et restauration des achats, ainsi que le comportement si RevenueCat est indisponible. Le build public ne doit pas dépendre du drapeau bêta. **Sortie :** achats sandbox et restauration réussis sur iPhone réel, textes conformes aux produits configurés dans App Store Connect.
- [ ] **DUN-018 — Vérifier la confidentialité de l'observabilité.** Inspecter les données envoyées à Sentry, en particulier les replays et journaux des écrans contenant email, nom et tâches ; régler l'échantillonnage et les masquages. **Sortie :** inspection d'événements de test, politique de confidentialité et déclaration App Store alignées avec les données réellement collectées.
- [ ] **DUN-045 — Appliquer la répartition gratuit/Dun+ validée en DUN-001.** Mettre à jour les droits, quotas, écrans, textes, paywall et comportement à l'expiration conformément à la matrice V1 : 5 tags gratuits, week-end des rappels gratuit, répétitions payantes, palettes et deux dispositions alternatives payantes, Box/Daily/repos/objectif gratuits, statistiques détaillées et synchro payantes. Ne pas désactiver les tags existants ni réinitialiser la palette ou les dispositions sélectionnées après expiration ; ne pas promettre les routines. **Sortie :** matrice de recette gratuit, Dun+, expiration et restauration exécutée sur le build iOS ; aucun avantage affiché par le paywall n'est absent du produit.
- [ ] **DUN-055 — Construire l'onglet Profil / Mon système.** Séparer destination Profil/Système, statistiques et création de tâche dans la navigation ; déplacer les réglages métier vers des modules compréhensibles et garder la roue dentée pour les paramètres généraux. Montrer l'état effectif, une brève explication et l'action adaptée à chaque module : interrupteur pour Daily/verrouillage, durée pour repos, configuration pour rappels/tags. **Retirer la carte « Delay » de la maquette** ; ne pas présenter les tags comme une bascule inexistante ni les routines comme déjà disponibles. Rendre la carte d'objectif dépendante de DUN-054 et adapter sa progression aux six cibles de l'onboarding. **Sortie :** parcours compréhensible et accessible sur deux tailles d'iPhone, texte agrandi, VoiceOver, mode invité et Dun+ ; état des notifications cohérent avec l'autorisation iOS.
- [ ] **DUN-056 — Intégrer le repos aux statistiques.** Partager avec DUN-054 l'historique daté du repos et une règle de série unique : une journée de repos close est neutre, sans incrémenter ni casser la série ; une journée sans tâche hors repos la casse. Exclure les journées de repos des taux, charges moyennes et jours parfaits, tout en les montrant distinctement dans le calendrier/graphe ; les tâches effectivement terminées pendant un repos restent dans un compteur brut d'activité clairement libellé. Le réglage « afficher les jours de repos » ne doit changer que leur visibilité, pas le sens des indicateurs. **Sortie :** objectif et série des statistiques concordent sur pauses consécutives, repos avec tâches, jour vide hors repos et édition rétroactive ; les dénominateurs et libellés sont vérifiés.

**Porte de sortie phase 2 :** parcours critiques réussis sur un build iOS représentatif, y compris erreurs réseau et changement de compte.

## Phase 3 — Créer un cycle de livraison reproductible

- [ ] **DUN-019 — Séparer les vérifications TypeScript.** Donner à l'app Expo et à `supabase/functions/beta-signup` des configurations adaptées à leurs runtimes. Ajouter des scripts `typecheck:app` et `typecheck:functions`. **Sortie :** les deux commandes passent depuis un clone propre.
- [ ] **DUN-020 — Résoudre les avertissements qui cachent des bugs.** Corriger en priorité les dépendances de hooks et le code mort touchant auth, notifications et paiements. Trancher la contradiction entre React Compiler activé et règles associées désactivées. Ne durcir la CI à zéro avertissement qu'une fois le dépôt nettoyé. **Sortie :** lint stable et politique ESLint documentée.
- [ ] **DUN-021 — Ajouter les tests à forte valeur.** Tests unitaires des dates, statistiques et objectifs (début, clôture à 4 h, repos, jour vide, édition passée, dénominateur des taux) ; tests SQLite des écritures et migrations ; tests d'intégration SQL pour RLS, synchronisation et suppression ; tests des droits gratuit/premium choisis en DUN-001, de l'expiration DUN-052 et de la restauration DUN-035. Éviter les tests qui recopient simplement l'implémentation. **Sortie :** ces tests reproduisent d'abord les défauts connus et passent après correction.
- [ ] **DUN-022 — Ajouter une CI de PR.** Depuis `npm ci` : génération i18n suivie d'un contrôle de dérive, typecheck, lint et tests. Vérifier les dépendances Expo dans un environnement connecté. **Sortie :** PR bloquée si un contrôle échoue ; exécution réussie depuis un clone propre.
- [ ] **DUN-023 — Vérifier les dépendances et le build natif.** Résoudre l'écart Sentry signalé par `expo install --check` après contrôle connecté ; confirmer la nécessité du correctif `postinstall` créant un lien dans `node_modules`. Construire iOS avec la configuration de production. **Sortie :** build reproductible, démarrage sans crash et aucune dépendance native incompatible.
- [ ] **DUN-024 — Mettre la documentation à niveau.** Actualiser le README pour Expo 56, Node compatible, configuration locale, développement avec modules natifs, variables d'environnement, migrations, commandes de test et procédure de release. Fournir `.env.example` sans valeur secrète. **Sortie :** un nouveau clone peut lancer les contrôles et un build de test en suivant le README.
- [ ] **DUN-025 — Fixer le versionnement de release.** Définir qui contrôle `expo.version` et `ios.buildNumber` (dépôt ou EAS), vérifier bundle ID, projet EAS, équipe Apple et profil de distribution. Chaque nouveau binaire doit avoir un numéro de build unique. **Sortie :** version et numéro relevés dans l'archive et le journal de release.

**Porte de sortie phase 3 :** CI verte et build iOS de production installable, issu d'un commit identifié.

## Phase 4 — TestFlight et validation finale

- [ ] **DUN-026 — Préparer App Store Connect.** Vérifier le compte Apple Developer, les accords, l'app record, le bundle ID, les capacités et les produits d'abonnement. Préparer les informations de test, le contact et un compte de démonstration utilisable par App Review. **Sortie :** aucun prérequis de compte ou de produit manquant.
- [ ] **DUN-027 — Envoyer un build identifié à TestFlight.** Construire le profil iOS de distribution, noter commit/build ID/version, soumettre **ce build précis**, attendre le traitement Apple et l'assigner au groupe de test prévu. **Sortie :** installation réelle par au moins un testeur depuis TestFlight ; un simple upload EAS ne vaut pas validation.
- [ ] **DUN-028 — Exécuter la matrice de recette sur TestFlight.** Tester sur au moins deux tailles d'iPhone et une version iOS prise en charge : parcours invité, création de compte Dun+, email/deep link, tâches, tags, Daily, stats avec repos neutre, notifications, objectif de journées à 100 % et onglet Système, hors ligne/retour réseau, achat/restauration/expiration, export/import local, synchronisation sur deux appareils et suppression du compte. Vérifier qu'aucun écran ni paywall ne promet les routines. Tester un compte vierge et un compte avec historique volumineux. **Sortie :** matrice datée, défauts bloquants corrigés et re-testés sur un nouveau build.
- [ ] **DUN-029 — Préparer la fiche App Store.** Nom, description fidèle, catégories, captures, pays, prix, URL d'assistance et de confidentialité, informations de collecte des données incluant les SDK, informations de revue et conformité de chiffrement. Vérifier la page d'abonnement et ses liens. **Sortie :** fiche complète et cohérente avec le build testé.
- [ ] **DUN-030 — Tenir la revue « go/no-go ».** Vérifier toutes les portes précédentes, les événements Sentry du build, les incidents ouverts, la sauvegarde et la restauration de la base, le support utilisateur et le plan de correctif urgent. **Sortie :** décision de sortie consignée ; zéro défaut bloquant connu.

## Phase 5 — Soumission et sortie publique

- [ ] **DUN-031 — Soumettre le build validé à App Review.** Sélectionner dans App Store Connect la version et le build exacts testés ; compléter les éléments requis, puis effectuer la soumission à la revue. **Sortie :** état « In Review » confirmé. Un build TestFlight ou « Add for Review » seul ne signifie pas que l'app a été soumise.
- [ ] **DUN-032 — Traiter les retours Apple.** Répondre avec les étapes de reproduction, corriger les refus dans une PR, créer un nouveau build si le binaire change, puis refaire les tests touchés. **Sortie :** version approuvée.
- [ ] **DUN-033 — Déclencher et vérifier la disponibilité publique.** Choisir la mise en ligne manuelle pour conserver un dernier contrôle ; publier après approbation, vérifier la fiche et l'installation depuis l'App Store dans les pays choisis. **Sortie :** disponibilité réelle vérifiée, version/build consignés.
- [ ] **DUN-034 — Surveiller les premiers jours.** Examiner quotidiennement crashs Sentry, erreurs Supabase, achats/restaurations, taille et trafic cloud, état des tâches de conservation, retours utilisateurs et avis ; classer et corriger immédiatement tout défaut de données, connexion ou paiement. **Sortie :** bilan à J+1, J+3 et J+7 avec décisions de correctif.

## Après la sortie — à planifier sans retarder V1

### Première mise à jour publique — routines Dun+

- [ ] **DUN-053 — Livrer les routines et tâches récurrentes Dun+.** Spécifier un premier périmètre fiable (création, modification, pause, suppression, génération des occurrences, fuseau/journée à 4 h, édition d'une occurrence et expiration de l'abonnement) puis implémenter la génération locale idempotente et sa synchronisation Dun+. Tester hors ligne, deux appareils, changement de fuseau et réactivation après expiration. **Sortie :** occurrences non dupliquées après relance et synchronisation ; droits gratuit/Dun+ vérifiés ; paywall et fiche App Store mis à jour seulement avec la version qui livre réellement le module.

### Premier mois

- [ ] **DUN-036 — Paginer les données d'historique.** Charger les tâches par plage de dates et les statistiques par période ; éviter de télécharger toute la vie du compte à chaque ouverture. Mesurer temps de démarrage, trafic et comportement sur un compte volumineux.
- [ ] **DUN-038 — Réduire les grands écrans progressivement.** Extraire d'abord la logique métier et les composants testables de `home`, `daily`, `tutorial`, `popUpTask` et du calendrier. Garder chaque extraction dans une PR limitée, sans changement de comportement non voulu.
- [ ] **DUN-039 — Consolider les opérations serveur coûteuses.** Réordonner en lot, éviter les lectures complètes pour calculer `order`, mesurer les index et remplacer les recalculs répétés par une opération sûre en base lorsque le volume le justifie.
- [ ] **DUN-040 — Nettoyer conventions et typage.** Générer les types de base Supabase ; remplacer les `any` aux frontières métier ; harmoniser noms de fichiers, imports, formatage et gestion des erreurs. Ne pas renommer les tables SQL historiques sans migration planifiée.

### Ensuite, selon l'usage réel

- [ ] **DUN-042 — Évaluer Android.** Corriger les écarts natifs et d'achat, écrire une recette Android dédiée, puis créer un cycle Play Store séparé.
- [ ] **DUN-043 — Évaluer les mises à jour à distance et l'automatisation de release.** Ajouter EAS Update ou des workflows seulement après avoir défini canaux, compatibilité du runtime natif, validation et retour arrière.
- [ ] **DUN-044 — Faire évoluer le produit à partir des données.** Exploiter incidents, performance et retours utilisateurs pour prioriser les fonctionnalités, plutôt que de refactorer l'ensemble du dépôt sans problème mesuré.
- [ ] **DUN-046 — Renforcer la valeur de Dun+ à partir de l'usage.** Selon la répartition validée en DUN-001, mesurer l'intérêt pour la synchro, les modules et les statistiques. Si les utilisateurs consultent les statistiques mais que l'abonnement convertit peu, étudier des comparaisons entre périodes, tendances par tag et bilans personnalisés utiles. Prototyper avec des données réelles anonymisées, puis choisir un petit ajout mesurable. **Sortie :** hypothèse, mesure initiale et critère de succès documentés avant développement.

## Références et points de départ dans le dépôt

- Données : [`lib/importData.ts`](lib/importData.ts), [`lib/exportData.ts`](lib/exportData.ts), [`lib/supabase.ts`](lib/supabase.ts), [`lib/tasks.ts`](lib/tasks.ts), [`supabase/migrations/`](supabase/migrations/).
- Parcours : [`app/_layout.tsx`](app/_layout.tsx), [`app/index.tsx`](app/index.tsx), [`app/(tabs)/home.tsx`](<app/(tabs)/home.tsx>), [`app/settings/notifications.tsx`](app/settings/notifications.tsx), [`lib/date.ts`](lib/date.ts), [`lib/revenuecat.ts`](lib/revenuecat.ts).
- Livraison : [`package.json`](package.json), [`tsconfig.json`](tsconfig.json), [`eslint.config.js`](eslint.config.js), [`app.json`](app.json), [`eas.json`](eas.json), [`README.md`](README.md).
- Sources officielles pour les étapes Apple/Expo : [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [confidentialité de l'app](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy), [suppression de compte](https://developer.apple.com/support/offering-account-deletion-in-your-app), [soumission App Review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/), [EAS Submit iOS](https://docs.expo.dev/submit/ios/).

## Journal de décisions

| Date | Décision | Motif | Effet sur la roadmap |
| --- | --- | --- | --- |
| 2026-09-24 | Matrice commerciale V1 fixée : 5 tags gratuits, rappels de base et week-end gratuits, répétitions/statistiques détaillées/palettes/dispositions/synchro dans Dun+ | Choix des limites confié à l'assistant ; garder un système complet en gratuit et des capacités supplémentaires identifiables dans Dun+ | DUN-001, DUN-012, DUN-017, DUN-045 |
| 2026-09-24 | Copie cloud conservée 90 jours en lecture seule après fin effective du droit Dun+ | Fenêtre de récupération choisie comme politique produit, avec arrêt des écritures, export/restauration locale puis suppression contrôlée | DUN-041, DUN-052 |
| 2026-09-24 | Repos daté et neutre pour les séries et taux de performance | Aucune pause rétroactive ; journées de repos visibles mais exclues des dénominateurs, série commune à l'objectif et aux statistiques | DUN-013, DUN-054, DUN-056 |
| À renseigner | État réel du schéma Supabase | À renseigner | DUN-003, DUN-005 à DUN-011 |
| 2026-09-24 | Refaire le stockage avant toute publication | Accord du porteur du projet pour engager cette refonte et reporter la sortie si nécessaire | Phase 0 bis, DUN-035, DUN-041 |
| 2026-09-24 | Version gratuite + abonnement Dun+ | Décision explicite du porteur du projet | DUN-001 ; accès payant obligatoire écarté |
| 2026-09-24 | Box entièrement gratuite ; routines et tâches récurrentes Dun+ reportées à la première mise à jour publique | Décision explicite du porteur du projet ; aucune promesse de disponibilité au lancement | DUN-001, DUN-045, DUN-053 |
| 2026-09-24 | Onglet Profil / Mon système et interactions adaptées aux modules ; carte Delay retirée | Direction et exceptions confirmées par le porteur du projet | DUN-055 |
| 2026-09-24 | Premier objectif = cible de l'onboarding en journées closes à 4 h et à 100 % depuis son début | Le mode Repos seul est une pause ; journée vide hors repos ou incomplète rompt la série ; modifications passées prises en compte ; aucun jour antérieur, en cours ou futur ne valide la série. Première réussite datée et série courante distinctes | DUN-047, DUN-054 |
| 2026-09-23 | Cible initiale iOS ; fiabilité et vitesse | Retour du porteur du projet | Android et web après la sortie iOS |
