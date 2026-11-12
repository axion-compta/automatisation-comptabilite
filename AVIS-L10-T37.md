VERDICT: OK
SHA: 9e55ffa22535a0452612a0c12ff82b2b702bc2a2
PR: #1090

Fiche L10-T37, deuxième relecture (relecteur Opus), au SHA de tête 9e55ffa22535a0452612a0c12ff82b2b702bc2a2. L'avis précédent (A CORRIGER au SHA 39c681872aa2b65c29a07e969a75b16a4359e8fd) relevait 2 défauts. `pilotage/ARRET` absent sur origin/main.

## Ce qui a changé depuis l'avis précédent
- Fusion de `origin/main` (85127b8f), sans rebase ni force-push, puis 2 commits de tests. Seul `packages/contrat/src/__tests__/clients.test.ts` change parmi les fichiers de la fiche. Le code n'est pas modifié.

## Défauts de l'avis précédent : vérifiés par mutation
1. Facture partiellement payée comptée dans le délai moyen : CORRIGÉ. Nouveau test `delai-moyen-ignore-facture-partielle` (client avec une seule facture partielle : `null` ; partielle à côté de factures payées à 10 et 12 jours : 11). Mutation `clients-service.ts:32` (filtre `resteDuCentimes === 0` retiré) : ce test rougit.
2. Dernier paiement non vérifié : CORRIGÉ. `delai-moyen-arrondi-inferieur` ajoute une facture payée en deux fois, paiements dans le désordre (J+9 puis J+3), attendu 9. Mutation `.at(-1)` → `.at(0)` : rouge. Mutation « tri des dates retiré » : rouge aussi.

## Vérifications refaites au SHA de tête
- Périmètre : 11 fichiers, tous dans `fichiers_autorises` ; diff de 253 lignes (248 + 5) pour une limite de 280 ; aucune ligne « - - ».
- `clients.test.ts` (contrat, 6 tests) + `ventes-indicateurs.test.ts` : 12 verts ; `apps/serveur` `clients.test.ts` : vert. Aucun test retiré.
- `tsc --noEmit` du contrat : rien. `pnpm contrat:openapi` : aucun écart. `node scripts/verifier.mjs --gardes` : 22 étapes vertes.
- CI au SHA de tête : les 9 jobs sont verts (gardes, verifier, tests, types, lint, e2e, gitleaks, licences, stryker).
- Données fictives, aucun prix, aucun mot interdit. Journal de 6 lignes.

## Remarques (non bloquantes, reprises)
- `factures-ouvertes-seulement` recopie la règle du service dans le test. Une liste d'identifiants attendus, écrite à la main, serait plus forte.
