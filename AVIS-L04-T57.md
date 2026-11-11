VERDICT: OK

Fiche L04-T57, PR #1062, SHA de tête relu : 5c229a3767a1945fbbceb843b7c8e47f90879210
Deuxième relecture, après l'avis A CORRIGER du SHA f6772772f1160dd878a5906b374ea9630d84e468. Fiche sensible : fusion par Will seul.

## Vérifications
- Diff contre main : 4 fichiers, tous dans `fichiers_autorises` ; 134 + 1 lignes ≤ 200. La fusion de main n'ajoute aucun fichier hors fiche au diff.
- Aucun mot interdit, aucun prix, données fictives. Journal 6 lignes, commence par `# Journal L04-T57`. `statut: fait`.
- `vitest run apps/serveur/src/pieces/adaptateurs/__tests__/ocr-local.test.ts` : 5/5 verts (les 4 tests nommés plus `page-et-image-invalides-rejetees`).
- CI au SHA relu : les 9 jobs sont verts.

## Défauts de l'ancien avis, vérifiés par mutation
1. Boîte non objet : corrigé (`ocr-local.ts:33`). Retirer la vérification `typeof b !== 'object' || b === null` fait rougir `boite-hors-image-rejetee` (cas `null`).
2. `page` et dimensions de l'image : corrigé (`ocr-local.ts:42-43`). Mutations qui rougissent : contrôle de `page` retiré ; `page >= 0` ; `Number.isInteger(image.largeur)` retiré.
3. Réponse du moteur invalide : corrigé. Remplacer `Array.isArray(r?.boites) ? r : { code: 'ocr_indisponible' }` par `r` fait rougir `ocr-indisponible-signale` (`{}`, `{ boites: 'x' }`, `null`).
- Ancienne remarque sur le bord : la mutation `x + largeur <= image.largeur + 1` rougit maintenant (boîte `bord`).

## Remarques (non bloquantes)
- `ocr-local.test.ts:47` : la mutation `Number.isInteger(image.hauteur)` retiré survit. Les cas `hauteur: 1.5` et `hauteur: NaN` sont rejetés de toute façon par la boîte de 5 de haut. Le code est juste ; pour que le test le prouve, prendre `{ ...image(10, 10), hauteur: 10.5 }`.
- Journal : « 4 tests nommés » ; le fichier en a maintenant 5 (les 4 de la fiche plus un).
- Une boîte de texte vide (`''`) reste acceptée comme élément lu (déjà signalé, non bloquant).
