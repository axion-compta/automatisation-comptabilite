VERDICT: A CORRIGER
SHA relu : d07f18f1f78e5844214cf477d36077f55211fef1
PR : #875, fiche L09-T27 (sensible : fusion par Will seul)

## Ce qui est exact
- Périmètre : 4 fichiers autorisés ; 253 lignes ajoutées (plafond 300).
- Valeurs relues ligne par ligne contre le tableau de la fiche : toutes exactes. IS 2500/1500 pb ; plafond 4 250 000 ; CA max 1 000 000 000 ; détention 7500 pb ; micro-comptable {45 000 000, 90 000 000, 10, 2} ; CAC {500 000 000, 1 000 000 000, 50, 2} ; indemnité 4000 ; facture électronique 2027-09-01 et 2026-09-01 ; mention « art. 293 B du CGI » puis « article L. 233-3 du CIBS ».
- Dates et statuts identiques au tableau « Dates et statut par clé » : IS 2022-12-31/null/`non_verifie` ; prorata, indemnité et facture électronique 2026-01-01 avec la note ; micro et CAC 2024-01-01 ; CIBS 2027-01-01 ; mention du CGI 2026-01-01 → 2027-01-01 exclue ; mention du CIBS à partir du 2027-01-01 ; aucune ligne `valide`. Les 9 URL de la lecture A sont exactes. L. 233-3 et L. 223-3 sont tous deux cités dans le titre, sans trancher.
- `is.plafond.prorata` : JSON `{regle, a_verifier}` seul, aucun montant.
- 8 tests nommés verts ; `node scripts/verifier.mjs` vert (24 étapes). Aucun mot interdit ni prix.

## Défauts à corriger
1. packages/parametres/src/catalogue/__tests__/is-societes.test.ts : aucune valeur légale n'est vérifiée par sa valeur exacte. Les tests contrôlent seulement la forme (entier, > 0, ≤ 10000, critères entre 1 et 3). Ces mutations faites à la main ne rougissent aucun test :
   - is-societes.ts:66 `is.taux.normal` 2500 → 2600 ;
   - is-societes.ts:68 `is.plafond_benefice_reduit` 4250000 → 4250001 ;
   - is-societes.ts:70 `is.taux_reduit.detention_pp` 7500 → 7000 (le test `detention-en-points-de-base`, lignes 93-100, ne vérifie que > 100 et ≤ 10000) ;
   - `SEUILS_MICRO.bilan` 45000000 → 45000001 ; `SEUILS_CAC.effectif` 50 → 49 (test `seuils-json-valides`, lignes 80-91) ;
   - `recouvrement.indemnite` 4000 → 40 ;
   - `facture_electronique.reception` 2026-09-01 → 2026-10-01 ;
   - is-societes.ts:44 `effet_debut` IS 2022-12-31 → 2023-01-01.
   Correction demandée : ajouter une table écrite à la main dans le test, recopiée de la fiche et non du code. Elle donne pour chacune des 14 lignes la valeur exacte (centimes ou points de base, JSON des seuils), `effet_debut`, `effet_fin`, `statut` et `source_url`. La comparer au catalogue, en particulier 7500 dans `detention-en-points-de-base` et les quatre champs exacts dans `seuils-json-valides`. Vérifier ensuite que chaque mutation ci-dessus rougit et le noter au journal.

## Remarques (non bloquantes)
- is-societes.ts:49 : `source_maj` 2026-02-17 est appliqué aux 5 lignes IS, alors que la fiche ne cite « vérifié le 17/02/2026 » que pour `is.taux.normal` (même page F23575). C'est acceptable si c'est assumé, mais il faut la même règle que dans L09-T26, qui met null pour `tva.franchise.seuil.services`.
- Le journal ne mentionne pas les mutations faites à la main.
