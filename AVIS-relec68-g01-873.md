VERDICT: OK
SHA relu : 7ea0ef288b371bb8395924691c95132d7151d341
PR : #873, fiche L06-T04 (sensible : fusion par Will seul)

## Vérifications
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 146 lignes ajoutées, 1 retirée (plafond 250).
- Matrice : les 84 cases de `MATRICE_PROPOSEE` (matrice.ts:16-29) relues une par une contre le tableau de la fiche : toutes exactes (« O, sép. » → `sep`, « lecture seule » → `lecture_seule`, ligne 14 propose/propose/N/active/N/N).
- DEMANDE 5 : 7 cases `D(...)` exactement, colonne comptable, lignes 2 à 8 ; elles rendent N quand `demande5` est faux (matrice.ts:39) ; lignes 1, 9, 12 et 14 de la colonne Exp ne dépendent pas de la demande 5.
- 7 tests nommés présents. La table du test (matrice.test.ts:8-23) est écrite à la main, sans relire le code ; les 84 cases sont rejouées avec demande5 vrai et faux, et le compte de 84 est vérifié.
- Rôle ou action inconnus (`'Administrateur'`, `''`, `undefined`, `null`, `constructor`, `__proto__`) et options absentes ou mal typées : `argument_invalide`, sans valeur par défaut.
- Tests ciblés : 7/7 verts. `node scripts/verifier.mjs` : 24 étapes vertes (Node 22, engine-strict désactivé).
- Mutations faites à la main puis annulées, toutes rougissent : case cloturer/invité N→M ; suppression de la fermeture DEM5 ; case DEM5 valider sep→O ; case lire/comptable passée en DEM5 ; suppression du contrôle de type de `demande5`.
- Aucun mot interdit, aucun prix, aucune valeur légale, aucune donnée réelle.

## Remarques (non bloquantes)
- Clés d'action : celles de `types.ts` sur main (`voir_piece_sensible`, `lever_majeur`, `gerer_equipe`, etc.), pas celles écrites dans la fiche (`pieces-sensibles`, `lever-majeur`, `equipe`). C'est cohérent avec le noyau existant et c'est noté au journal.
- `personnel-axion-jamais-d-ecriture` utilise `ACTIONS_ECRITURE` de types.ts (11 actions, plus large que la liste PLA-140) plus la liste de 5 recopiée : la couverture est plus large que ce qu'exige la fiche.
- Stryker (≥ 80) n'a pas été lancé dans cette relecture : le résultat de la CI fait foi.
