# BLOQUE-L24-T31

## Cause
La fiche exige que l'action `tester` demande un résultat `{ total, reussis }` et que `publier` soit refusé sans résultat tout vert. Deux tests existants, hors `fichiers_autorises`, appellent `tester` sans résultat puis `publier` et passeraient au rouge :
- `packages/noyau/src/sources/__tests__/veille-circuit.test.ts` ligne 37 (test `circuit-complet-dans-l-ordre`) ;
- `packages/noyau/src/sources/__tests__/veille-circuit-complements.test.ts` ligne 45 (aide `jusqua`, utilisée par plusieurs tests).

## Correction minimale
Au choix de Will :
1. élargir `fichiers_autorises` de la fiche à ces deux fichiers de test, pour y passer un résultat `{ total: 3, reussis: 3 }` à l'appel `tester` ; ou
2. confirmer que `veille-circuit.ts` peut garder `tester` sans résultat (aucun résultat enregistré) et ne refuser `publier` que si le dernier résultat manque ou est incomplet, ce qui casse quand même les mêmes tests.

L'option 1 est la seule cohérente avec la fiche. Aucune modification de garde ni de test n'a été faite.
