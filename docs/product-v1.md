# Dun — spécification produit V1

Référence consolidée le 1 octobre 2026, PROD-001 (DUN-001/004).
Le plan de reprise et ses recommandations techniques ont été explicitement approuvés dans la conversation. Cette spécification décrit la cible ; elle ne certifie pas que le code actuel la respecte.

## Autorité et périmètre

1. Décisions explicites du propriétaire.
2. `ROADMAP_PRODUCTION.md`, notamment section 12 ; cette spécification en est la traduction exploitable.
3. Document commercial `offre-commerciale-v1-pour-agents.md` fourni sur le Bureau, complété par les décisions Q/L.
4. `ROADMAP.md` et `AGENTS.md` pour la traçabilité et les conventions compatibles.
5. Le code et l'audit décrivent l'existant, pas les règles produit à conserver.

V1 iPhone, lancement en France, app et présentation FR/EN. Europe et monde ultérieurement (L02). Expo SDK 56 conservé. Archives et distribution via Xcode Organizer → TestFlight/App Store Connect ; EAS facultatif (L01). Un iPhone 15 Pro Max disponible, autres validations à organiser (L03). Ni routines, ni second objectif, ni achat invité, ni connexion sociale en V1.

## Matrice de capacités

| Fonction | Gratuit | Dun+ | Invariant / lot |
|---|---|---|---|
| Tâches datées, calendrier, historique, Box | Illimités en local | Identiques et synchronisés | Box = tâche sans date ; PROD-010/011/019 |
| Daily, verrouillage du passé, Repos | Configurables indépendamment | Identiques | Daily ne change pas la série ; 008/019/021 |
| Premier objectif | Cible 1, 2, 3, 4, 7 ou 14 | Identique et synchronisé | Pas de second objectif V1 ; Q06-S, 008/021 |
| Tags | Création permise si moins de 5 tags présents | Pas de plafond produit de création | 3 tags maximum par tâche ; 019 |
| Rappel de base | Heure et jours choisis, week-end compris | Identique | Aucun rappel en Repos ; Q08, 020 |
| Répétitions | Non programmées | 1–3 répétitions espacées de 15–240 minutes | Arrêt à minuit et à la fin du droit ; Q08-L, 020 |
| Statistiques | Semaine, série, jours parfaits | Mois/année et analyses détaillées prévues | Ne pas inventer d'autres modules ; 021/023 |
| Affichage de base | Clair/sombre/système, langue, taille du texte, calendrier curseur, progression linéaire | Identique | Accessibilité gratuite ; 019/027 |
| Variantes visuelles | Sélections premium antérieures conservées | Nouvelles palettes, calendrier texte, progression circulaire | Verrouiller la nouvelle sélection, jamais réinitialiser ; 019 |
| Sauvegarde manuelle | Export et restauration | Identiques | Remplacement confirmé, sauvegarde préalable ; Q11, 012 |
| Cloud | Aucun pour un nouvel utilisateur gratuit | Synchronisation et récupération multi-appareils | Compte et droit vérifié côté serveur ; 014–018 |
| Cloud expiré | Exception : dernière copie récupérable 90 jours | Reprise si droit rétabli | Aucune nouvelle écriture pendant expiration ; 018 |

Le seuil de tags n'est ni mensuel ni annuel. Après expiration, 12 tags existants restent actifs et modifiables ; aucune création tant qu'il en reste au moins 5. Un import préservant plus de 5 tags n'est pas rejeté pour ce seul motif. Aucun quota commercial d'appareils ou de taille d'historique n'est introduit par les limites techniques des fichiers/réseaux.

## Journée, objectif et Repos

- Journée civile close à **minuit**, suivant le fuseau de l'iPhone pour les nouvelles journées. Une date déjà enregistrée reste fixe et une journée close ne se rouvre pas lors d'un voyage.
- La cible et la date de confirmation de l'objectif sont persistées. Le jour de confirmation est éligible, y compris ses tâches effectuées avant confirmation. Aucun jour antérieur ne compte.
- Journée réussie : close, non Repos, au moins une tâche, 100 % terminées. Journée ouverte à 100 % : résultat provisoire. Jour clos vide ou incomplet hors Repos : série interrompue.
- Repos activé pendant la journée ouverte : journée entière neutre. Fin incluse. Annulation avant minuit : journée courante normale ; jours clos inchangés. Aucun ajout rétroactif sur journée close.
- Repos exclu des dénominateurs de performance, jours parfaits et charge ; activité brute éventuellement accomplie reste distincte. Une préférence de visibilité ne modifie pas la vérité métier.
- Objectif, Daily et statistiques consomment une règle de série commune (PROD-008). Le Daily est une revue ; sa finalisation n'est pas la clôture civile.
- Première réussite datée persistée comme événement historique. Une édition passée recalcule la série actuelle sans supprimer cette première réussite (Q06). Après la première réussite, suivi de la série, sans nouveau choix d'objectif (Q06-S).

### Exemples d'acceptation datés

| ID | Situation | Résultat attendu |
|---|---|---|
| P01 | Paris, 01/10/2026 à 23:59:59 ; toutes les tâches terminées | 01/10 encore provisoire ; à 02/10 00:00 il devient éligible |
| P02 | Objectif confirmé le 01/10 à 18 h ; tâches faites dès 10 h | 01/10 peut compter à sa clôture ; 30/09 ne compte pas |
| P03 | 01/10 réussi, 02/10 vide sans Repos, 03/10 réussi | Série close le 04/10 : 1 |
| P04 | 01/10 réussi, Repos 02–03/10 inclus, 04/10 réussi | Série close le 05/10 : 2 ; Repos n'incrémente pas |
| P05 | Repos activé 02/10 à 14 h après des tâches terminées | Tout le 02/10 est neutre, aucune notification pendant le Repos |
| P06 | Repos annulé le 03/10 à 20 h | 03/10 redevient normal ; le statut clos du 02/10 reste neutre |
| P07 | Première réussite enregistrée 03/10, édition du 01/10 le 05/10 | Série recalculée ; première réussite historique du 03/10 conservée |
| P08 | Voyage vers un fuseau où le calendrier revient au jour précédent | Aucun jour déjà clos rouvert ; aucune seconde occurrence de sa clé |
| P09 | Journée Paris 25/10/2026, changement d'heure | Clôture au prochain minuit local, pas après une durée fixe de 24 h |
| P10 | Rappel vendredi 02/10 à 23:50, répétition +30 minutes | Rappel de base possible ; répétition supprimée, pas déplacée au samedi |

P01–P10 sont des attentes pour PROD-008/020, pas une recette native exécutée dans PROD-001.

## Identité, transfert et disparition des données

- Gratuit utilisable sans compte et hors ligne. Compte Dun requis **avant achat** ainsi qu'avant activation/récupération cloud (Q03, exception au texte commercial initial).
- Email/mot de passe uniquement (Q10). Espaces invité et comptes séparés ; connexion ou changement de compte ne fusionne rien (Q02).
- Transfert explicite avec aperçu, confirmation et reprise. Les détails transactionnels sont dans `data-contract-v1.md`.
- Déconnexion : espace du compte masqué jusqu'à reconnexion (Q07), pas effacé.
- Suppression explicite du compte : information claire puis suppression des données concernées, sans option de conservation locale V1. Ne pas promettre l'effacement instantané d'un appareil hors ligne ou d'exports externes. Annuler un abonnement Apple est une opération distincte (Q07).
- Seulement des comptes de test (Q01). Pas de migration de clientèle à inventer ; PROD-017 reste conditionnel. Aucune autorisation d'effacer ces comptes de test.

## Droits et échéances

RevenueCat détermine Dun+. Le serveur vérifie séparément le propriétaire et le droit avant toute écriture cloud. Une annulation de renouvellement ne retire pas un droit encore actif ; la grâce dépend du droit réellement maintenu. Prix, essais, transferts d'achats et réglages de grâce restent à vérifier dans PROD-013/023.

À la fin effective du droit : arrêt sync/écritures cloud, conservation locale intégrale, tags et apparence sélectionnée conservés, nouvelles actions premium verrouillées, répétitions arrêtées et rappel gratuit maintenu hors Repos.

État RevenueCat inconnu : conserver les capacités premium locales jusqu'à la dernière échéance connue liée à l'identité, sans prolongation arbitraire (Q05). Si le serveur ne peut vérifier le droit : suspendre les envois, conserver les changements locaux et reprendre après vérification (Q05-S).

Précision technique Q12-T approuvée dans le plan du 01/10 : durées exactes UTC, borne supérieure exclue.

- Copie cloud récupérable tant que `now < entitlementEndedAt + 90 × 24 h`. À l'échéance, récupération expirée ; purge seulement après nouvelle vérification, reportée si le droit est inconnu. Compte Auth conservé (Q12-C). Jamais de purge glissante des vieilles tâches.
- Version remplacée récupérable tant que `now < replacedAt + 7 × 24 h`, `replacedAt` attribué par le serveur. Suppression explicite du compte prioritaire. Ce délai ne limite pas l'historique courant (Q12-V).
- Exemple : fin effective `2026-10-01T12:00:00.000Z` → échéance `2026-12-30T12:00:00.000Z`. Une réception tardive de webhook ne décale pas cette date.
- Exemple : remplacement `2026-10-01T12:00:00.000Z` → récupération avant `2026-10-08T12:00:00.000Z`, pas à cet instant.

La rétention des diagnostics et sauvegardes serveur reste ouverte dans PROD-024/026 ; ces services n'ont pas été inspectés. Ne pas contourner les suppressions avec des archives cachées conservées indéfiniment.

## Conflits, restauration, présentation

Dernière action distincte reçue et validée par le serveur gagnante, suppression/modification comprises ; anciennes versions récupérables 7 jours (Q04/Q12-V). L'heure du téléphone ne départage pas les conflits. Un rejeu du même ID d'opération conserve son résultat initial.

Restauration manuelle : remplacement de l'espace choisi, confirmation et sauvegarde préalable ; propagation aux autres appareils si cloud actif et autorisé. Pas de fusion implicite ni d'abonnement accordé par le fichier (Q11).

Profil / Mon système regroupe objectif, Daily, Repos, rappels et tags. Roue dentée pour les réglages généraux ; aucune carte Delay. Paywall, onboarding et Store annoncent uniquement les fonctions livrées ; prix/essai issus des produits Apple réellement disponibles. Routines reportées à PROD-031/DUN-053.

Support et inscription bêta du site distinct conservés ; nom du profil non public (Q09). Leur correction serveur reste PROD-004/024, pas une opération de ce lot documentaire.

## Traçabilité et limites

La section 12 de la roadmap conserve Q01–Q12 et L01–L03. PROD-001 ↔ DUN-001/004 ; PROD-006 ↔ DUN-019/020/021/022 ; PROD-007 ↔ DUN-047. Les correspondances ne permettent pas de cocher les anciens lots dont le périmètre est plus large (paywall, build, transactions, RLS).

Les déficits E01–E20 restent ouverts dans leurs lots d'implémentation. Aucune règle métier de l'app, traduction, configuration distante, migration ou archive Xcode n'est changée par cette spécification.
