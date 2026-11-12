VERDICT: A CORRIGER
SHA de tête relu : a6ab6ab494dd1169ad8f7f618d9883e5d36c2a60 (PR n°1167, fiche L22-T15, sensible : fusion par Will seul)

## Défauts
1. `packages/noyau/src/ecritures/etats.ts:92-103` (`validerJustifiee`) : le motif est un argument séparé et n'est jamais rattaché à l'écriture, alors que `Ecriture.motif` existe (`ecritures/modele.ts:24`) et sert déjà à porter le motif sans justificatif des frais (`motifEcriture`). Sonde lancée au SHA ci-dessus :
   - écriture portant déjà `motif: 'Ticket perdu'`, sans pièce, argument `''` → refus `piece_ou_motif_requis` (à tort) ;
   - écriture sans motif, argument `'Ticket perdu'` → validée, mais `motif` vaut `undefined` sur l'écriture validée : la justification qui a permis la validation est perdue.
   Correction demandée : le motif retenu est `motif` (argument) s'il est non vide, sinon `e.motif` ; `exigerJustification` reçoit ce motif retenu ; l'écriture validée porte ce motif (`{ ...e, motif }` avant `valider`, `valider` restant inchangé). Ajouter dans `lien-piece.test.ts` deux assertions : écriture avec `motif` déjà présent et argument vide → validée ; validation par motif → `v.motif === 'Ticket perdu'`. L'aide `ecriture(motif?)` du test, aujourd'hui jamais appelée avec un motif, peut servir.

## Contrôles
- Fichiers : les 5 fichiers modifiés sont dans `fichiers_autorises`. Taille : 180 lignes (max 180).
- Tests : `lien-piece.test.ts` (7 tests nommés) et `etats.test.ts` : 17/17 verts, attentes existantes inchangées. tsc et eslint verts ; CI de la PR verte.
- Mutations à la main (8) : retrait de chaque terme du doublon exact, `trim()` retiré, lien d'une autre écriture accepté, ancres de l'empreinte retirées, appel de `exigerJustification` retiré : toutes tuées.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives. Journal : 6 lignes.
