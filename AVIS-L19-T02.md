VERDICT: OK
PR #1213 (L19-T02), SHA de tête 02549239839e6b4d89143cb04c0a894fae2afe00

Relecteur Opus, consigne LOT5 section R. Troisième relecture, après l'avis A CORRIGER au SHA c2ba0a36d7c72477404395a9729bb5871a95dd63.

## Suivi de l'avis précédent (vérifié par mutation)
- Défaut 1 (`disabled={desactive}` et `type={type}` dans la branche `raccourci`) : levé. Retirer l'un ou l'autre fait rougir `raccourci-dans-aria-keyshortcuts`.
- Pas de régression sur les défauts des tours précédents. Les mutants suivants sont toujours tués : retrait de `reste.onFocus` ; `return` d'Échap avant `reste.onKeyDown` ; retrait de `montrer(true)` au survol.

## Vérifié
- 5 fichiers, tous dans `fichiers_autorises`. 180 lignes pour 180 permises (garde `perimetre` verte).
- 210 tests verts dans `packages/ui/src/composants` (vitest, Node 22).
- Journal : 9 lignes, commence par `# Journal L19-T02`. Aucun secret, aucun prix, aucun mot interdit ; données fictives.
- CI au SHA de tête : `e2e`, `gardes`, `lint`, `types`, `stryker`, `gitleaks` et `licences` sont verts. `tests` et `verifier` sont rouges, mais pas à cause de cette PR. Seul `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues` échoue, et ce test est aussi rouge sur `origin/main`. La PR ne touche pas `outils/exploitation/`. Il faudra rejouer la CI une fois `main` réparé, avant la fusion.

## Remarques
- `Bouton.tsx`, branche `raccourci` : retirer `className={classes}` laisse les 210 tests verts. Ce code n'a pas changé depuis le premier avis : ce n'est pas une régression. On peut le couvrir sans ajouter de ligne, en ajoutant `bouton(d).className` au `toEqual` existant de `raccourci-dans-aria-keyshortcuts`.
- `pilotage/journal/L19-T02.md:2` parle de 6 tests ; il y en a 7.
- Remarques précédentes toujours valables, renvoyées à une fiche de suivi :
  - l'e2e dépose deux fichiers, à cause de l'anomalie du faux serveur sur un seul fichier ;
  - `/documents/deposer` est ouvert par `page.goto`.
