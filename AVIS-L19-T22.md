VERDICT: A CORRIGER

PR #1211 « L19-T22 Visite guidée de la première pièce dans E03 », relue au SHA de tête 172e90f6302c02e2f4acb2c53a05c94f4656a7ce.
Relecteur Opus, consigne LOT5 section R.

## Contrôles
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises`. Diff de +198 −4, sous `taille_max_lignes` (240), aucune ligne « - - ».
- Les 6 tests nommés sont présents, plus un test des valeurs null, -1 et NaN. En local : 3 fichiers et 26 tests verts (visite-guidee, e03, import-releve).
- Aucun texte en dur : tout est dans `socle-visite.ts`. Aucun mot interdit, aucun prix, aucun secret.
- Journal : 6 lignes, commence par `# Journal L19-T22`.
- CI : les jobs sont encore en file d'attente au moment de la relecture.

## Mutations faites à la main
- `nombrePieces === 0` remplacé par `(nombrePieces ?? 1) <= 0` : tué.
- Focus du titre retiré : tué.
- `surFermeture` retiré : tué.
- **Le bouton « Terminer » ne fait plus rien (`onClick={() => {}}`) : le mutant SURVIT.**
- `=== '1'` remplacé par `!== null` dans `ignoreeDansLaSession` : le mutant survit.

## Défauts à corriger
1. `apps/web/src/socle/VisiteGuidee.tsx:61` : le bouton « Terminer » ferme normalement la visite à l'étape 3, mais aucun test ne le vérifie. Si on le casse, aucun test ne rougit.
   - À faire : dans `trois-etapes-dans-l-ordre` (ou un test voisin), revenir à l'étape 3, cliquer sur `socleVisite.actions.terminer`, puis vérifier que le dialogue disparaît, que `sessionStorage['visite-guidee-ignoree']` vaut `'1'` et que le focus revient à `#stable`.

## Remarques (non bloquantes)
- `VisiteGuidee.tsx:9` : la valeur de session n'est contrôlée que sur `'1'`. Un test avec une autre valeur (par exemple `'0'`, visite affichée) tuerait le second mutant.
- E03 n'a pas de test d'intégration de la visite, car son fichier de test n'est pas autorisé. La lecture de `/pieces` et le passage de `idPiece` ne sont donc pas couverts : à prévoir dans une fiche ultérieure.
- La visite reste ouverte pendant la session après un premier dépôt. La fiche dit « tant que la société n'a aucune pièce ». L'écart est justifié dans la PR, pour que l'étape 3 puisse montrer le lien vers E08.
