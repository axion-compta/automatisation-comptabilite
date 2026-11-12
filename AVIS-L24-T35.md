VERDICT: OK

PR #1202, fiche L24-T35, tête relue : f8ee7a2f3f193ddc3563fc2cceb8d9cf8894485c

## Contrôles
- Fichiers : les 4 du diff sont dans fichiers_autorises ; 47 lignes sur 150 au plus ; aucune ligne « - - ». `docs/ia/routes-ia.json` n'est pas modifié, aucune route n'est ajoutée.
- Code réel : `etatModeleDefaut` s'appuie sur `routeAutorisee` (L06-T19) sans la dupliquer ; une route hors liste reste refusée.
- Tests : les 3 tests nommés passent.
- Mutations : tuées pour `provisoire` inversé, `provisoire: true` constant, `provisoire: routes.length === 0` (frontière : liste non vide mais route absente) et `toLowerCase` retiré dans `cle`.
- Aucun secret, prix, nom réel ni mot interdit. Journal : 5 lignes.
- CI : tous les jobs sont verts, sauf `verifier`, encore en file d'attente au moment de la relecture.

## Remarques (non bloquantes)
- modele-defaut.test.ts:16 : le cas « TEXTE » ne vérifie que `provisoire`. Le mutant `route: { ...demande, mode: 'texte' }` survit (sans effet réel ici).
- Fiche `sensible: oui` : la fusion revient à Will.
