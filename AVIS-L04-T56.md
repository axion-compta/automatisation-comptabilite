VERDICT: OK

Fiche L04-T56, PR #1065, SHA de tête relu : d9cea249f198f37a28075be7d79e56924a3da445
Troisième relecture (relecteur Opus, lot 5 section R, 12/11/2026), après l'avis A CORRIGER du SHA 06b7f4369b74f16fb40d4c418f3f9824c11740f9. Fiche sensible : fusion par Will seul.

## Défaut de l'ancien avis, vérifié par mutation
1. Mode de rendu 7 (découpe) : **corrigé**.
   - `extracteur-pdf.ts:52` : `invisible: rendu === 3 || rendu === 7`.
   - Le test `pdf-texte-et-positions` ajoute au PDF `invisible` un texte `clip` en `7 Tr`, attendu à `[255, 255, 255]`.
   - Mutation : revenir à `rendu === 3` fait rougir le test (1 rouge sur 5).

## Vérifications
- Diff contre main : 4 fichiers, tous dans `fichiers_autorises` ; 249 lignes ≤ 250 (la correction remplace des lignes, elle n'en ajoute pas).
- `vitest run apps/serveur/src/pieces/adaptateurs/__tests__/extracteur-pdf.test.ts` : 5/5 verts.
- CI au SHA de tête : les 9 jobs sont verts.
- Aucun mot interdit, aucun prix, données fictives. Journal 5 lignes, commence par `# Journal L04-T56`.

## Remarques (non bloquantes)
- La mutation `rendu >= 3` survit : les modes 4, 5 et 6 (remplissage ou contour, plus découpe) sont visibles, mais aucun test ne le vérifie. À couvrir dans une fiche suivante.
- Reprises de l'avis précédent : repli « toute la page au pire cas » non testé ; couleur de contour (modes 1, 2, 5, 6) non lue ; `taillePolice: 12` en dur pour les annotations.
