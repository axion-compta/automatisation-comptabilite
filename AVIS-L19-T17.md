VERDICT: A CORRIGER

PR #1143, fiche L19-T17. Troisième relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 0243f95f296b160b52d4e14d55690da5bdfa9ad8

## Défauts précédents : tous levés (vérifié par mutation)
1. `pieges_pct > 100` → `>= 100` : rouge. `pieges_pct < 0` → `<= 0` : rouge.
2. Retrait de `typeof r.version !== 'string' ||` : rouge.
3. `c.length !== 5` → `< 5` : rouge. Regex des seuils acceptant un signe moins : rouge.

## Vérifié
- 6 fichiers, tous dans `fichiers_autorises` ; 227 lignes ajoutées (max 260) ; aucune ligne « - - ».
- `node --test outils/essais/test/parcours.test.mjs` : 9 sur 9 verts. Les 7 tests nommés de la fiche sont présents.
- Journal de 6 lignes, commence par « # Journal L19-T17 ». Aucun secret, prix, nom réel ni mot interdit.
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). Ce test est aussi rouge sur main et la PR n'y touche pas : ce n'est pas un défaut de l'auteur.

## Défauts nouveaux (deux mutations survivantes, rejouées par moi : 9 sur 9 verts)
1. `outils/essais/parcours.mjs:38` : la mutation `m.gestes < 0` → `m.gestes <= 0` survit. Un rapport avec `gestes: 0` est valide, mais ce cas n'est jamais lu.
   Correction : dans `rapport-frontieres-pieges-et-nan`, ajouter `assert.equal(lireRapport(JSON.stringify(mes({ gestes: 0 }))).mesures.gestes, 0);`.
2. `outils/essais/parcours.mjs:65` : remplacer `!dateValide(correction)` par `false` laisse tous les tests verts. Le test refuse `'hier'` avec `/correction/`, mais ce refus vient de la ligne 66. Une correction `'2026-1-5'` serait alors comparée comme texte et permettrait de clore à tort.
   Correction : attendre `/AAAA-MM-JJ/` pour `'hier'` et ajouter un cas `correction: '2026-1-5'` refusé avec `/AAAA-MM-JJ/`.

## Remarques (non bloquantes)
- Le journal et le corps de la PR annoncent 8 tests alors qu'il y en a 9.
- `Number.isFinite` dans `nombre` n'est pas couvert : on peut ajouter un cas brut `"duree_s":1e999`.
- Les seuils sont « proposés, à confirmer » : ils restent à faire valider par Will.
