VERDICT: OK
c0d3518d4cc656773418eb48145e040d4cae543f

PR #1092, fiche L11-T35, relue au SHA de tête ci-dessus (seconde relecture, relecteur Opus). La première relecture a rendu OK au SHA f7928bf0aa13d63b5a11a3b0505056310a346a5d. Depuis, le seul nouveau commit est la fusion de main (85127b8f) dans la branche.

## Vérifié
- Fichiers propres de la fiche entre f7928bf0 et c0d3518d : `pilotage/calibrage.csv`, `pilotage/fiches/L11-T35.md` et `pilotage/journal/L11-T35.md` sont identiques octet pour octet (`git diff` vide).
- `REPRENDRE.md` : la section « Lot 11 notes de frais (tranche 1) » est identique, à une ligne près (voir les remarques). La section « Lot 04 » venue de main suit, intacte. Aucun autre bloc n'est touché.
- Diff par rapport à main : 4 fichiers, tous autorisés ; 56 lignes ajoutées et 1 retirée, pour une limite de 120 ; 40 lignes de calibrage ; la section compte 8 lignes non vides (10 au plus).
- `garde:textes` vert ; aucun mot interdit, aucun prix, aucun nom réel.
- CI verte au SHA relu (run 43155078738 : verifier, tests, e2e, gardes, types, lint, licences, gitleaks, stryker).

## Remarques (non bloquantes)
- En résolvant le conflit, la ligne « - Aucune date de livraison annoncée. » a disparu de la section du lot 11. La section n'annonce toujours aucune date, donc la consigne de la fiche reste tenue, mais le commentaire « sans changement de fond » n'est pas tout à fait exact. Les autres sections de `REPRENDRE.md` gardent cette ligne : à remettre si possible.
- Nouveau conflit avec main actuel (0291c86f) : `REPRENDRE.md` et `pilotage/calibrage.csv`, deux ajouts en fin de fichier venus de la PR #1089 (L08-T41) depuis sa fusion. L'en-tête de `calibrage.csv` est le même des deux côtés. Il faudra encore fusionner main (rôle M) et garder les deux ajouts. Ce n'est pas un défaut de l'auteur.
- Remarques de la première relecture toujours valables : colonne `decision` à `fusionnee` alors que le portier écrit `fusion` ; il faudra ajouter la ligne de L11-T45 quand sa fiche passera à `fait` (PR #1093).
