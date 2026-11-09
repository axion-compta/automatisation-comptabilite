VERDICT: A CORRIGER
SHA relu : 2e28982f0f431cd2398a81b5554bc6ac92842c55
PR 890 — fiche L06-T05 (sensible, droits), branche lot-06/L06-T05

## Contrôles passés
- Fichiers modifiés : les 4 sont dans `fichiers_autorises`.
- Taille : 170 lignes ajoutées et 1 retirée, sous `taille_max_lignes` 300 ; aucune ligne « - - ».
- Journal : 6 lignes, commence par `# Journal L06-T05`.
- Les 11 tests nommés sont présents ; vitest 14/14 vert ; eslint et tsc propres.
- Ordre des refus identique à la fiche : personnel Axion, permission, case N, case M, séparation, mode. Refus par défaut sur rôle inconnu, action inconnue, casse (`Lecture`, `COMPTA-LIRE`), permissions vides ou inconnues, `perimetreRespecte` absent.
- Aucun mot interdit, aucun prix, aucun secret, données fictives.
- Mutations rejouées et tuées : gravité bloquante, case N, périmètre M, séparation, drapeau `separationTaches`, personnel Axion, mode, raison `role_lecture`.

## Défauts
1. `packages/noyau/src/securite/autoriser.ts:37` : le mutant qui remplace `PERMISSION_DE_L_ACTION[effective]` par `PERMISSION_DE_L_ACTION[action]` survit (14/14 vert). Avec ce mutant, un administrateur qui a `compta-valider` mais pas `compta-lever-bloquant` lève un signalement bloquant via `lever_majeur`. Le code actuel refuse bien, mais rien ne verrouille ce comportement. La fiche exige que chaque vérification soit couverte par un test qui rougit. Correction : ajouter dans `autoriser.test.ts` le cas administrateur, avec toutes les permissions sauf `compta-lever-bloquant`, qui demande `lever_majeur` sur `{ gravite: 'bloquant' }`. Attendu : `role_insuffisant`.
2. `packages/noyau/src/securite/autoriser.ts:38` : le mutant `{ demande5: true }` survit. Avec ce mutant, un comptable dont la demande 5 n'est pas acceptée obtient les cases `siDemande5` (`deposer`, `saisir`, `valider`…) s'il a les permissions. `comptable-sans-permission-rien` ne le détecte pas, car il vide la liste des permissions. Correction : tester un comptable qui a toutes les permissions avec `demande5: false`. Attendu sur `deposer` : `role_insuffisant`. Avec `demande5: true`, l'action est permise.
3. `packages/noyau/src/securite/autoriser.ts:27` : `separationTaches` n'est pas validé, contrairement à `demande5`. Avec `separationTaches: null` ou absent, la séparation est désactivée en silence : un utilisateur valide sa propre pièce (`permis: true`, vérifié par une sonde). Correction : lever `ErreurSecurite('argument_invalide')` si `typeof contexte.separationTaches !== 'boolean'`, avec un test.
4. `packages/noyau/src/securite/autoriser.ts:31` : une `gravite` hors de `majeur | bloquant` est traitée comme `majeur`. Par exemple, avec `'Bloquant'` (casse différente), un utilisateur obtient `lever_majeur` (`permis: true`, vérifié par une sonde). Correction : refuser avec `argument_invalide` toute `gravite` définie autre que `'majeur'` ou `'bloquant'`, avec un test.

## Remarques (non bloquantes)
- Stryker et `pnpm verifier` sont laissés à la CI selon le journal. Les mutants 1 et 2 feront aussi baisser le score Stryker.
- `ordre-des-permissions-sans-effet` passe pour toute implémentation fondée sur `includes`. On peut le garder, mais il ne prouve pas grand-chose.
