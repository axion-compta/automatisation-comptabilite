VERDICT: OK
93d1065b6345a672314dbe67d4c4d7d592ea13d0

PR #1093, fiche L11-T45, relue au SHA de tête ci-dessus (première relecture, relecteur Opus). Fiche lue sur origin/main.

## Vérifié
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 29 lignes ajoutées et 1 retirée, pour une limite de 60. Aucune ligne « - - ». Non sensible.
- `e17-statuts.ts` : export `e17Statuts` avec exactement les trois libellés de la fiche ; `e17.ts` intact.
- `e17-statuts.test.ts` : trois tests nommés `statut-brouillon-non-vide`, `statut-refuse-non-vide`, `statut-perso-non-vide` (`it.each`, sans alias de `it`) ; chacun exige une chaîne non vide, différente des quatre libellés de `e17.statuts`.
- Tests locaux (Node 22) : 3 sur 3. Mutations, chacune annulée ensuite :
  - `'Brouillon'` remplacé par `''` : `statut-brouillon-non-vide` rougit ;
  - `'Refusé'` remplacé par `'   '` : `statut-refuse-non-vide` rougit (le `trim()` fonctionne) ;
  - `'Personnel, hors remboursement'` remplacé par `'Validé'` : `statut-perso-non-vide` rougit (contrôle de différence).
- `garde:textes` vert. CI verte au SHA relu (run 43155307446 : verifier, tests, e2e, gardes, types, lint, licences, gitleaks, stryker). Fusion avec main actuel (0291c86f) sans conflit.
- Journal : 4 lignes, commence par `# Journal L11-T45`. Aucun prix, aucun mot interdit, aucune donnée réelle.

## Remarques (non bloquantes, pour Will)
- Doublon : main contient déjà `packages/textes/src/ecrans/e17-libelles-statuts.ts` (export `e17LibellesStatuts`, mêmes trois libellés) et son test, avec les mêmes trois noms de tests. Ces fichiers sont arrivés par la PR #1034 (L10-T48). L'écran E17 (`apps/web/src/ecrans/e17/Ecran.tsx:6`) et `e17.test.tsx` les utilisent déjà. Le besoin de la fiche est donc couvert sur main, et `e17Statuts` n'a aucun consommateur : deux sources pour le même texte, qui peuvent diverger sans qu'aucun test ne le voie. L'auteur l'a signalé et a suivi la fiche à la lettre.
- Pour garder une seule source sans sortir du périmètre, `e17-statuts.ts` pourrait réexporter l'existant : `export { e17LibellesStatuts as e17Statuts } from './e17-libelles-statuts.js';`. Les trois tests restent valides. Autre choix : fermer cette PR et passer la fiche à `fait` par une PR de statut seul. C'est à Will de trancher.
- Dans la fiche, « Hors périmètre » (PR 926 corrigera `Ecran.tsx`) est dépassé : `Ecran.tsx` affiche déjà les trois statuts.
