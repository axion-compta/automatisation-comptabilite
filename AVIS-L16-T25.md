VERDICT: A CORRIGER

PR #1115, fiche L16-T25, SHA de tête acaaf75071d31bd854aca14f0bbd504f7624da02

## Défauts
1. packages/noyau/src/juridique/decisions-courantes.ts:59 : `preparerDecision` ne vérifie ni `montantMaxCentimes` ni le format des dates. Sonde exécutée au SHA de tête : `montantMaxCentimes` égal à NaN, Infinity, -1 ou 1.5 donne un brouillon, puis `deposerActe` et `apresActeDepose` rendent `carte_remuneration_levee` avec une `DecisionOrgane` invalide (la carte est levée sur un montant que `controlerRemuneration` refusera ensuite par `montant_invalide`). Des dates libres (`debut: 'abc'`, `fin: 'abd'`) sont aussi acceptées. Correction demandée : refuser par `donnees_invalides` un montant qui n'est pas `null` ou un entier sûr positif ou nul, et toute date qui n'est pas une date réelle AAAA-MM-JJ (vérification aller-retour, `2026-02-31` refusée).
2. packages/noyau/src/juridique/__tests__/decisions-courantes.test.ts : la branche `donnees_invalides` n'est couverte par aucun test. Mutations qui survivent : retrait de `donnees.debut > donnees.fin` (ordre inversé) et retrait du contrôle de l'identifiant vide. Correction demandée : tests (dans l'un des 5 tests nommés, par exemple `modele-non-approuve-refuse` ou `modele-sans-piece-jamais-signe`) pour l'ordre inversé, l'identifiant vide, et les montants NaN, Infinity, négatif et non entier, et une date invalide ; chacun doit échouer sans la correction du point 1.

## Vérifications faites
- Fichiers : les 4 fichiers du diff sont dans `fichiers_autorises`. Taille : 218 lignes pour 250 au plus.
- Les 5 tests nommés sont présents et passent (vitest local, 5/5). CI verte au SHA de tête.
- Aucun statut `signe` produit ; modèle non approuvé, sans version, sans date ou d'un autre type refusé par `modele_a_faire_valider` ; seule une pièce non vide fait passer à `deposee` ; double dépôt refusé. remuneration.ts et assemblee/documents.ts non modifiés.
- Mutations détectées : modèle non approuvé accepté, double dépôt accepté, statut non passé à `deposee`.
- Aucun prix, aucun mot interdit, données fictives. Journal : 8 lignes, commence par `# Journal L16-T25`.
- Fiche sensible : fusion par Will seul.

## Remarques (non bloquantes)
- La fiche cite `ModeleDocument` (assemblee/documents.ts) ; `ModeleDecision` en reprend la forme au lieu de l'importer. Acceptable, mais deux types à tenir alignés.
