VERDICT: A CORRIGER
SHA relu : 6d5c47a46b37f81ff70769015117e86864a873aa
PR : #875, fiche L09-T27 (sensible : fusion par Will seul). Relecture après l'avis relec68-g01-875 (A CORRIGER).

## Défaut de l'avis 68 : corrigé dans les tests
- `is-societes.test.ts` : table `ATTENDU` écrite à la main (14 lignes : clé, valeur exacte, `effet_debut`, `effet_fin`, `statut`, `source_url`), recopiée de la fiche et non du code (URL littérales). Comparée ligne par ligne par le test `table-recopiee-de-la-fiche`. `seuils-json-valides` compare les quatre champs exacts, et `detention-en-points-de-base` vérifie 7500.
- Relu contre la fiche : tout est exact (IS 2022-12-31/null/non_verifie ; prorata JSON sans montant ; micro et CAC 2024-01-01 a_verifier ; indemnité 4000 ; facture électronique 2027-09-01 et 2026-09-01 ; CIBS 2027-01-01 ; mention du CGI 2026-01-01 → 2027-01-01, puis CIBS ; URL de la lecture A).
- Mutations refaites à la main (chacune rougit, puis le code est remis) : `is.taux.normal` 2500 → 2600 ; plafond 4250000 → 4250001 ; détention 7500 → 7000 (deux tests rouges) ; effectif CAC 50 → 49 (deux tests rouges) ; début IS 2022-12-31 → 2023-01-01 ; réception 2026-09-01 → 2026-10-01 ; indemnité 4000 → 40 ; URL LEGIARTI000049216674 → …675.
- Le 9e test et les 8 tests nommés sont verts sous vitest. Périmètre : 4 fichiers autorisés, 289 lignes ajoutées (plafond 300), aucune ligne « - - ». Journal : 10 lignes, commence par `# Journal L09-T27`, mutations notées. Aucun mot interdit ni prix.

## Défauts à corriger
1. packages/parametres/src/catalogue/is-societes.ts:50 (signalé en 41,51) : la vérification des types échoue, donc le critère « pnpm verifier » de la fiche n'est pas rempli (`node scripts/verifier.mjs` : « ECHEC : types », 1 étape en échec ; même résultat attendu en CI). Message de tsc : `TS2375 … 'maj': Type 'string | undefined' is not assignable to type 'string'` avec `exactOptionalPropertyTypes: true`. La ligne `maj: cle === 'is.taux.normal' ? '2026-02-17' : undefined` donne `undefined` à une propriété facultative. Correction demandée : ne pas poser la propriété quand elle est absente, par exemple `...(cle === 'is.taux.normal' ? { maj: '2026-02-17' } : {})`, ou typer `maj?: string | undefined` dans `Def`. Relancer ensuite `node scripts/verifier.mjs` jusqu'au vert (24 étapes).

## Remarques (non bloquantes)
- `source_maj` n'est vérifié que par la liste des clés non nulles : la mutation de `recouvrement.indemnite` 2026-08-11 → 2026-08-12 reste verte. Comme dans L09-T26, la date attendue peut être ajoutée à la table (2026-02-17 pour `is.taux.normal`, 2026-08-11 pour l'indemnité).
- La remarque de l'avis 68 sur `source_maj` est tranchée : seul `is.taux.normal` porte 2026-02-17, ce qui est cohérent avec L09-T26.
