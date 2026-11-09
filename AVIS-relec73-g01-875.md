VERDICT: OK
SHA relu : ed2fb364cf041eac67497b9b4f1c63855a5ea5dc
PR : #875, fiche L09-T27 (sensible : fusion par Will seul). Relecture après l'avis relec70-g01-875 (A CORRIGER, types).

## Défaut de l'avis 70 : corrigé
- `packages/parametres/src/catalogue/is-societes.ts:49` : `maj: cle === 'is.taux.normal' ? '2026-02-17' : undefined` est remplacé par `...(cle === 'is.taux.normal' ? { maj: '2026-02-17' } : {})`. La propriété n'est plus posée quand elle est absente : plus d'erreur TS2375 avec `exactOptionalPropertyTypes`. C'est la seule ligne changée depuis 6d5c47a (hors fusion de main).
- Critère « pnpm verifier » : `node scripts/verifier.mjs` (Node 22 du cloud, `npm_config_engine_strict=false`) rend « tout est vert (24 étapes) », dont types, lint, tests, tests des gardes et les 20 gardes.

## Vérifications
- Table écrite à la main toujours en place : `is-societes.test.ts` n'a pas changé depuis l'avis 70 ; `ATTENDU` (14 lignes, URL littérales, recopiée de la fiche) est comparée ligne par ligne par `table-recopiee-de-la-fiche`.
- Vitest sur `is-societes.test.ts` : 9 tests verts (les 8 tests nommés + la table).
- Mutations de l'ancien avis refaites à la main, chacune rougit au moins un test, puis le code est remis (arbre propre) : `is.taux.normal` 2500 → 2600 (1 rouge) ; plafond 4250000 → 4250001 (1) ; détention 7500 → 7000 (2) ; effectif CAC 50 → 49 (2) ; début IS 2022-12-31 → 2023-01-01 (1) ; réception 2026-09-01 → 2026-10-01 (1) ; indemnité 4000 → 40 (1) ; URL LEGIARTI000049216674 → …675 (1). Mutation nouvelle sur la ligne corrigée : `maj` posé sur `is.taux.reduit` au lieu de `is.taux.normal` → 1 rouge.
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 289 lignes ajoutées, 1 supprimée (plafond 300) ; aucune ligne « - - ».
- Journal `pilotage/journal/L09-T27.md` : 10 lignes, commence par `# Journal L09-T27`.
- Aucun mot interdit, aucun prix, données issues de la fiche seulement ; aucune ligne `valide`.

## Remarques (non bloquantes)
- Comme noté dans l'avis 70, la date `source_maj` n'est vérifiée que par la liste des clés non nulles : changer 2026-08-11 en 2026-08-12 pour l'indemnité reste vert. La date attendue peut être ajoutée à la table plus tard.
- Le journal ne mentionne pas la correction de types de l'avis 70 (il est déjà à 10 lignes).
