VERDICT: OK
PR: 953
Fiche: L11-T46
Branche: lot-11/L11-T46
SHA relu: 06ce9fe2303ce3b8df3d3923903ec01e55991c51

## Vérifications
- Fichiers modifiés (4) = `fichiers_autorises` de la fiche ; rien sous `.github/` ni dans les gardes.
- Taille : 30 lignes ajoutées, 1 retirée (plafond 60) ; aucune ligne « - - ».
- `e17-libelles-statuts.ts` : `brouillon: 'Brouillon'`, `refuse: 'Refusé'`, `perso: 'Personnel, hors remboursement'`, le même style d'export que `e17-frais.ts`. `e17.ts` n'est pas touché.
- Ces trois textes sont différents des quatre libellés de `e17.statuts` (« Préparé par IA, à valider », « Validé », « Remboursé », « En compte courant »).
- Les trois tests nommés existent (`statut-brouillon-non-vide`, `statut-refuse-non-vide`, `statut-perso-non-vide`) et passent en local (3/3).
- Mutations faites à la main puis annulées : un libellé brouillon vide, le libellé refusé remplacé par « Validé », le libellé perso remplacé par des espaces. À chaque fois, le test visé échoue.
- `pnpm garde:textes` vert en local.
- Aucun mot interdit, aucun prix, aucune donnée réelle.
- Le journal `pilotage/journal/L11-T46.md` fait 5 lignes et commence par `# Journal L11-T46`.
- CI sur le SHA de tête : verifier, stryker, gardes, e2e, gitleaks, licences, lint, tests et types sont tous en succès.

## Remarques
- Aucune.
