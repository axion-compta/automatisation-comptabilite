VERDICT: A CORRIGER

PR n°1151, fiche L22-T09, relue au SHA de tête 37359a5b696913d56990c5b1c346d0bda8754a88.

## Défauts
1. `packages/noyau/src/tva/part-non-deductible.ts:45` : le mutant qui retire `!entierPositif(ttc) ||` survit à tous les tests.
   - Cause : dans le test, les TTC invalides (`100.5`, `-1`, ligne 72 du fichier de test) sont tous inférieurs au HT. Ils sont donc refusés par `ttc < ht` et jamais par le contrôle du TTC lui-même.
   - Effet mesuré sur le mutant : un TTC de `12000.5`, `NaN` ou `Infinity` remonte une `ErreurArgent` sans code, et non `montant_invalide`.
   - Correction demandée : dans `part-non-deductible.test.ts`, ajouter des TTC invalides supérieurs au HT, par exemple `12000.5`, `Number.NaN` et `Number.POSITIVE_INFINITY`, avec l'attente `'montant_invalide'`.
2. `packages/noyau/src/tva/__tests__/part-non-deductible.test.ts` : aucun cas `NaN` ni `Infinity` sur les montants de `lignesAvecPartPerdue`, alors que la consigne de relecture les exige.
   - Correction demandée : les ajouter pour `htCentimes`, `ttcCentimes`, `effet.deductible` et `effet.perdue` (attente `montant_invalide`). Le défaut 1 peut être couvert par la même boucle.

## Vérifications
- Périmètre : 6 fichiers, tous dans `fichiers_autorises`. Taille : 199 + 1 lignes, sous la limite de 200 (juste en dessous).
- La fiche correspond au code réel : la TVA perdue est ajoutée à la charge, la TVA déductible va à son compte et le TTC au fournisseur. Aucun calcul de part : l'effet vient de `effetTraitement`. L'écriture est équilibrée au centime quelle que soit la part (0 à 10000).
- Tests ciblés : noyau 5/5, textes 2/2. `node scripts/verifier.mjs` : tests (862 fichiers) et gardes verts. L'étape `types` échoue seulement à cause du Node 22 du cloud. La CI est verte (9/9).
- Mutations : 22 faites, 21 tuées (bornes `>= 0`, `ttc < ht`, `aVerifier`, `collectee`, `sousReserve`, contrôle de la somme, `deductible > 0`, `.trim()`, `<= 0` de la carte, gabarit `{motif}`).
- Aucun secret, aucun prix, aucun mot interdit. Données fictives seulement.

## Remarques (non bloquantes)
- La fiche demande « les 6 tests nommés de part-non-deductible.test.ts ». Le sixième (`carte-tva-perdue-produite-si-perdue`) est dans `textes/src/cartes/__tests__/tva-perdue.test.ts`. L'écart est signalé par l'auteur et il est cohérent, puisque la carte est dans `textes`. Il est accepté.
