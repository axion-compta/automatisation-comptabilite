# BLOQUE-L24-T30

## Cause
Le critère `taux-sans-geste-au-moins-85` ne peut pas passer dans le périmètre de la fiche.
Sur le jeu fictif `genererBanque()` (graine fixe), avec le réglage du banc (`banc.test.ts`) et `rapprocherEnTroisOrdres` :
- 140 lignes, dont 120 attendent une pièce (`attendus` avec `pieceIds`) ;
- 49 lignes sont RAPPROCHEE, toutes correctes (aucun faux lien) ; 39 PROPOSEE, 29 DOUTEUSE ;
- part rapprochée sans geste : 49/120 = 40,8 % (35,0 % si l'on divise par les 140 lignes).

La fiche interdit d'ajuster le jeu de données et classe le réglage des passes hors périmètre.

## Ce qu'il faudrait
Une fiche de réglage des passes (barème, seuils, tolérances, éventuellement jeu P2 dédié validé par Will) qui amène le rapprochement automatique à au moins 85 %, puis cette fiche. Le module `mesure-p2.ts` (mesurer(lignes, pieces, liens) : sansGeste, total, factures sans paiement) est prêt à être écrit : environ 25 lignes, plus 3 tests.
