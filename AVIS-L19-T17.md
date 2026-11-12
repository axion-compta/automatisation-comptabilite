VERDICT: A CORRIGER

PR #1143, fiche L19-T17. Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête bfbe84b3e884576c25ec877dba8bf8b2575318e2.

## Constat
- Aucune correction n'a été poussée. La tête est toujours bfbe84b3e884576c25ec877dba8bf8b2575318e2, le SHA déjà relu au premier tour. La branche n'a reçu aucun commit, et la PR n'a reçu aucun commentaire de correction.
- J'ai refait une mutation : `m.pieges_pct > 100` → `>= 100` (`outils/essais/parcours.mjs:39`). Elle SURVIT toujours (8 tests sur 8 verts).

## Défauts toujours ouverts (inchangés, voir l'avis précédent)
1. `outils/essais/parcours.mjs:39` : il faut ajouter dans les tests `lireRapport` avec `pieges_pct: 100` et `pieges_pct: 0`, tous deux acceptés.
2. `parcours.mjs:34` : il faut ajouter un test avec `version: 2`, dont l'erreur attendue correspond à /version/.
3. `parcours.mjs:17` et `parcours.mjs:19` : il faut un test pour une ligne à 6 colonnes et un autre pour un seuil négatif (« -1 »), tous deux refusés.

## Remarques
- La base de la PR (5ed234d2) est en retard sur main. Le correcteur doit faire `git merge origin/main` avant de pousser (pas de rebase ni de force-push).
- main est rouge à cause de `outils/exploitation/__tests__/ouverture.test.mjs`, qui attend `porte` et lit `porte_rgpd`. Ce test vient des PR n°1215 et n°1146. Après la mise à niveau, la CI de cette PR rougira pour cette raison, qui n'est pas un défaut de l'auteur.

SHA de tête relu : bfbe84b3e884576c25ec877dba8bf8b2575318e2
