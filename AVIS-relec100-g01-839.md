VERDICT: OK
SHA relu : 3fe02e8a005bd8659a1f0a3c0dae86432e13836b
PR : #839 (lot-14/L14-T08), fiche L14-T08, sensible: non, tests_requis: non.

## Défauts de l'ancien avis (SHA b1b19b784d631a71d10c6b58321a22f0f0487e09)
1. T34 et T37 données à faire : corrigé. La section liste T34, T36, T37, T38 comme faites et ne laisse que T39, T40, T41 ; vérifié sur origin/main (7dc31d2) : ces trois fiches seules sont `a_faire` dans le lot 14 (hors L14-T08), T35 et T42 sont `fait`.
2. « Prochaine commande » : corrigé, ne cite plus que L14-T39 à L14-T41.
3. Mesures périmées : corrigé par « non mesuré » (PR fusionnées, délais médians, Stryker), ce que le critère de la fiche admet.
Pas de test exigé (fiche documentaire, tests_requis: non) ; contrôle fait par lecture des en-têtes de fiches sur main.

## Contrôles
- Fusion de main : 5ff388b fusionne e6fffd9 ; le diff e6fffd9..5ff388b ne touche que les 3 fichiers de la PR (aucune perte). origin/main a avancé de 5 commits depuis (#822, #858, #856, #897, #890), aucun du lot 14 ni sur ces fichiers ; fusion d'essai sans conflit.
- Périmètre : REPRENDRE.md, pilotage/fiches/L14-T08.md, pilotage/journal/L14-T08.md, tous autorisés. Taille : 24 ajoutées, 2 retirées (limite 80). garde:perimetre vert (L14-T08, 26 lignes), garde:fictif, garde:termine et garde:fiches verts. Aucune garde ni test touché.
- Section « Lot 14 » : 12 lignes non vides (limite 25) ; autres sections intactes hormis « Prochaine commande ».
- Blocages de T39 (D29), T40 (D29), T41 (D42) cohérents avec les fiches sur main.
- Journal : 8 lignes, commence par `# Journal L14-T08`. Aucun mot interdit, aucun prix, aucune date de livraison, aucun octet NUL, aucune donnée réelle.

## Remarques
- Journal ligne 5 : garde les chiffres « 45 PR, 41,9 min, 39,8 min » alors que REPRENDRE.md les dit périmés ; préciser « relevé du 08/11, périmé » serait plus clair (non bloquant).
- Remettre la branche sur origin/main avant fusion reste conseillé (5 commits d'écart, sans conflit).
