VERDICT: OK

PR #1143, fiche L19-T17. Quatrième relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 9588a68a8c2e8a125a37289e36fac4b884d6912e

## Défauts précédents : levés (vérifié par mutation)
1. `outils/essais/parcours.mjs:38` : `m.gestes < 0` → `<= 0` : rouge (cas `gestes: 0` lu dans `rapport-frontieres-pieges-et-nan`).
2. `outils/essais/parcours.mjs:65` : `!dateValide(correction)` → `false` : rouge (`'hier'` et `'2026-1-5'` refusés avec `/AAAA-MM-JJ/`).
- Remarques précédentes traitées aussi : journal à 9 tests ; cas brut `duree_s: 1e999` refusé (mutation de `Number.isFinite` : rouge).

## Aucune régression
- Mutations des relectures précédentes rejouées, toutes rouges : `pieges_pct > 100` → `>= 100`, `pieges_pct < 0` → `<= 0`, retrait du contrôle de type de `version`, `vert <= correction` → `<`, vert antérieur au rouge accepté, `duree_s < 0` → `<= 0`.
- `node --test outils/essais/test/parcours.test.mjs` : 9 sur 9 verts ; les 7 tests nommés sont présents.
- 6 fichiers, tous dans `fichiers_autorises` ; 230 lignes ajoutées et 1 retirée (max 260) ; aucune ligne « - - ». Journal de 6 lignes, commence par « # Journal L19-T17 ».
- Aucun secret, prix, nom réel ni mot interdit.
- CI : `tests` et `verifier` rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`, en-tête `porte_rgpd`), rouge aussi sur main ; la PR n'y touche pas : pas un défaut de l'auteur. `gardes`, `types`, `lint`, `e2e`, `gitleaks` verts.

## Remarques (non bloquantes)
- Les seuils sont « proposés, à confirmer » : ils restent à faire valider par Will.
