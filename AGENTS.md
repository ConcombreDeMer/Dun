# Instructions pour travailler sur Dun

## Source de vérité et périmètre

- Lire `ROADMAP_PRODUCTION.md` avant de modifier le projet. Hiérarchie : décisions explicites du propriétaire, roadmap de production (section 12), document commercial, puis conventions compatibles de ce fichier et ancienne roadmap. `docs/product-v1.md` traduit les décisions en spécification ; `ROADMAP.md` conserve les identifiants DUN et les correspondances historiques. Le code existant ne prescrit pas la V1.
- Cible de la première publication : **iOS**. Priorités : intégrité des données, parcours fiables, puis vitesse de livraison. Les routines et tâches récurrentes Dun+ relèvent de **DUN-053, première mise à jour après publication** ; ne pas les inclure dans le paywall ou le build V1.
- Gratuit V1 : données locales, tâches et Box illimitées, Daily/verrouillage/Repos configurables, premier objectif, 5 tags créables, rappel quotidien y compris le week-end, statistiques hebdomadaires, export et restauration manuels. Dun+ ajoute la synchronisation/restauration cloud, les tags sans plafond de création, les rappels répétés, les statistiques et variantes visuelles avancées. Voir la matrice pour les règles exactes et l'expiration.
- La copie cloud d'un abonné expiré est en lecture seule pendant 90 jours après la **fin effective** du droit, puis supprimée selon DUN-052. Ne jamais supprimer les données locales lors d'une expiration. La suppression explicite du compte suit DUN-006.

## Façon de travailler

1. Au début d'une tâche, lire `git status --short`, l'entrée `PROD-xxx` visée et sa correspondance `DUN-xxx`, ses dépendances et les fichiers réellement impliqués. Préserver les modifications préexistantes de l'utilisateur. Le dépôt contient parfois des fichiers locaux non suivis et des projets natifs générés ; vérifier `git ls-files` avant de supposer qu'ils sont versionnés.
2. Si aucune tâche précise n'est demandée, prendre le premier livrable **prêt** de la roadmap. Commencer la refonte locale par **DUN-047 (contrat de données)**, puis DUN-037 et DUN-048 ; traiter l'écart de schéma distant de DUN-003 comme un risque explicite si Supabase distant n'est pas accessible. Ne pas lancer une migration massive sans contrat de données revu.
3. Pour chaque tâche, définir le critère de sortie, faire un changement limité, vérifier les cas d'échec et rendre compte des preuves. Cocher `ROADMAP_PRODUCTION.md` uniquement quand le critère de sortie complet est démontré ; sinon noter ce qui manque. Ne pas marquer une phase terminée parce que l'application compile.
4. Préférer une PR ou un lot cohérent par problème. Ne pas mélanger refonte de données, changement commercial et nettoyage stylistique sans lien. Garder la compatibilité des données existantes ou fournir une migration et un moyen de réparation.
5. Signaler rapidement un blocage nécessitant un accès externe, mais continuer les analyses et changements indépendants. Ne pas masquer une donnée inconnue par une hypothèse présentée comme acquise.

## Architecture et invariants

- Stack actuelle : Expo SDK 56, React Native, Expo Router, TypeScript strict, React Query/Zustand, Supabase et RevenueCat. `package.json` fait foi pour les versions ; `README.md` est actuellement en retard. `app/` contient les routes, `lib/` la logique, `locales/*.yaml` les traductions sources, `lib/i18n/resources.ts` le fichier généré, `supabase/migrations/` les changements SQL.
- Architecture cible : SQLite local est la source immédiate des tâches, Box, tags, préférences, objectif et statistiques pour tous ; Supabase synchronise les comptes Dun+ ; RevenueCat détermine l'entitlement. Placer les opérations métier derrière des interfaces de dépôt (DUN-037). Éviter toute nouvelle écriture Supabase directement depuis un écran.
- Toute migration/export/restauration/synchronisation doit préserver identifiants stables, relations, suppressions, ordre, timestamps et reprise après interruption. Préférer les transactions et opérations idempotentes. Aucun chemin d'erreur ne doit laisser une réussite visuelle non persistée ou effacer des données sans possibilité de reprise.
- La journée produit se clôt à **minuit** selon PROD-001/008 (DUN-013). L'objectif commence à sa date enregistrée, ne compte que les journées closes à 100 %, ignore les jours de Repos explicitement enregistrés et une journée vide ou incomplète hors Repos rompt la série. Le jour de confirmation est éligible, même avec des tâches antérieures à la confirmation ; une journée close ne se rouvre pas en voyage. Aucun repos rétroactif sur une journée close. La première réussite et la série courante sont distinctes. L'objectif et les statistiques doivent partager une seule règle de série.
- La matrice de droits doit être vérifiée dans le code **et** côté serveur pour le cloud payant. Les tags créés en Dun+ restent actifs après expiration ; les répétitions de rappels s'arrêtent ; les choix visuels déjà sélectionnés restent visibles. Ne jamais mettre de secret dans `EXPO_PUBLIC_*` ni journaliser les contenus de `.env`/`.env.local`.
- Toute évolution Supabase passe par une migration versionnée et une vérification des règles RLS/RPC. Ne pas faire de modification manuelle non tracée dans le tableau de bord. Les actions de publication App Store, de déploiement et de suppression de données de production appartiennent aux tâches de release/maintenance prévues par la roadmap.

## Vérifications adaptées au changement

- Les commandes de contrôle et leurs limites sont décrites dans `docs/quality.md` et `package.json` : typecheck app/Node/tests/Deno, lint global et tests Jest. Les régressions connues attendues restent des défauts ouverts ; ne pas présenter leur reproduction comme une conformité V1.
- Si une traduction change, éditer `locales/*.yaml`, exécuter `npm run i18n:generate` puis inclure le fichier généré. Pour une dépendance Expo, employer `npx expo install <paquet>` et vérifier la documentation de la **version SDK 56**, sans mettre à jour le SDK au passage.
- Ajouter des tests utiles pour les migrations, règles de dates, objectif/repos, droits, synchronisation et récupération de données. Vérifier sur iPhone/TestFlight les comportements natifs, achats et notifications quand la tâche le demande. Distinguer clairement un défaut préexistant d'une régression introduite.
- À la fin, résumer ce qui a changé, les contrôles exécutés et leurs résultats, les risques restants et la prochaine tâche prête. Ne jamais cacher une vérification impossible.

## Livraison et identité V1

- Builds et distribution via Xcode → TestFlight/App Store Connect, EAS facultatif. Aucun build ou envoi implicite. France, français et anglais au lancement.
- Gratuit sans compte ; compte Dun requis avant achat et cloud. Email/mot de passe seuls. Espaces séparés, transfert explicite ; déconnexion masque les données jusqu’à reconnexion. Seulement des comptes de test, aucune suppression implicite ni migration de clientèle artificielle.
