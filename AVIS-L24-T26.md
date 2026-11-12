VERDICT: OK

PR n°1170, tête relue : 3d028c634bdace3f53b8ee71e194c58ac958afef

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises` ; 98 lignes, sous `taille_max_lignes` (150).
- 4 tests nommés présents et verts en local (vitest, Node 22).
- Mutations tuées : `normalize('NFD')` retiré, `toLowerCase()` retiré, découpe sur espaces seulement (« Montant_brut », « Net-versé »), chacune des trois colonnes brut, frais, net retirée de la condition, `lignesIgnorees` figé, code du refus changé.
- Mot entier exigé (« Internet » refusé), en-têtes vides refusés, relevé bancaire ordinaire rendu `{ reconnu: false }`.
- Aucun nom de plateforme réelle, aucun secret, aucun prix, aucun mot interdit ; journal de 6 lignes commençant par `# Journal L24-T26`.

## Remarques
- `packages/noyau/src/banque/import/plateforme.ts:27` : la mutation retirant `.filter((m) => m !== '')` survit, mais elle est équivalente (un mot vide ne vaut jamais brut, frais ni net). Rien à faire.
- `packages/noyau/src/banque/import/plateforme.ts:35` : la copie `[...MARCHE]` n'est pas testée (rendre `MARCHE` lui-même survit). Un test qui modifie `marcheASuivre` d'un premier résultat puis vérifie un second protégerait cette copie. Non bloquant.
