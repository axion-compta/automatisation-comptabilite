VERDICT: A CORRIGER
SHA relu : f703382b6c8d29ee8a3945c5fda776628b063fa6

Fiche L02-T06, PR 957 (sortie du lot 02). Relecture du 09/11/2026, au même SHA que l'avis précédent : constat inchangé.

## Contrôles
- 3 fichiers modifiés, tous dans `fichiers_autorises` (REPRENDRE.md, fiche, journal). 22 ajouts, 3 retraits : sous `taille_max_lignes: 80`.
- Journal `pilotage/journal/L02-T06.md` : 9 lignes, commence par `# Journal L02-T06`.
- Bloc « Lot 02 » : 8 lignes (max 15), cite fiches faites, écart (T62 à T67 et T69 faites, T68 à faire, T70 abandonnée D63), banc de rapprochement, banc de profils, prochaines étapes.
- Faits recoupés sur origin/main : 71 fiches L02 ; seules T06, T68, T70 ne sont pas `fait` (donc 69 faites avec T06) ; rappel 49/120 = 40,8 % et 0 faux lien lus dans `pilotage/journal/L02-T33.md` ; Stryker 195 tués / 225 = 86,67 %.
- Aucun mot interdit, aucun prix, aucune date promise, aucune donnée réelle. CI verte (9/9, dont `verifier`) au SHA relu.

## Défauts
1. REPRENDRE.md:54 (bloc « Lot 13 ») : « Score Stryker du noyau à la fin : 86,67 % (09/11/2026, bloc du lot 02) ». Ce bloc relève la fin du lot 13 (08/11/2026) ; une mesure faite le 09/11 sur main 69605cb n'est pas le score « à la fin » du lot 13. La fiche exige des mesures FACTUELLES et limite l'écriture au bloc du lot 02 (À faire 1). Correction : rétablir « non mesuré ».
2. REPRENDRE.md:80 (bloc « Lot 14 ») : même écart de périmètre. Correction : rétablir « score Stryker du noyau sur main : non mesuré » ; la mesure datée reste dans le bloc du lot 02 (REPRENDRE.md:89).

## Remarques
- REPRENDRE.md:89 : « 7 runs de workflow en échec sur 6 branches » n'est pas reproductible tel quel ; citer la source comme dans le journal (`actions/runs`, 3000 derniers runs) ou retirer le chiffre.
- Critère `pnpm verifier` : non relancé par l'auteur (« laissé à la CI ») ; la tâche CI `verifier` est verte au SHA relu.
