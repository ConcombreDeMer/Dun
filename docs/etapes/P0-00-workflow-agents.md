# P0-00 — Workflow des agents

- **Statut** : terminée
- **Branche** : `chore/workflow-agents`
- **Phase** : 0 — Assainir

Cette étape a été menée avant que le workflow n'existe. Elle n'a donc pas suivi la boucle plan → implémentation → revue : elle la met en place.

## Contexte

Yanis veut un comportement d'agent précis pour suivre la roadmap :
1. un plan soumis puis validé ;
2. une implémentation par un sous-agent ;
3. une revue qui classe chaque problème en bloquant ou non bloquant ;
4. une boucle de correction tant qu'un problème bloquant subsiste ;
5. une main rendue avant tout commit ;
6. une documentation à jour pour l'agent suivant.

Codex n'est plus utilisé : le workflow est conçu pour Claude Code uniquement.

## Décisions

- **Contexte du sous-agent.** Un sous-agent ne partage pas le contexte de l'agent principal. Le plan validé est donc écrit dans un fichier d'étape, qui sert de brief. Pendant la boucle de correction, le même sous-agent est relancé avec `SendMessage` et garde ainsi son contexte.
- **Moment de la mise à jour de la doc.** Roadmap et fichier d'étape sont mis à jour **dans la branche de l'étape, avant le commit**, et non après le push. Ainsi, une fois la PR fusionnée, `master` et sa documentation disent la même chose.
- **Limite de la boucle.** 3 tours de correction au maximum, puis Yanis est consulté.
- **Taille d'une étape.** Une étape tient dans une PR. L'étape suivante ne démarre qu'après la fusion de la précédente.
- **Suivi.** Pas d'issues GitHub : la roadmap et les fichiers d'étape suffisent. La section « Nouveau workflow » de la roadmap a été réécrite en conséquence.
- **Instructions.** Elles sont dans `CLAUDE.md` à la racine. Le fichier `AGENTS.md` prévu par la roadmap n'a plus lieu d'être sans Codex.
- **Commit, push et PR bloqués** par des règles `deny` dans `.claude/settings.json`, en plus de l'instruction écrite.

## Ce qui a été fait

- `CLAUDE.md` : sources de vérité, règles absolues, vérification, conventions, définition de « terminé ».
- `.claude/skills/etape-suivante/SKILL.md` : la procédure complète de l'agent principal.
- `.claude/agents/implementeur.md` : le sous-agent d'implémentation, avec son format de rapport.
- `.claude/settings.json` : refus de `git commit`, `git push`, `git merge`, `git rebase`, `git reset --hard`, `gh pr create` et `gh pr merge`.
- `docs/etapes/README.md` : rôle et modèle des fichiers d'étape.
- `docs/roadmap.md` :
  - ajout de la section « État d'avancement » ;
  - tâches de documentation de la phase 0 ajustées (`CLAUDE.md` au lieu d'`AGENTS.md` et de `docs/conventions.md`) ;
  - section « Workflow » réécrite.

## Vérification finale

- Les liens internes entre `CLAUDE.md`, le skill, la roadmap et `docs/etapes/` pointent vers des fichiers existants.
- Le skill et le sous-agent ne sont chargés par Claude Code qu'au démarrage d'une **nouvelle session**. La commande `/etape-suivante` et le refus des commandes git sont donc à tester dans une conversation neuve.

## Pour l'étape suivante

- **Point de départ.** Commencer la phase 0 par le ménage, en lançant `/etape-suivante` dans une conversation neuve.
- **Vérification provisoire.** `npm run check` n'existe pas encore. En attendant, la vérification est `npx tsc --noEmit` et `npm run lint`. Les erreurs `tsc` dans `supabase/functions/beta-signup/index.ts` sont connues.
- **Fichiers non suivis.** `.github/workflows/quality.yml` et `.nvmrc`, non suivis, viennent d'une ancienne tentative. La modification de `.gitignore` (ajout de `coverage/`) est aussi un reste. La phase 0 doit décider de leur sort ; ils ne font pas partie de cette étape.
- **Mise à jour à prévoir.** Quand `npm run check` existera, mettre à jour la section « Vérification » de `CLAUDE.md`.
