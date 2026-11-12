VERDICT: OK

PR #1132 « MVP conception : fiches L21-T01 à L21-T25 », seconde relecture au SHA de tête 7ed7c04ee6c745bf39fbd87d943cee180f7d0f5b (branche pilotage/fiches-MVP-21, à jour de main 59f042c).
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER au SHA 590eb8c387e08c320ea27518dca8f9dc8e2c308d.

## Défaut précédent
1. L21-T25 en doublon de L24-T01 (#1135) : levé. `pilotage/fiches/L21-T25.md` n'est plus dans le diff. Aucune fiche de cette PR ni d'une autre PR ouverte ne cite L21-T25.

## La correction n'a rien cassé
- Diff : 24 fichiers, tous sous `pilotage/fiches/` (L21-T01 à L21-T24), +794 −0, aucune ligne « - - ».
- Depuis 590eb8c, les 24 fiches restantes sont inchangées : seule L21-T25 est retirée.
- Forme : clés et ordre de L04-T56, les 4 sections présentes, `statut: a_faire`, aucun `bloque_par`.
- `depend_de` : toutes les fiches citées existent. L21-T05 dépend toujours de L06-T42 (#1129, ouverte) : garde:termine le tiendra jusqu'à sa fusion, ce n'est pas un défaut.
- `fichiers_autorises` :
  - aucun recoupement avec une fiche non faite de main ;
  - aucun recoupement avec le diff des PR de code ouvertes (#1140, #1131, #1129, #1105) ;
  - aucun recoupement avec les fiches des PR de conception ouvertes (#1102, #1134 à #1139).
  - Seul partage interne : `docs/reprise_regles.csv` (T20, T21, T23), et ces fiches sont chaînées (T23 → T21 → T20).
- Gardes relancées sur la tête : fiches (1087 cohérentes, aucun avertissement L21), textes, fictif, termine et portes au vert.
- Mots interdits : aucun. Aucun prix.

## Remarques (non bloquantes)
- Le corps de la PR annonce encore 25 fiches et cite T25 : à ajuster à la fusion.
- Les recouvrements fonctionnels avec L24-T09 et L24-T12 (#1135) sont toujours à traiter lors de la fusion de la seconde PR.
- V3-REP-040 n'a plus de fiche ici. Elle reste à ajouter à L24-T01 (#1135).
- PR de pilotage sensible : la fusion revient à Will seul.
