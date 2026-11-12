VERDICT: OK

PR #1138 (conception MVP, fiches L26), seconde relecture. Tête relue : c4aa9ebd0a5434e383aaebc53dfea2c71469cb1c
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER sur b751026123ddcfee7ad64962a00931f300bca712.

## Défauts précédents : tous levés
1. L26-T15 : `accompagne` n'apparaît plus dans aucune fiche L26. La fiche réutilise `ModeTravail` de main, ou `MODES_TRAVAIL` de L23-T02, et le test `mode-hors-liste-refuse` porte sur la liste réutilisée.
2. Portes n01 et n02 : L26-T27, T28 et T29 sont retirées. Aucune fiche L26 ne les cite plus en `depend_de`, et `un-probleme.e2e.ts` n'est plus dans L26-T13. Les fiches L26 ne visent plus que les écrans `e01` et `e57`, qui ont tous deux une porte. `node outils/gardes/portes.mjs` est vert.
3. L26-T10 : `gel.json` est vide au départ (`[]`) et `empreintes-identiques-vert` utilise un fichier temporaire.
4. L26-T04 : la partie `mode` et le test `modes-autonome-et-saisie-seule` sont retirés. La fiche renvoie à L23-T02.

## La correction n'a rien cassé
- 33 fiches, toutes `a_faire`, sans `bloque_par`. Diff limité à `pilotage/fiches/L26-*.md` et au journal `L26-T01.md` (10 lignes).
- Gardes vertes sur la tête : `fiches` (1096 fiches cohérentes), `textes`, `portes` et `fictif`.
- Chaque `depend_de` existe. La chaîne `openapi.json`, `routes.ts` et `app.ts` est intacte : L26-T15 dépend de L04-T51, L09-T52, L09-T53, L10-T52 et L11-T47, puis T24 dépend de T15 et T25 de T24.
- Fiches non faites de main : aucun recoupement nouveau. Restent ceux déjà signalés, avec L16-T01, L16-T05 et L16-T55 (fiches V1 bloquées, chaînage à faire par Will).
- PR de code ouvertes (#1105, #1129, #1131, #1140) : aucun recoupement de fichiers.
- Aucun mot interdit.

## Remarques (pour Will)
- Les recoupements avec les autres PR de conception, listés dans le premier avis, sont toujours à chaîner par la PR fusionnée en second.
- PR de pilotage, donc sensible : la fusion revient à Will.
