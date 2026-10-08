# Fichiers d'étape

Chaque étape de la [roadmap](../roadmap.md) a son fichier ici, nommé `<id>-<slug>.md` (par exemple `P0-01-menage.md`). Il est créé par l'agent principal dès que le plan est validé, puis complété jusqu'à la fin de l'étape. Il sert à la fois :
- de **brief** pour le sous-agent `implementeur` ;
- de **trace** des revues et des décisions ;
- de **corps de PR** ;
- de **mémoire** pour l'agent qui prendra l'étape suivante.

La procédure complète est décrite dans [`.claude/skills/etape-suivante/SKILL.md`](../../.claude/skills/etape-suivante/SKILL.md).

## Modèle

```markdown
# <id> — <titre>

- **Statut** : en cours | terminée
- **Branche** : `<type>/<id>-<slug>`
- **Phase** : <n> — <nom de la phase>

## Plan validé

### Contexte
…

### Périmètre
Cases de la roadmap couvertes, recopiées mot pour mot :
- [ ] …

### Hors périmètre
- …

### Modifications
- `chemin` — …

### Critères d'acceptation
- **CA1** — …
- **CA2** — …

### Vérification
- …

### Questions et risques
- … (avec la réponse de Yanis)

## Revue — tour 1

| ID | Gravité | Fichier:ligne | Problème | Correction attendue |
|---|---|---|---|---|
| R1-1 | Bloquant | … | … | … |

Vérifié et correct : …

## Résultat

### Ce qui a été fait
- …

### Vérification finale
- …

### Décisions
- …

### Problèmes non bloquants
| ID | Problème | Décision de Yanis |
|---|---|---|
| R1-2 | … | corrigé / ajouté à la roadmap (phase n) / ignoré |

## Pour l'étape suivante
- …
```
