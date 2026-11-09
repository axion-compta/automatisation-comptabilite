VERDICT: OK
SHA relu : 3ce9f76c4645e0dec55dbf5ab2d0887a6d9794ca
PR : 924 — Fiche : L03-T46 (sensible: non)

## Vérifications
- Fichiers modifiés : 6, tous dans `fichiers_autorises`.
- Taille : 198 lignes ajoutées, 1 retirée (limite de la fiche : 300).
- Journal `pilotage/journal/L03-T46.md` : 6 lignes, commence par `# Journal L03-T46`.
- Règle 13 (auteur3) : aucune adresse, aucun port, aucun identifiant ni secret ; lecture par `useLecture` contre le faux serveur (`demarrerNoeud`) ; données fictives.
- Aucun mot interdit, aucun prix, aucune garde ni aucun test affaibli.
- Critères : `vitest apps/web/src/ecrans/e57` donne 6 tests sur 6 ; `pnpm verifier` passe (24 étapes, lancé en Node 22 avec engine-strict désactivé).
- Mutations : filtre neutralisé, donc rouge ; résumé calculé sur la liste filtrée, donc rouge ; `aria-label` du tiret retiré, donc rouge ; écart nul forcé en Montant, donc rouge.

## Remarques (non bloquantes)
- `apps/web/src/ecrans/e57/route.tsx:9` : `groupe: 'menu'` au lieu de `'documents'`, parce que le type `DefinitionEcran` n'accepte que menu, reglages ou autre. C'est noté au journal. À reprendre avec le menu.
- `__tests__/e57.test.tsx` (`filtre-alertes`) : un filtre « tout sauf OK » passe encore le test, car les données ne contiennent que ALERTE et OK. Ajouter une ligne IMPOSSIBLE au jeu de données rendrait le test plus fin.
- `liste-non-ok-d-abord` vérifie seulement que l'écran garde l'ordre du serveur. Le tri lui-même est fait côté serveur, comme le dit le journal.
