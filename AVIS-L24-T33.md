VERDICT: OK

PR #1188, fiche L24-T33, tête relue : d762e62ac3cb7682af457ffbd9a5f0ba7c28e620

## Contrôles
- Fichiers : les 4 du diff sont dans fichiers_autorises ; 132 lignes sur 200 au plus ; aucune ligne « - - ».
- Code réel : convention de signe identique à `croiserCompteCourant` (crédit moins débit, négatif = débiteur) ; `resteALiberer` vient de `liberationMinimale`. Constats existants non modifiés.
- Tests : les 3 tests nommés passent (vitest, packages/noyau). Banc de 24 cas, attendus écrits à la main, ids neutres.
- Mutations (13) : 11 tuées, dont `solde < 0` -> `<= 0` / `< -1`, `resteALiberer > 0` -> `>= 0` / `> 1`, garde `< 0` retirée ou passée à `<= 0`, garde entier retirée, `trim` retiré, doublon retiré, tri retiré, motifs échangés.
- Aucun secret, prix, nom réel ni mot interdit. Journal : 6 lignes, commence par `# Journal L24-T33`.
- CI : tous les jobs sont verts, sauf `verifier`, encore en file d'attente au moment de la relecture.

## Remarques (non bloquantes)
- packages/noyau/src/agents/pole-juridique.ts:52-54 : mutant survivant, le retrait de `else { throw }` (nature inconnue) n'est détecté par aucun test. Un test sur une nature hors type (via `as never`) le fermerait.
- pole-juridique.ts:44 : `typeof c.id !== 'string'` peut être retiré sans faire échouer de test, car `trim` lève alors une TypeError au lieu d'une ErreurPoleJuridique.
- Fiche `sensible: oui` : la fusion revient à Will.
