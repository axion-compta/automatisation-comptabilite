VERDICT: A CORRIGER

PR n°1163, tête relue : 87ceca34ce2a5c1855583ddd656a46dab4e819b1

## Défauts
1. packages/noyau/src/documents/__tests__/catalogue.test.ts:16-25 (`catalogue-sas`) : le test ne vérifie que 3 codes pour SAS (et 2 pour EURL/SASU). Mutation survivante, vérifiée : retirer `SAS` des formes de `bilan` et de `liasse_fiscale` (catalogue.ts:40,43) laisse les 8 tests verts ; même chose si `rapport_gestion` (catalogue.ts:44) est réservé à la SARL. Correction demandée : dans `catalogue-sas`, comparer la liste complète des codes SAS avec `toEqual` (comme `catalogue-sarl`), et au moins la liste complète d'EURL ou de SASU ; ajouter `catalogueFiltre('SAS', 'saisie_seule').absents` attendu.

## Vérifié
- Fichiers modifiés tous dans `fichiers_autorises` ; diff 202 lignes (max 260) ; journal 6 lignes, commence par `# Journal L20-T07`.
- Tests ciblés : 8/8 verts. Mutations qui rougissent : bilan ouvert à la SCI, annexe ouverte à l'EI, acte_unanime ouvert à la SARL, FEC retiré de la SCI, source `import_externe` interdite.
- `StatutDocument` recoupé par `expectTypeOf`, `TypeDocument` réutilisé (`typeProduit`) sans modification de `historique.ts`.
- Aucun secret, aucun prix, aucun mot interdit, données fictives.
- CI à la tête : tout vert sauf `verifier` encore en file au moment de la relecture.
