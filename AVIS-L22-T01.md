VERDICT: OK

PR #1139 (conception MVP, fiches L22), seconde relecture. Tête relue : 20a18051bd29afd39ab16f6acccdc85835ffd946
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER sur 79b487f21e01e25d6de3a2df9ef6e1df65f64c25.

## Défauts précédents : tous levés
1. L22-T20, en doublon de L24-T22 : la fiche est retirée. Aucune fiche L22 ne cite plus `a-nouveaux.ts`.
2. L22-T19, en doublon de L24-T20 : la fiche est retirée. Aucune fiche L22 ne touche plus `modele.ts`. L22-T12 et L22-T13 renvoient à une « fiche à reprendre après L24-T20 ».
3. Remarque levée aussi : les critères citent maintenant le fichier de test (T01, T12, T13 et T28 ont été vérifiés).

## La correction n'a rien cassé
- 33 fiches, toutes `a_faire`, sans `bloque_par`. Le diff ne contient que `pilotage/fiches/L22-T*.md`.
- Gardes vertes sur la tête : `fiches` (1096 fiches cohérentes), `textes`, `portes` et `fictif`.
- Chaque `depend_de` existe et aucun ne vise L22-T19 ni L22-T20. Les fiches ne visent que l'écran `e08`, qui a une porte.
- Fiches non faites de main : aucun recoupement de `fichiers_autorises`.
- PR de code ouvertes (#1105, #1129, #1131, #1140) : aucun recoupement de fichiers.
- Aucun mot interdit.

## Remarques (pour Will)
- V3-FEC-018 et V3-FEC-025 ne sont plus couvertes par cette PR. Elles reviendront avec le choix entre L22-T20 et L24-T22, et avec la reprise de L22-T19 après #1135.
- Les recoupements avec les autres PR de conception, ainsi que les textes CC-T13 à CC-T19, restent à traiter à la fusion.
- PR de pilotage, donc sensible : la fusion revient à Will.
