# BLOQUE-L21-T01

## Cause
La liste blanche demandée par la fiche (`autoriser.ts` : la case `propose` refuse) casse deux tests existants hors des fichiers autorisés, dans `packages/noyau/src/securite/__tests__/capacites.test.ts` :

- `administrateur-tout-permis-sauf-matrice` : suppose que l'administrateur a les 14 actions permises. Or l'administrateur a `propose` sur `assimiler_factures_autre_nom`, qui devient refusée (`role_insuffisant`).
- `saisie-seule-raison-du-mode` : suppose que toute action non retirée par le mode est permise pour l'administrateur ; même cause.

Constaté en local : avec le changement, 2 échecs sur 159 tests de `src/securite` ; sans le changement, 154 tests verts (hors nouveaux tests).

## Correction minimale
Ajouter `packages/noyau/src/securite/__tests__/capacites.test.ts` aux `fichiers_autorises` de la fiche (et ajuster la taille), puis, dans ces deux tests, exclure l'action `assimiler_factures_autre_nom` de l'attendu « permis » pour l'administrateur (elle est refusée avec `role_insuffisant`). Le test `meme-resultat-qu-autoriser` reste vrai sans changement.

Le changement de `autoriser.ts` (liste blanche : `O`, `active`, `M` avec périmètre, `sep` si séparation respectée, `lecture_seule` hors écriture ; le reste refuse) et les 5 tests nommés de la fiche étaient prêts et verts.
