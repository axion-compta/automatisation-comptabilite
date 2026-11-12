VERDICT: A CORRIGER

PR n°1161, fiche L23-T01 (sensible : fusion par Will seul), tête relue : 56f0c653e7c802c8d7c6b30f387de0646ad3719d

Vérifié : 6 fichiers, tous dans fichiers_autorises ; 92 lignes (max 160) ; 6 tests nommés et tests existants verts (noyau : mention et exports, 66 tests) ; tsc noyau vert, donc `exports/paquet.ts` compile sans modification ; les `assiste` restants (banque/rapprochement, banque/fournisseurs, apps/serveur/banque) sont hors périmètre, comme le dit la fiche ; tests existants de mention adaptés sans changer leur attendu ; CI verte ; aucun secret ni mot interdit. Mutations tuées : surcharge supprimée, trim ou casse tolérés, `assiste` remis dans MODES_TRAVAIL.

## Défaut
1. packages/noyau/src/exercices/__tests__/mode-travail.test.ts:30-35 (`exercice-herite-de-la-societe`) : le test n'utilise qu'une société en `saisie_seule`. La mutation `return exercice?.modeTravail ?? 'saisie_seule'` (mode de la société ignoré) reste verte (14/14). Correction : tester aussi l'héritage avec une société en `autonome` et une société en `expert_complet` (exercice absent, `{}`, `{ modeTravail: undefined }`).
