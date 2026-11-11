VERDICT: A CORRIGER

Fiche L04-T57, PR #1062, SHA relu : f6772772f1160dd878a5906b374ea9630d84e468 (le dernier commit, f677277, ne retire qu'un paramètre inutilisé de `OcrMemoire.lire`)
Fiche lue sur origin/main. Fiche sensible : fusion par Will seul (label sensible-a-fusionner).

## Vérifications
- 4 fichiers, tous dans `fichiers_autorises` ; taille 114 + 1 = 115 ≤ 200.
- Interface `Ocr`, faux `OcrMemoire` (panne simulable), `lireAvecOcr`, `elementsDepuisOcr` (calque visible, aucune annotation). Aucun moteur, aucun réseau, aucune dépendance, aucun nom de moteur ni de fournisseur.
- Les 4 tests nommés sont présents. Aucun mot interdit, aucun prix, données fictives. Journal 6 lignes, commence par `# Journal L04-T57`.

## Tests
- `vitest run apps/serveur/src/pieces/adaptateurs/__tests__/ocr-local.test.ts` : 4/4 verts.
- Mutations qui rougissent : panne rendue `{ boites: [] }` ; `calqueVisible: false` ; `largeur > 0` retiré ; `x >= 0` retiré ; comptage des rejets retiré ; texte de la boîte d'entrée modifié.
- Mutations qui SURVIVENT : (a) `x + largeur <= image.largeur + 1` ; (b) `Array.isArray(r?.boites) ? r : { code: 'ocr_indisponible' }` remplacé par `r`.
- Sondes : `elementsDepuisOcr({ boites: [null] }, 1, img)` lève une TypeError ; `page` = NaN accepté ; image de largeur/hauteur `Infinity` : boîte acceptée.

## Défauts
1. `apps/serveur/src/pieces/adaptateurs/ocr-local.ts:33` (`boiteValide`) : une boîte qui n'est pas un objet (`null`, nombre, chaîne) fait lever une TypeError au lieu d'être rejetée et comptée. Le port reçoit la sortie d'un futur moteur : toute entrée malformée doit être rejetée et comptée. Correction : `if (typeof b !== 'object' || b === null) return false;` en tête, avec un cas `null` dans `boite-hors-image-rejetee`.
2. `apps/serveur/src/pieces/adaptateurs/ocr-local.ts:38` (`elementsDepuisOcr`) : `page` et les dimensions de l'image ne sont pas vérifiées. Avec `page` = NaN, 1.5 ou 0, ou une image de dimensions `Infinity`/non entières, des `ElementTexte` sont produits. La fiche demande que les valeurs non finies soient rejetées ; les cas limites NaN, Infinity et non entiers sont exigés. Correction : `page` entier ≥ 1 et `image.largeur`/`image.hauteur` entiers > 0, sinon toutes les boîtes sont rejetées et comptées (ou bien `{ code: ... }`). Ajouter un test (NaN, Infinity, 1.5).
3. `apps/serveur/src/pieces/adaptateurs/__tests__/ocr-local.test.ts:37` (`ocr-indisponible-signale`) : la branche « réponse du moteur invalide → `ocr_indisponible` » (`ocr-local.ts:26`) n'est jamais testée : la mutation (b) survit. C'est l'exigence centrale de la fiche (« jamais un texte vide présenté comme lu »). Correction : ajouter un `Ocr` qui rend `{}` ou `{ boites: 'x' }` et attendre `{ code: 'ocr_indisponible' }`.

## Remarques
- `ocr-local.test.ts:22` : aucune boîte ne dépasse le bord d'exactement 1 pixel (`x + largeur = largeur + 1`) : la mutation (a) survit. Ajouter `boite('bord', 91, 0, 10, 10)` sur une image de 100 de large.
- `entree-non-modifiee` : `OcrMemoire` copie les boîtes, donc la vérification JSON porte sur une copie que `elementsDepuisOcr` ne voit pas. Appeler aussi `elementsDepuisOcr({ boites }, 1, img)` directement.
- Une boîte de texte vide (`''`) est acceptée comme élément lu. À envisager de la rejeter (non bloquant).
- CI au SHA relu : les 9 jobs sont verts (verifier, gardes, tests, types, lint, e2e, stryker, licences, gitleaks).
