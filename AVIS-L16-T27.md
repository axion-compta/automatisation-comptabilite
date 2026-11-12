VERDICT: OK

PR #1121, fiche L16-T27, relue au SHA de tête 2a3fbea0c3a1a8e0fcdd75e12f8095a130333965 (relecteur Opus, 12/11/2026).

## Contrôles
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 173 lignes ajoutées et 3 retirées (max 220).
- Tests : `versions.test.ts`, 5/5 verts en local ; les 5 noms exigés sont présents. CI verte (gardes, types, lint, tests, e2e, stryker, verifier).
- Mutations à la main : sans `verifierChaine`, le test rougit (2 échecs) ; `auteur` = `canal`, le test rougit (2 échecs).
- Pas de valeur légale, de prix ni de mot interdit ; acteurs en @exemple.fr. Le journal fait 8 lignes et commence par `# Journal L16-T27`.
- Changement de signature (`parametresJournal`) : justifié, car `verifierChaine` exige `creeLe` (`verifier.ts`). La fiche a été mise à jour dans la même PR.

## Remarques (non bloquantes)
1. Fiche : la ligne `bloque_par` (V1) est retirée dans la PR elle-même. Le motif cité est « levé par Will le 12/11/2026 », mais aucune PR de pilotage séparée ne le confirme, contrairement à #1096 et #1097. Will doit le confirmer en fusionnant.
2. `versions.ts:32` : le repli sur `avant.id` (événement de suppression avec `apres` nul) n'est pas testé. Si on retire `e.avant` de la boucle, les tests restent verts. Ajouter un cas `ecriture.supprimee`.
3. `versions.ts:71` : la comparaison profonde (`identique`) n'est pas testée. Avec `!==`, les tests restent verts. Ajouter un champ objet identique entre deux versions.
4. `versions.ts:43` : le filtre `societeId` équivaut à la vérification de chaîne, qui refuse déjà `societe_melangee`. C'est une défense en profondeur, à garder.
5. Si `entrees` n'est pas un tableau, `verifierChaine` lève `ErreurJournal('contenu_invalide')` et non `ErreurVersions`. Le cas est mineur.
