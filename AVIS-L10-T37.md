VERDICT: A CORRIGER

PR #1090, fiche L10-T37, relue au SHA de tête 39c681872aa2b65c29a07e969a75b16a4359e8fd (première relecture, relecteur Opus).

## Défauts

Deux règles de calcul écrites dans la fiche (« À faire » 2) ne sont couvertes par aucun test. Les mutations suivantes laissent les 6 tests verts :

1. `packages/contrat/src/domaines/clients-service.ts:32` : remplacer `p.resteDuCentimes === 0 && p.paiements.length > 0` par `p.paiements.length > 0` ne fait rougir aucun test. Une facture partiellement payée compterait alors dans le délai moyen, alors que la fiche dit « des factures payées ». Le test `delai-moyen-null-sans-facture-payee` (`clients.test.ts:52`) retire toutes les pièces de CLI002 : il ne passe jamais par ce filtre.
   Correction demandée : dans ce test (ou dans `delai-moyen-arrondi-inferieur`), ajouter un client qui n'a qu'une facture ouverte partiellement payée (`resteDuCentimes > 0`, un paiement). Attendu : `delaiMoyenJours` vaut `null`. Ajouter aussi une facture partiellement payée à côté de factures payées : attendu, elle ne change pas la moyenne.
2. `clients-service.ts:33` : remplacer `.sort().at(-1)` (dernier paiement) par `.sort().at(0)` (premier paiement) ne fait rougir aucun test, parce que `jeuPaye` ne crée qu'un paiement par facture.
   Correction demandée : dans `delai-moyen-arrondi-inferieur`, ajouter une facture payée en deux fois, par exemple à J+3 puis J+9, avec les paiements dans le désordre. Attendu : 9.

## Vérifié et correct
- Périmètre : 11 fichiers, tous dans `fichiers_autorises` ; diff de 229 lignes pour une limite de 280.
- Les 6 tests nommés sont présents et verts en local (12 tests avec `ventes-indicateurs`). `pnpm contrat:openapi` : aucun écart.
- `ventes-indicateurs.test.ts` : seule la ligne des clés change, en `toEqual(['ventesIndicateurs', 'clients'])`, liste exacte.
- Mutations tuées : `Math.floor` → `Math.round`, filtre `statutEcriture === 'valide'` retiré, solde sur `ttcCentimes`.
- Aucune route d'écriture ; `routesEcritureSansEnTete()` reste `[]` ; imports du noyau par chemin relatif ; jeu fictif. Aucun prix, aucun mot interdit. Journal de 6 lignes.

## Remarques (non bloquantes)
- `factures-ouvertes-seulement` recopie la règle du service dans le test. Une liste d'identifiants attendus, écrite à la main, serait plus forte.
