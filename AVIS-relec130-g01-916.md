VERDICT: OK

PR : 916 (fiche L15-T59, sensible : fusion par Will seul)
SHA relu : 56f0fac404caac822c8472428d2ebc29981489dd

## Défaut de l'ancien avis (relec121-g01-916)
- `depots-interface-transverse.ts:75`, `_options` inutilisé : corrigé. Le paramètre s'appelle désormais `options`, et `options.nouvelId()` est utilisé dans `alertes.ajouter` quand l'id est vide. `eslint` passe sur `apps/serveur/src/base`, sans aucune règle assouplie.
- Taille : 380 lignes (46+131+136+59+1+1+6), exactement la limite de la fiche et sous 400. Le correctif ne change que 2 lignes, pour 0 ligne nette.

## Contrôles
- Fichiers modifiés : les 6 `fichiers_autorises` seulement. Aucune ligne « - - ».
- Tests de la fiche : 31/31 verts. `node outils/gardes/migrations.mjs` est vert. `node scripts/verifier.mjs` (rc 0) passe sur ce SHA.
- Mutations : alerte active limitée à `ouverte`, contrôle de doublon retiré, `supprimer` du journal accepté. Chacune fait rougir un test.
- Règle 13 : dépôt en mémoire, aucune base, aucune adresse, aucun secret. Données fictives, aucun mot interdit, aucun prix. Journal : 6 lignes, il commence par `# Journal L15-T59`.

## Remarques (non bloquantes)
- Aucun test ne couvre la branche `options.nouvelId()` (ajout d'une alerte d'id vide). Si on la remplace par une constante, tout reste vert. Elle n'est pas exigée par la fiche et la taille est à la limite. À couvrir dans une fiche suivante.
