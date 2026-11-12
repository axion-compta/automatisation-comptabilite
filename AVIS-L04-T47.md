VERDICT: OK

PR #1086, fiche L04-T47, SHA de tête relu : e22f2b4d1c1d6fa73f2bf9cdf2dfefbfac1e0869

## Vérifications
- Fichiers : REPRENDRE.md, pilotage/fiches/L04-T47.md, pilotage/journal/L04-T47.md, tous dans `fichiers_autorises`.
- Taille : 18 lignes ajoutées, 1 retirée (limite 60).
- Bloc « Lot 04 » : 10 lignes avec le titre (limite 15).
- Faits revus sur origin/main (8b5ea4a) : 59 fiches L04 ; seules L04-T47, T49 et T51 ne sont pas `fait` ; T48, T50, T52 et T53 sont bien `fait` ; `pilotage/calibrage.csv` ne contient que l'en-tête ; T49 remplacée par T56 à T58 (D88) ; T51 sans `bloque_par`.
- Aucun prix, aucune date de livraison, aucun nom de fournisseur réel, aucun mot interdit.
- Journal : 6 lignes, commence par « # Journal L04-T47 ».
- `tests_requis: non` : aucun code, aucun test touché. CI : 9 jobs verts.

## Remarques (non bloquantes)
- REPRENDRE.md:187 : « feu vert J3a avant toute mise en réel » est inexact. J3a est déjà donné (07/11/2026, voir le contexte de L04-T51 et REPRENDRE.md:110) ; ce qui manque avant la production, c'est le feu vert J10. À corriger dans une prochaine sortie de lot : « feu vert J10 avant toute mise en réel ».
