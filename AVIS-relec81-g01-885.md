VERDICT: OK
SHA relu : 03fcd9f311320a2696894a85eb2e08f1bfb44cd1
PR : 885 (fiche SENSIBLE L00-T64, branche pilotage/L00-T64), 2e relecture. Diff relu seul : `pilotage/fiches/L00-T64.md` (+40, ajout seul).

## Points de l'avis relec79-g01-885
1. Test borné : présent (À faire 4, l. 29) et dans les `criteres` (« le test nommé exception-partage-l11-t44-bornee passe et rougit si l'entrée masque une paire sans L11-T44 »). Il appelle `analyserFiches(charger().fiches, [])`, garde les erreurs `partage` portées par L11-T27, L11-T38 ou L11-T39 et exige que l'autre fiche soit L11-T44. Il reste en place après le retrait de l'entrée. Réglé.
2. Fiche de retrait : L00-T65 est nommée (Suite, point c), avec `fichiers_autorises` (json, `fiches.test.mjs`, fiche, journal), le critère « aucune entrée `partage` ne cite L11-T27, L11-T38 ou L11-T39 », le retrait ou l'inversion de `exception-partage-l11-t44-motivee` et le maintien du test borné. Les Pièges y renvoient (l. 40). Réglé.

## Contrôle d'ensemble
- Simulation (main + `pilotage/fiches/L11-T44.md` de la branche `pilotage/L11-T44`) : sans exception, 3 erreurs `partage`, toutes « L11-T27/T38/T39 et L11-T44 ». Le test borné passe donc. Avec l'entrée prévue, la garde n'a plus aucune erreur. Sur main seul : 0 paire, et le test borné passe aussi.
- La borne est complète. `fiches.mjs` (l. 96-103) porte l'erreur sur la première fiche de la paire dans l'ordre des noms. Une paire dont la porteuse n'est pas L11-T27, L11-T38 ou L11-T39 n'est pas masquée par l'entrée et fait rougir la garde elle-même. Toute autre paire masquée fait rougir le test borné.
- Entrée JSON : exacte (`id` sans L11-T44, `regle` = `partage`), motivée, ajoutée en fin de tableau, aucune entrée existante ne change, `fiches.mjs` intact.
- Test « motivée » : il rougit sans l'entrée, car la seule entrée `partage` existante ne cite aucune fiche L11.
- `fichiers_autorises` réels et suffisants (json, test, fiche, journal). Taille 80 suffisante pour 1 ligne JSON, 2 tests, journal et statut. Exigence V3-QUA-029.
- Imports demandés sans alias (`lireExceptions`, `charger`, `analyserFiches` depuis `../fiches.mjs`, `test` de `node:test`), comme l. 1 et 6 du fichier de test actuel.
- Aucun mot interdit ni prix (« prix » n'apparaît que dans « aucun prix »), aucun octet NUL, données fictives. `node outils/gardes/fiches.mjs` est vert sur la tête relue (890 fiches cohérentes).

## Remarques (non bloquantes)
- À faire 4 (l. 29), mutation du test borné : la fiche fictive doit avoir un nom plus grand que L11-T27 (par exemple L11-T9x). Sinon l'erreur est portée par la fiche fictive, et le test ne rougit pas. Le préciser à l'auteur au besoin.
- Fiche sensible (garde) : fusion par Will seul.
