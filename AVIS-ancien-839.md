VERDICT: A CORRIGER
SHA relu : b1b19b784d631a71d10c6b58321a22f0f0487e09
PR : #839 (lot-14/L14-T08). Fiche non sensible (sensible: non ; diff limité à REPRENDRE.md, fiche et journal de la PR).

## Contrôles
- Périmètre : REPRENDRE.md, pilotage/fiches/L14-T08.md, pilotage/journal/L14-T08.md, tous dans `fichiers_autorises`.
- Taille : 30 lignes ajoutées, 2 retirées (limite 80).
- Section « Lot 14 » : 21 lignes (limite 25). Sections des autres lots intactes ; seule « Prochaine commande » change, comme la fiche le demande.
- Journal : 8 lignes, commence par `# Journal L14-T08`.
- Aucun mot interdit, aucun prix, aucune date de livraison annoncée, aucune mention d'acceptation par une administration.
- Fusion avec origin/main (209622b) : pas de conflit.

## Défauts
1. REPRENDRE.md (section « Lot 14 », lignes « Restent `a_faire` », T34 et T37) : depuis le commit relu, origin/main a fusionné L14-T34 (#845) et L14-T37 (#846) ; leurs fiches portent `statut: fait`. La section les donne encore comme restant à faire, ce qui est faux sur main. Correction : remettre la branche à jour sur origin/main, sortir T34 et T37 de la liste des restes (ou les indiquer comme faites) et ne laisser que T36, T38, T39, T40 et T41.
2. REPRENDRE.md, « Prochaine commande » : la ligne renvoie à « L14-T34 et L14-T36 à L14-T41 » ; T34 et T37 sont faites. Correction : citer seulement les fiches encore `a_faire`.
3. REPRENDRE.md, mesures (« 45 PR fusionnées », médianes 41,9 min et 39,8 min) : relevées avant les fusions #845 et #846, toutes deux du lot 14. Correction : refaire le relevé après la remise à jour et indiquer la date et l'heure du relevé, ou écrire « non mesuré ».

## Remarques
- Le décompte mêle les PR de fiches et les PR de création de fiches (déjà signalé dans le texte) ; séparer les deux serait plus utile pour le calibrage.
- `pnpm verifier` non relancé ici ; la CI de la PR est verte au SHA relu.
