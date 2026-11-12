VERDICT: A CORRIGER

PR #1150 « L20-T01 Assemblée : organe d'approbation et mode de décision par forme, SCI comprise » (PR de code), relue au SHA de tête 3513d3d897855be3443bf6465d34bedfa00d1943.
Relecteur Opus, consigne LOT5 section R. Cet avis remplace, pour la PR de code, l'avis de conception (#1133) qui était déjà sur cette branche.

## Contrôles
- Fichiers : les 7 fichiers modifiés sont dans `fichiers_autorises`. Diff de +276 −1, sous `taille_max_lignes` (280), aucune ligne « - - ».
- Les 9 tests nommés sont présents (`regle_non_sourcee` est aussi testé). En local, tous sont verts : noyau 11/11 et parametres 1/1.
- Règles : datées, sourcées par article et marquées `a_verifier` dans `parametres`. Le noyau les reçoit en argument et ne contient aucune valeur légale en dur.
- Sources relues : L223-31 (EURL), L227-9 (SASU et SAS), L223-26 et L223-27 (consultation écrite exclue pour les comptes en SARL), articles 1853, 1854 et 1856 du Code civil (SCI). Elles correspondent aux règles.
- `sci-sans-greffe.test.ts` utilise un catalogue fictif. J'ai vérifié qu'aucun catalogue réel d'échéances n'existe : `echeances/catalogue.ts` n'exporte que des fonctions. L'étape 5 de la fiche prévoit ce cas, et c'est noté au journal.
- Aucun mot interdit, aucun prix, aucun secret. Journal : 6 lignes, commence par `# Journal L20-T01`.
- CI au moment de la relecture : gardes, gitleaks et stryker sont verts ; tests, types, lint, e2e et licences sont en cours.

## Mutations faites à la main
- `n < 1` remplacé par `n < 0` : tué.
- Contrôle EURL/SASU `n !== 1` retiré : tué.
- Cas EI retiré : tué.
- `agPrevue === true` remplacé par `!== false` : tué.
- `<= 0` remplacé par `< 0` sur la date de la règle : tué.
- **`Number.isSafeInteger(n)` remplacé par `Number.isFinite(n)` : le mutant SURVIT.**
- **`g.source.trim() === ''` remplacé par `g.source === ''` : le mutant SURVIT.**

## Défauts à corriger
1. `packages/noyau/src/assemblee/organe.ts:66` : aucun test ne vérifie que `nbAssocies` est entier. Pourtant, la consigne du relecteur exige les cas limites des valeurs non entières et Infinity.
   - À faire : dans `organe.test.ts`, test « entrées invalides », ajouter `nbAssocies: 1.5`, `nbAssocies: Number.POSITIVE_INFINITY` et `nbAssocies: -1`, chacun avec le résultat attendu `entree_invalide`.
2. `packages/noyau/src/assemblee/organe.ts:69` : aucun test ne vérifie qu'une source faite seulement d'espaces est refusée.
   - À faire : dans le test `regle_non_sourcee`, ajouter `avec({ source: '   ' })` avec le résultat attendu `regle_non_sourcee`.

## Remarques (non bloquantes)
- Une SARL ou une SAS avec `nbAssocies: 1` aboutit à `regle_absente`, car le catalogue n'a pas de règle « associé unique » pour ces formes. Ce comportement est prudent, mais il mérite un test explicite ou une ligne au journal.
- La date `DEBUT = '2022-12-31'` du catalogue est arbitraire et marquée « à vérifier » : à confirmer par Will.
- Fiche sensible : la fusion revient à Will seul.
