VERDICT: OK
SHA relu : f6fa672b01ad7abce5589565ef1c303c7195f996
PR : #874, fiche L09-T26 (sensible : fusion par Will seul). Relecture après l'avis relec68-g01-874 (A CORRIGER).

## Défaut de l'avis 68 : corrigé
- `tva-micro.test.ts` : nouvelle table `ATTENDU` écrite à la main (15 clés : `effet_debut`, `effet_fin`, `statut`, `source_url`, `source_maj`). Recopiée de la fiche et non du code : URL littérales, statuts et dates repris du tableau « Dates et statut par clé ». Comparée ligne par ligne par le test `dates-statuts-sources-ligne-par-ligne`. Les clés de la table égalent `CLES`, et `C.length` vaut 15.
- Valeurs exactes déjà vérifiées par `montants-en-centimes-entiers` (taux, franchises, avocats-auteurs, micro, réel simplifié, alerte 9000) et `cles-attendues` (règles JSON).
- Relu contre la fiche : tout est exact (taux 2026-01-01/null/a_verifier, franchise ventes et services non_verifie jusqu'au 2027-01-01, prorata et avocats-auteurs a_verifier, exigibilité 2027-01-01 a_verifier, micro 2029-01-01 non_verifie, réel simplifié A18813 a_verifier, alerte URL vide).

## Mutations refaites à la main (chacune rougit, puis le code est remis)
- `FIN_2028` 2029-01-01 → 2028-12-31 : rouge (`dates-statuts-sources-ligne-par-ligne`).
- `DEBUT` 2026-01-01 → 2025-01-01 : rouge.
- statut de `tva.franchise.prorata_creation` → `non_verifie` : rouge.
- URL A18813 → A18814 : rouge.
- `source_maj` 2026-05-13 → 2026-05-14 : rouge.
- `micro.plafond.ventes` 20310000 → 20310001 : rouge (`montants-en-centimes-entiers`).
- URL Légifrance modifiée : rouge.

## Contrôles
- Périmètre : 4 fichiers, tous autorisés ; 281 lignes ajoutées (plafond 300) ; aucune ligne « - - ».
- 8 tests verts (les 7 tests nommés et la table). `node scripts/verifier.mjs` : tout est vert (24 étapes ; Node 22 du cloud, `npm_config_engine_strict=false`).
- Journal : 8 lignes, commence par `# Journal L09-T26`, mutations notées.
- Remarques de l'avis 68 tranchées : `source_maj` null pour `micro.plafond.services` (même règle que la franchise services) ; « débits sur option » ajouté à `source`, avec un test.
- Aucun mot interdit ni prix ; aucune valeur en dur hors du catalogue.

## Remarques (non bloquantes)
- La valeur texte de `tva.exigibilite.services` (`encaissement`) et celle de `tva.exigibilite.acompte_bien` (`encaissement_acompte`) ne sont pas vérifiées exactement : la mutation `encaissement_acompte` → `livraison` reste verte. À ajouter dans `cles-attendues` lors d'une prochaine fiche.
- Hypothèse `finIncluse: true` (prorata de création) toujours à confirmer à la vérification.
