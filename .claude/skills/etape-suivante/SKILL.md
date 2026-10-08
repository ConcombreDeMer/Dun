---
name: etape-suivante
description: Faire avancer la roadmap de Dun d'une étape. L'agent choisit la prochaine étape de docs/roadmap.md, propose un plan, le fait implémenter par le sous-agent implementeur, relit en boucle jusqu'à ce qu'il ne reste plus de problème bloquant, met à jour la documentation, puis rend la main avant tout commit. À utiliser quand Yanis lance /etape-suivante, ou demande de passer à l'étape suivante, de continuer la roadmap ou d'attaquer une phase.
---

# Étape suivante de la roadmap

Tu es l'**agent principal**. Tu planifies, tu délègues l'implémentation, tu relis et tu tiens la documentation à jour. **Tu ne modifies jamais toi-même le code de l'étape** : c'est le rôle du sous-agent `implementeur`. Si tu corrigeais toi-même, tu relirais ton propre travail, et la revue perdrait son intérêt.

Les seuls fichiers que tu écris sont le fichier d'étape (`docs/etapes/…`) et `docs/roadmap.md`.

Suis les sections dans l'ordre. Ne saute une section que si elle le dit.

---

## 1. État des lieux

Lance ces commandes et lis leur résultat :

```bash
git status --short --branch
```

```bash
git fetch --quiet && git branch --no-merged master
```

Arrête-toi et demande à Yanis quoi faire dans les cas suivants :
- **Modifications non commitées** sans rapport avec une étape en cours.
- **Branche d'étape non fusionnée** : `git branch --no-merged master` liste une branche d'étape précédente. Sa PR n'est sans doute pas encore fusionnée, et la nouvelle étape partirait d'un état périmé.

**Si tu n'es pas sur `master`**, ou que `master` est en retard sur `origin/master`, bascule et mets à jour : `git switch master && git pull --ff-only`.

Lis ensuite :
1. `docs/roadmap.md`, en particulier la section « État d'avancement » et la phase en cours ;
2. le fichier le plus récent de `docs/etapes/`, notamment sa section « Pour l'étape suivante » ;
3. les sections de `offre-commerciale-v1-pour-agents.md` qui concernent la phase.

## 2. Choisir l'étape

- **Point de départ.** Prends les premières cases non cochées de la phase en cours. Une phase ne commence que lorsque le critère « Terminé quand » de la précédente est atteint. Si ce critère reste à vérifier, l'étape suivante consiste justement à le vérifier.
- **Taille.** Regroupe des cases cohérentes pour que l'étape tienne dans **une PR relisable** : en ordre de grandeur, une à deux journées de travail, et un diff que Yanis peut relire en une fois (les suppressions et le formatage automatique mis à part). Si une case est trop grosse, découpe-la et dis-le dans le plan.
- **Identifiant.** `P<phase>-<numéro sur 2 chiffres>`, numéroté dans l'ordre au sein de la phase, suivi d'un slug court, par exemple `P0-01-menage`.
- **Branche.** `<type>/<id-en-minuscules>-<slug>`, par exemple `chore/p0-01-menage`.

## 3. Proposer le plan

Passe en mode plan avec `EnterPlanMode`. Explore le code concerné, puis rédige le plan avec ces rubriques :

- **Étape** : identifiant, titre et branche.
- **Contexte** : pourquoi cette étape maintenant, et ce que les étapes précédentes ont laissé.
- **Périmètre** : les cases de la roadmap couvertes, recopiées mot pour mot.
- **Hors périmètre** : ce qu'on ne touche pas volontairement, même si c'est tentant.
- **Modifications** : fichiers concernés et nature de chaque changement. Pour un même schéma répété, décris-le une fois et donne quelques exemples.
- **Critères d'acceptation** : vérifiables un par un, et numérotés (CA1, CA2…) pour que la revue puisse s'y référer.
- **Vérification** : les commandes à lancer, et les tests manuels à faire sur simulateur si l'interface change.
- **Questions et risques** : toute ambiguïté produit, toute contradiction entre roadmap, offre et code, tout besoin de modifier la roadmap. **Pose les questions ; ne tranche pas.**

Soumets le plan avec `ExitPlanMode` et attends la validation. Si Yanis l'amende, intègre ses remarques et soumets-le de nouveau.

## 4. Préparer l'étape

Une fois le plan validé :

1. Crée la branche depuis `master` à jour : `git switch -c <branche>`.
2. Crée `docs/etapes/<id>-<slug>.md` à partir du modèle de `docs/etapes/README.md`. Recopie-y le plan validé, avec le statut `en cours`.

Ce fichier est le **brief unique** du sous-agent : tout ce qu'il doit savoir s'y trouve.

## 5. Faire implémenter

Lance le sous-agent avec l'outil `Agent` : `subagent_type: "implementeur"` et `run_in_background: false`, car la revue dépend de son résultat. Son prompt contient :
- le chemin du fichier d'étape et le nom de la branche ;
- la consigne de lire `CLAUDE.md`, puis le fichier d'étape, et d'implémenter le plan.

**Garde son identifiant.** Pendant la boucle de revue, tu le relanceras avec `SendMessage` pour qu'il garde le contexte de ce qu'il a déjà fait.

## 6. Relire

**Ne te fie pas au rapport du sous-agent : vérifie toi-même.**

1. **Lire tout ce qui a changé.** Lance `git status --short`, puis `git diff master...HEAD` et `git diff` : tant que rien n'est commité, tout est dans le second. Lis aussi les fichiers non suivis.
2. **Relancer toi-même la vérification** du plan (voir `CLAUDE.md`, section Vérification).
3. **Pour une modification d'interface**, vérifier sur le simulateur iOS, en clair et en sombre.
4. **Contrôler critère par critère** : chaque CA est atteint, avec une preuve (commande, fichier:ligne ou capture).
5. **Contrôler les points transversaux** : périmètre respecté, conventions de `CLAUDE.md`, conformité à l'offre, absence de régression sur le code voisin.

Pour une étape qui touche à la logique métier ou aux données, tu peux compléter par le skill `code-review` sur le diff.

**Classer chaque problème.** Un problème est **bloquant** s'il entre dans l'un de ces cas, et seulement dans ceux-là :
- la vérification échoue ;
- un critère d'acceptation n'est pas atteint ;
- une régression ou un bug introduit ;
- une faille de sécurité ou une fuite de secret ;
- une contradiction avec l'offre ou avec une règle absolue de `CLAUDE.md` ;
- une modification hors périmètre ;
- une convention de `CLAUDE.md` non respectée dans le code neuf.

Tout le reste est **non bloquant** : amélioration possible, nommage discutable, dette déjà présente avant l'étape. Ne transforme pas une préférence personnelle en bloquant.

**Consigner la revue.** Ajoute-la au fichier d'étape, section « Revue — tour N », sous forme de tableau :

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Bloquant | `lib/x.ts:42` | … | … |

Mentionne aussi ce qui a été vérifié et trouvé correct. Une revue sans problème le dit explicitement.

## 7. Boucle de correction

**S'il reste au moins un problème bloquant** :
- Relance le **même** sous-agent avec `SendMessage`, en lui transmettant les problèmes bloquants du tour : ID, fichier, problème, correction attendue.
- Les problèmes non bloquants ne lui sont pas transmis : c'est Yanis qui décidera de leur sort.
- Puis reviens à la section 6. La nouvelle revue porte sur les corrections et sur leurs effets, pas sur une relecture complète à la recherche de nouveaux sujets.

**Limite : 3 tours de correction.** Si un problème bloquant persiste après le troisième tour, ou si le sous-agent conteste un problème avec un argument sérieux, arrête la boucle. Passe à la section 8 en exposant le désaccord ou le blocage, avec ta recommandation.

**Si `SendMessage` ne permet plus de joindre le sous-agent**, lance un nouvel `implementeur`. Le fichier d'étape contient le plan et les revues précédentes, donc il dispose du contexte nécessaire.

## 8. Documenter, puis rendre la main

**Avant de rendre la main**, mets à jour dans la branche :

1. **Le fichier d'étape** :
   - statut `terminée` ;
   - résumé de ce qui a été fait ;
   - résultat de la vérification ;
   - décisions prises ;
   - problèmes non bloquants, avec leur sort ;
   - section « Pour l'étape suivante » : ce que le prochain agent doit savoir, comme un piège rencontré, une case partiellement traitée ou une dette introduite volontairement.
2. **`docs/roadmap.md`** :
   - coche les cases traitées en ajoutant le lien vers le fichier d'étape ;
   - mets à jour « État d'avancement ».

   Tu ne modifies **pas** le contenu de la roadmap au-delà, par exemple pour ajouter une tâche ou réordonner. Tu proposes ces changements à Yanis.

Puis rends la main avec ce résumé :

- **Étape** : identifiant, titre, branche.
- **Ce qui a été fait** : quelques lignes concrètes, avec les fichiers clés.
- **Vérification** : commandes et résultats, et ce qui a été testé sur simulateur.
- **Revue** : nombre de tours, problèmes bloquants corrigés, et désaccord éventuel non résolu.
- **Problèmes non bloquants** : la liste, avec ta recommandation pour chacun (corriger maintenant, ajouter à la roadmap ou ignorer). **Demande à Yanis de décider.**
- **À tester par Yanis** : ce qui mérite un essai manuel avant de commiter.
- **Commande de commit**, prête à coller, qui inclut la documentation. Pour un message long, un heredoc :

```bash
git add -A && git commit -m "chore(P0-01): <résumé>"
```

- **Ouverture de la PR**, une fois la branche poussée par Yanis : `gh pr create --base master --title "<type>(<id>): <titre>" --body-file docs/etapes/<id>-<slug>.md`.

## 9. Après la main rendue

- **Yanis demande des changements** (sur le résumé, après ses tests ou dans la PR) : traite-les comme des problèmes bloquants, avec un nouveau tour à la section 7. Ces tours ne comptent pas dans la limite de 3. Remets ensuite la documentation à jour (section 8) et redonne la commande de commit.
- **Yanis tranche sur les problèmes non bloquants** : reporte sa décision dans le fichier d'étape. Si un problème doit entrer dans la roadmap, ajoute-le dans la phase indiquée par Yanis.
- **La PR est fusionnée** : l'étape est close. La suivante se lance par un nouveau `/etape-suivante`, idéalement dans une conversation neuve, puisque tout le contexte utile est écrit dans le dépôt.
