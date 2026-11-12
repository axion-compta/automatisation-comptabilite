VERDICT: OK

PR n°1193, fiche L22-T29, tête relue : 1c2a6abf3236c30b1878da0cb16ae20df4d6fbb9

Ce qui a été vérifié : 5 fichiers, tous dans fichiers_autorises ; diff de 179 lignes pour un maximum de 220 ; les 6 tests nommés passent ; aucun secret, aucun prix, aucun mot interdit, aucun chiffre de gain promis dans docs/temps-gagne.md ; données fictives ; journal de 5 lignes. La fiche correspond au code : le banc est déterministe, une valeur invalide donne null puis « NON MESURÉ », et l'estimation reste étiquetée dans sa propre colonne.

Mutations tuées : `d >= 0`→`d > 0`, suppression de `isFinite`, `round`→`floor`, `v >= 0`→`v > 0`, `n >= 1`→`n >= 0`, port absent, erreur de port → 0, suppression du contrôle de la graine.

## Remarques (ne bloquent pas)
- Deux mutants survivent sans conséquence pratique : borne haute des montants (`99900`→`99901`) et `graine >>> 0`→`>>> 1` (le banc reste déterministe).
- Le test `aucun-reseau` lit `outils/banc/temps-gagne.mjs` par un chemin relatif : il dépend du répertoire courant (racine du dépôt).
- Le job CI `verifier` était encore en file d'attente au moment de la relecture.
