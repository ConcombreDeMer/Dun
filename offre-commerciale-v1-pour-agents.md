# Décisions commerciales de Dun — V1 iPhone

Ce document rassemble les décisions prises pour l'offre publique de Dun. Il sert de référence autonome à un agent qui travaille sur le produit, ses textes ou sa présentation commerciale.

## Positionnement

- Dun sera d'abord publié sur **iPhone**, avec une version gratuite et un abonnement **Dun+**.
- Le cœur de Dun est utilisable **sans compte, sans abonnement et hors ligne**. Les données locales sur l'iPhone sont la copie de travail de tous les utilisateurs.
- La version gratuite permet réellement d'organiser et de suivre ses journées. Elle ne limite ni le nombre de tâches ni le contenu de la Box.
- Dun+ ajoute la continuité entre appareils grâce au cloud, des analyses plus détaillées et davantage de choix de personnalisation.
- Le compte est demandé pour activer ou récupérer la copie cloud, pas pour commencer à utiliser l'application.

## Répartition des fonctions

| Fonction | Gratuit | Dun+ |
| --- | --- | --- |
| Tâches et Box | Tâches datées et Box sans limite de nombre ; calendrier et historique | Les mêmes fonctions, avec synchronisation entre appareils |
| Daily, verrouillage et Repos | Daily et verrouillage des jours passés activables ou désactivables ; mode Repos | Les mêmes fonctions |
| Objectif | Premier objectif choisi à l'onboarding | Le même objectif |
| Tags | Cinq tags créables ; trois tags maximum sur une tâche | Création de tags sans plafond produit ; trois tags maximum sur une tâche |
| Rappels | Rappel quotidien à l'heure et aux jours choisis, week-end compris | Répétitions du rappel en plus |
| Statistiques | Statistiques de la semaine | Statistiques mensuelles et annuelles, analyses détaillées |
| Affichage | Thèmes clair, sombre et système ; langue ; taille du texte ; calendrier en curseur ; progression linéaire | Palettes supplémentaires ; calendrier en texte ; progression circulaire |
| Sauvegarde | Export et restauration manuels | Synchronisation et restauration cloud entre appareils en plus |

L'export et la restauration manuels restent gratuits. La copie cloud et sa récupération sur un autre appareil sont réservées à Dun+.

## Objectif, journées et Repos

- Le premier objectif correspond à la cible choisie à l'onboarding : **1, 2, 3, 4, 7 ou 14 journées réussies**.
- Une journée se clôt à **minuit**. Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire. Une journée vide hors Repos ou incomplète rompt la série.
- La journée où l'objectif est confirmé peut compter si elle se clôt à 100 %, même si des tâches ont été faites avant cette confirmation. La première réussite datée et la série courante sont distinctes. L'objectif et les statistiques utilisent la même règle de série.
- Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques. Sa date de fin est incluse. Une annulation avant minuit rend la journée en cours normale, sans modifier les jours déjà clos. Aucun Repos ne s'ajoute rétroactivement à une journée close.
- Les nouvelles journées suivent le fuseau de l'iPhone. Une journée déjà enregistrée garde sa date et ne se rouvre pas lors d'un voyage.
- Les personnes ayant déjà un compte choisissent un nouvel objectif lors de la migration de leurs données : l'ancien objectif et l'historique de Repos ne sont pas inventés.

## Droits Dun+ et expiration

- RevenueCat détermine le droit à Dun+. Le serveur vérifie aussi ce droit avant toute écriture cloud.
- La **fin effective** du droit arrête la synchronisation. Une simple annulation du renouvellement ne déclenche pas l'expiration tant que le droit reste actif.
- Les données sur l'iPhone restent disponibles après expiration ; elles ne sont jamais supprimées à cause de la fin de l'abonnement.
- Les tags déjà créés restent actifs et modifiables. Une nouvelle création est refusée tant que le total atteint au moins cinq.
- La palette et les dispositions Dun+ déjà sélectionnées restent affichées, mais le choix de nouvelles variantes Dun+ est verrouillé.
- Les répétitions des rappels s'arrêtent ; le rappel quotidien gratuit continue.
- La dernière copie cloud reste **lisible et récupérable pendant 90 jours** après la fin effective du droit. Passé ce délai, les données de productivité cloud sont supprimées après une nouvelle vérification du droit. La suppression explicite d'un compte suit son propre parcours.

## Présentation de l'offre

- L'onboarding, les réglages, l'aide, le paywall et la fiche App Store doivent annoncer uniquement les fonctions présentes dans la version publiée.
- Le paywall présente les avantages Dun+ disponibles, ainsi que le prix total, la durée, l'essai éventuel, le renouvellement, la gestion et la restauration des achats conformément aux produits Apple configurés. Les prix affichés proviennent de ces produits. Les textes légaux publiés y sont accessibles.
- L'onglet **Profil / Mon système** regroupe objectif, Daily, Repos, rappels et tags. La roue dentée garde les paramètres généraux. Aucune carte « Delay » n'est prévue.
- Les **routines et tâches récurrentes ne font pas partie de la V1**. Elles sont prévues pour une première mise à jour après publication et ne sont pas présentées comme disponibles dans l'application, le paywall ou la fiche App Store avant leur livraison.
