VERDICT: OK
PR: 911
Fiche: L00-T66
Branche: lot-00/L00-T66
SHA relu: fc9a03c95c7339e0614fe6652584387d0498e6f8

## Vérifications
- Fichiers modifiés : `pilotage/portes/n08.json`, `apps/web/src/ecrans/n08/.gitkeep`, `outils/gardes/test/portes.test.mjs`, `pilotage/fiches/L00-T66.md`, `pilotage/journal/L00-T66.md` : tous dans `fichiers_autorises`. 16 lignes (max 40), aucune ligne binaire.
- `pilotage/portes/n08.json` vaut exactement `{ "ecran": "n08", "date": "2026-11-09", "valideur": "Will" }` (trois champs, même mise en forme octet pour octet que `n03.json`).
- `portes.test.mjs` : seuls deux changements. `AUJ` passe de `2026-11-08` à `2026-11-09`. Le cas « date future » calcule le lendemain de `AUJ` (rend `2026-11-10`, en UTC) et garde son assertion `/futur/`. Aucune assertion retirée ni affaiblie.
- `node --test outils/gardes/test/portes.test.mjs` : 27/27 verts. `node outils/gardes/portes.mjs` : « vert (9 porte(s) valide(s)) ». `git ls-files pilotage/portes` rend 9 fichiers.
- Mutation : le contrôle `j.date > aujourdhui` est neutralisé dans `portes.mjs`, et le cas « date future » rougit (1 échec). Le cas reste donc un vrai test de date future.
- Gardes perimetre, textes, fictif, litteraux, migrations, tests, termine, fiches : vertes.
- Journal : 5 lignes, titré `# Journal L00-T66`, cite la validation de Will du 09/11/2026. Fiche en `statut: fait`.
- Aucun secret, aucun prix, aucun mot interdit.

## Remarques
Aucune.
