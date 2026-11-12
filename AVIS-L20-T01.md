VERDICT: OK

PR #1133 « MVP conception : fiches L20-T01 à L20-T33 », seconde relecture au SHA de tête 0bae889d171a59314457b928363d2e3096b9d9b5 (branche pilotage/fiches-MVP-20, à jour de main 59f042c).
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER au SHA 6ca719bed58b65a2e53aa7a15a96f26dde269e33.

## Défauts précédents
1. Recoupements avec des fiches bloquées de main : levé.
   - L20-T09, T10, T13, T14 et T24 sont retirées, ainsi que T15 et T25 qui en dépendaient.
   - garde:fiches ne signale plus aucun avertissement L20. Il reste les 11 avertissements anciens de main (L04 à L17), identiques sur #1132.
   - Aucun recoupement avec une fiche non faite de main.
2. Doublon L20-T28 / L24-T26 : levé. L20-T28 est retirée et L24-T26 (#1135) est gardée. Le choix du comportement du MVP revient à Will.
3. Forme des critères : levé.
   - Les 25 fiches écrivent « les N tests nommés de <fichier> passent : <noms> », avec un critère par fichier de test.
   - Pour chaque critère, N est égal au nombre de noms listés, et le fichier de test figure dans `fichiers_autorises`.
4. Recoupements avec d'autres PR de conception : accepté sans changement, comme le prévoyait l'avis si #1133 passe en premier.
   - Restent L20-T08 et T12 (registres lot-03) avec L22-T17 (#1139) et L23-T20 (#1137), L20-T27 (e57) avec L26-T36 (#1138), et L20-T32 (Discussion.tsx, e25) avec L26-T14, T16, T17, T18 (#1138) et L25-T12 (#1136).
   - La PR fusionnée en second devra ajouter le `depend_de`.
- Remarque « Pièges » : traitée, avec la ligne « Recoupement vérifié le 12/11/2026 » dans chaque fiche.

## La correction n'a rien cassé
- Diff : 25 fichiers, tous sous `pilotage/fiches/`, +820 −0, aucune ligne « - - ».
- Forme : clés et ordre de L04-T56, les 4 sections présentes, `statut: a_faire`, aucun `bloque_par`.
- `depend_de` : toutes les fiches citées existent. Aucune fiche ne cite une fiche retirée, ni dans cette PR ni dans une autre PR ouverte (T12 et T23 ont été reformulées).
- Recoupement interne : seulement T08 et T12, qui sont chaînées.
- Aucun recoupement avec le diff des PR de code ouvertes (#1140, #1131, #1129, #1105).
- Gardes relancées sur la tête : fiches (1088 cohérentes), textes, fictif, termine et portes au vert.
- Mots interdits : aucun. Aucun prix.

## Remarques (non bloquantes)
- Le corps de la PR cite encore T09, T10, T13, T14, T15, T24, T25 et T28 et annonce 33 fiches : à ajuster à la fusion.
- Les exigences laissées sans fiche par les retraits (DOC-002, DOC-005, DOC-006 en partie, DOC-009, EXE-008 en partie, IMP-038 via L24-T26) sont à reprendre dans une conception ultérieure.
- Remarque L20-T21 / L22-T20 (à-nouveaux) : reportée sur #1139.
- PR de pilotage sensible : la fusion revient à Will seul.
