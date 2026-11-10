VERDICT: A CORRIGER
SHA relu: 14c2c0ab1ed6c76bc3a92284f07b6cab60ecfcc5

PR 971, fiche L03-T07 (sortie du lot 03 : REPRENDRE.md et mesures), relecture Opus locale.

Défaut :
- REPRENDRE.md, section « Lot 03 », ligne « Fiches : 59 (T00 à T58) ; 57 `statut: fait` avec L03-T07 ». Le compte est faux. Sur la branche, les en-têtes des 59 fiches L03 donnent 58 `statut: fait` (L03-T07 compris) et 1 `a_faire` (L03-T58). La fiche exige des chiffres mesurés. Correction : écrire « 58 `statut: fait` avec L03-T07 ».

Vérifié :
- Périmètre : 3 fichiers, tous dans fichiers_autorises (REPRENDRE.md, la fiche, le journal). Le diff fait 22 lignes, pour 60 permises.
- Section « Lot 03 » : 13 lignes, pour 25 au plus. Elle dit ce qui existe, ce qui reste et ce qui est bloqué. Elle signale l'écart : T52 à T57 sont faites.
- 65 PR fusionnées au titre L03-T : recompté avec `gh pr list --state merged`, c'est exact.
- Le FEC n'est pas déclaré accepté (J7). Aucune date de livraison. Aucun prix, aucun nom réel, aucun mot interdit.
- Journal : 7 lignes, il commence par « # Journal L03-T07 ».
- CI : 9 contrôles verts.

Remarques (non bloquantes) :
- Médianes 16,0 et 31,9 min : non recalculées ici.
- Stryker 86,67 % (195 tués, 30 survivants) sur main 3217534 : c'est le même chiffre que celui du lot 02 (main 69605cb). C'est plausible, mais à confirmer si la mesure a bien été relancée.
