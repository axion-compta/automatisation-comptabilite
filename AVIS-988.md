VERDICT: OK
SHA relu : 80b47acca66ec92efde3369a1fdf6c85e73f2980

# Avis PR 988 (L00-T68 : fiches L00-T68, L00-T72, L00-T73, L00-T74), 4e relecture

Relecture stricte (fiches sensibles) au SHA de tête ci-dessus, contre la base `01c45796928cd15f568768dfcd141f11f6307cba` et contre `origin/main` actuel (`43ec2c7e2f0d244ddecbfc2562830097e1e4a723`). L'avis précédent (SHA 9a5f361c) est remplacé. Le commit 80b47ac change 4 lignes : L00-T68 `criteres`, points 5 et 7 ; L00-T72 point 2.

## Défauts de l'avis précédent
1. **L00-T72, point 2 contre point 3 : corrigé.** Le point 2 dit maintenant `implementerLotNN(os: OsContrat, options: OptionsRouteur & OptionsModules)` et `implementerModules(os, options)` « même type `OptionsRouteur & OptionsModules` ». Les points 2 et 3 disent la même chose : les options ajoutées par un lot arrivent jusqu'à son `implementerLotNN`.
2. **L00-T68, test durable impossible : corrigé.** Le point 5 dit que `routesEcritureSansEnTete(source = contrat complet)` et la recherche des lectures par POST (`routesLectureParPost`, `openapi.ts` ligne 27 sur main) prennent une source facultative, avec le contrat complet par défaut, sans changer les appelants actuels. Le point 7 dit que le test appelle `routesEcritureSansEnTete(contratFictif)` et attend l'operationId fictif. Le test durable est ajouté aux `criteres`. `registres.test.ts` et `openapi.ts` sont dans les `fichiers_autorises` de L00-T68 ; `definitions()` (ligne 17, non exportée) reste interne, ce qui suffit.

## Contrôles généraux (sans écart)
- Diff contre main : 4 fichiers (T68 41, T72 35, T73 34, T74 45 lignes), 155 lignes ajoutées, aucune supprimée, aucune ligne « - - », aucun octet NUL. Fusion avec `origin/main` sans conflit.
- 15 champs dans chacune des 4 fiches. Phases et dépendances inchangées : T68 en P0 sans dépendance, T72 en P0 après T68, T73 en P4 après L06-T29 (fait), T74 en P4 après T68, T72 et T73. `fichiers_autorises` inchangés et suffisants pour chaque « À faire ».
- `node outils/gardes/fiches.mjs` sur la fusion avec main : « 906 fiches cohérentes », code 0 (217 avertissements de partage entre lots, attendus avant L00-T74).
- Fiches arrivées sur main depuis l'avis précédent : L05-T55 et L10-T33 passent à `fait` ; aucune n'est dans les listes de L00-T74, qui restent justes.
- Aucun mot interdit, prix, secret ni nom réel.

## Rappel
PR sensible : fusion par Will seul, après CI verte.
