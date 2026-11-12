VERDICT: OK

PR n°1144, fiche L19-T18, SHA de tête relu : 68752592736a419a5ed37f552d6c9678e744a330

- Périmètre : 7 fichiers, tous dans `fichiers_autorises` ; 141 lignes (max 160).
- Tests : `vitest run icone-agent.test.tsx pourquoi.test.tsx` : 14 verts ; les 5 tests nommés sont présents.
- Mutations faites à la main, toutes tuées : retrait de `specialite !== undefined` dans Pourquoi, garde de spécialité remplacée par `in FORMES` (`__proto__`, `constructor`), `aria-label` figé sur le neutre, « neutre » ajouté à la liste fermée.
- Couleur par `currentColor` ; libellés dans `packages/textes` ; aucun prénom ni visage.
- Aucun secret, aucun prix, aucun mot interdit ; journal de 6 lignes.

Remarques
- Aucune.
