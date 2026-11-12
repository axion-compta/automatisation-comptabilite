VERDICT: OK
SHA: 1314ed21106768390dbd3ffffcfc2b45e9fe4f7a
PR: #1085

Fiche L08-T54 (**sensible** : fusion par Will seul, le relecteur ne fusionne pas). Relue au SHA de tête 1314ed21106768390dbd3ffffcfc2b45e9fe4f7a par le relecteur Opus. L'avis précédent était A CORRIGER au SHA 42169633, pour deux défauts. `pilotage/ARRET` est absent sur origin/main.

## Défauts du 42169633 : corrigés
1. `pilotage/fiches/L08-T54.md:8` : la ligne vaut `statut: fait` depuis le commit 1314ed21. `git diff 42169633 1314ed21` ne touche que ce fichier, sur 1 ligne.
2. Le corps de la PR contient maintenant `Fiche: L08-T54` et `Exigences : V3-PLA-126, V3-PLA-129, V3-PLA-179, V3-SEC-004`. Ces quatre IDs sont ceux de la fiche. La phrase « même contenu (SHA 33e6de97) » est de nouveau vraie : la fiche est passée à `fait` comme dans 33e6de97, et le code et le journal n'ont pas changé.

## Contrôles à cette tête
- Diff contre main : 4 fichiers, tous dans `fichiers_autorises`. Taille : 199 lignes ajoutées et 5 retirées, soit 204 pour une limite de 220. Aucune ligne « - - ».
- CI verte (run 43168121995) : verifier, tests, e2e, gardes, types, lint, licences, gitleaks, stryker. Mergeable « clean ».
- Tests ciblés en local : `exercice-violation.test.ts`, `violations.test.ts` et `securite/__tests__/arret.test.ts`, soit 3 fichiers et 25 tests au vert.
- Mutations, toutes annulées :
  - retrait de la raison `reprise_absente` (l. 70) : 1 test rougit ;
  - retrait de `ev.cible === 'global' ||` (l. 43) : la mutation survit, mais elle est équivalente. Avec la cible `'global'`, `ev.cible?.societeId` vaut `undefined`, qui diffère de la témoin : le refus a donc toujours lieu. Ce n'est pas un défaut.
- Journal : 7 lignes, commence par `# Journal L08-T54`. Aucun mot interdit, aucun prix, aucune donnée réelle.

## Remarque
- L'historique de la branche contient une fusion `--allow-unrelated-histories` (8feca732). Le diff à trois points reste limité aux 4 fichiers. Si Will fusionne en squash, cette fusion n'a pas d'effet.
