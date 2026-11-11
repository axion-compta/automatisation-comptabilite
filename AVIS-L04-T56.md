VERDICT: A CORRIGER

Fiche L04-T56, PR #1065, SHA de tête relu : 06b7f4369b74f16fb40d4c418f3f9824c11740f9
Deuxième relecture, après l'avis A CORRIGER du SHA c610f3521fe4423358901e9b3473853c1e2b39a4. Fiche sensible : fusion par Will seul.

## Vérifications
- Diff contre main : 4 fichiers, tous dans `fichiers_autorises` ; 249 lignes ≤ 250 (marge d'1 ligne).
- Aucun mot interdit, aucun prix, données fictives. Journal 5 lignes, commence par `# Journal L04-T56`. `statut: fait`.
- `vitest run apps/serveur/src/pieces/adaptateurs/__tests__/extracteur-pdf.test.ts` : 5/5 verts.
- CI au SHA relu : les 9 jobs sont verts.

## Défauts de l'ancien avis, vérifiés par mutation
1. Couleurs mélangées dans une ligne : corrigé (alignement des affichages sur les éléments, pire cas). Remplacer le pire cas par la première couleur fait rougir `pdf-texte-et-positions`. Sondes : `q 1 1 1 rg … Q` est bien restauré, `1 g` et `0 0 0 0 k` sortent en blanc, `TJ` est lu.
2. Calques masqués : corrigé. `masque = false` en dur fait rougir le test (`Cache` attendu `calqueVisible: false`).
3. Mode de rendu `3 Tr` : corrigé. `invisible: false` en dur fait rougir le test.
4. Annotations : testées. `annotationCachee` forcé à `false` fait rougir le test.

## Défaut
1. `apps/serveur/src/pieces/adaptateurs/extracteur-pdf.ts:52` : seul le mode de rendu 3 est traité comme invisible. Le mode 7 (le texte sert seulement de tracé de découpe : ni rempli ni contouré) est lui aussi invisible. Sonde : `BT /F1 12 Tf 7 Tr 50 700 Td (Clip) Tj ET` donne `["Clip", [0,0,0]]`, du texte invisible présenté comme visible. C'est la même classe que le défaut 3 de l'ancien avis.
   Correction demandée : `invisible: rendu === 3 || rendu === 7`. Test : dans `pdf-texte-et-positions`, ajouter au PDF `invisible` (ligne 59) un texte en `7 Tr` attendu à `[255, 255, 255]`. Pour rester sous 250 lignes, modifier les lignes existantes au lieu d'en ajouter.

## Remarques (non bloquantes)
- Mutations qui survivent, sans défaut observé : le repli « toute la page au pire cas » (`etatDesElements`, ligne 66) n'est pas testé ; la restauration `Q` et l'imbrication des contenus marqués non plus. Sonde : un texte hors de la page (que pdf.js ne rend pas dans `getTextContent`) fait passer tous les éléments de la page en blanc. Ce repli est prudent (fausse alerte, pas de texte caché manqué), mais il mériterait une phrase au journal.
- Modes 1, 2, 5, 6 (contour) : la couleur de contour n'est pas lue. Un texte contouré en blanc ressort noir. Plus rare ; à noter pour une fiche suivante.
- `taillePolice: 12` en dur pour les annotations (déjà signalé).
