VERDICT: OK
SHA relu : f161560991dac2b4ffecd68359b5000fee564fd6
PR 792, fiche L11-T23 (faux serveur : frais en lecture), branche lot-11/L11-T23.

## Contrôles
- Périmètre : 6 fichiers modifiés, tous dans `fichiers_autorises` ; `garde:perimetre` vert (121 lignes, maximum 250) ; aucune ligne binaire « - - ».
- Main fusionné sans perte : la branche contient e6fffd9 (main au moment de la fusion) ; le diff à trois points ne contient que les 6 fichiers de la fiche. Une fusion d'essai avec le main actuel (7dc31d2) passe sans conflit et n'apporte rien d'autre.
- Tests : `suiteFrais` est jouée sur les deux cibles dans `contrat-commun.test.ts` (14 tests verts). `pnpm verifier` : tests (689 fichiers) et gardes verts. L'étape types échoue seulement à cause de Node 22 dans le cloud ; `tsc --noEmit` passe à la main sur faux-serveur et sur contrat.
- Mutations sur `domaines/frais.ts` et `handlers.ts`, toutes rouges : validation de la query retirée (1 test rouge), 404 changé en 200 (1 rouge), query ignorée (4 rouges), handlers non branchés (7 rouges). Les mutations sont annulées.
- Gardes : `garde:portes` vert pour L11-T23 (porte `e17-frais` sur main, validée par Will), `garde:fictif` et `garde:termine` verts. `.github/` et les gardes ne sont pas modifiés.
- Cas limites : NaN, 1.5, 0, 101, décalage négatif, date impossible, statut inconnu, période inversée, ids `constructor`, `__proto__` et `a/b`.
- Journal : 7 lignes, commence par `# Journal L11-T23`. Aucun mot interdit, aucun prix, aucune donnée réelle, aucune valeur légale en dur.

## Remarques (non bloquantes)
- `packages/faux-serveur/src/domaines/frais.ts:21` : pour une période inversée, le faux serveur rend `BORNES_INVALIDES` (defined: true), alors que le vrai serveur rend `BAD_REQUEST`. La suite compare seulement le statut 400 (écart noté au journal). L'écran E17 ne doit pas dépendre du code d'erreur tant que les deux cibles diffèrent ; il faudra les aligner dans une fiche ultérieure.
