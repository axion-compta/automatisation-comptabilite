VERDICT: A CORRIGER
SHA relu : 14e03c587752ee682dc00a7acf127b9caf35c84f

PR 990, fiche L00-T68 (sensible, garde périmètre). Relecture Opus du 11/11/2026.

## Points stricts vérifiés
- `git diff origin/main -- packages/contrat/openapi.json` : vide.
- `node packages/contrat/scripts/diff.mjs` (pnpm contrat:diff) : « identique », code 0.
- Tests de disjonction des clés (modules entre eux, avec le socle, avec contratChat), unicité des operationId et des couples (méthode, chemin), fusion par méthode (GET et POST gardés, méthode en double = erreur), test durable `routesEcritureSansEnTete(contratFictif)` : présents dans `registres.test.ts`.
- `outils/gardes/perimetre.mjs` relu ligne par ligne : `estOpenapi` = socle OU `^packages/contrat/openapi/lot-\d\d/openapi\.json$` ; les fragments sont additionnés dans `lignesOpenapi` ; l'exemption reste soumise à `estGenere()` (qui lance diff.mjs, lequel compare maintenant aussi les fragments) et elle est refusée si `packages/contrat/scripts/` est touché ; le plafond de 600 porte sur le total. Tests T68-1 à T68-3 présents ; faux noms (`lot-3`, `x.json`, sous-dossier) comptés en entier.
- 27 fichiers, tous dans `fichiers_autorises` ; 318 lignes (plafond 320). 485 tests contrat, 64 tests gardes et 7 tests en-tetes verts en local ; tsc vert (contrat, serveur). CI de ce SHA verte (verifier compris).

## Défaut bloquant
1. `packages/contrat/src/openapi.ts:60` : `genererOpenapi()` lit `contrat`, qui vaut maintenant `{ ...contratSocle, ...contratModules }`, au lieu du socle seul. La fiche (À faire 3) demande « `genererOpenapi()` = socle + chat ». Le défaut ne se voit pas tant que les 15 lots sont vides, mais il casse tout au premier lot non vide. Essai jetable (route GET fictive ajoutée dans `lot-03.ts`, puis retirée) :
   - `openapi.json` du socle change (contrat:diff : « openapi.json obsolète ») : le socle ne reste pas identique à l'octet ;
   - `genererOpenapiComplet()` lève « OpenAPI : méthode en double GET /fictives-lot », parce que la route est présente dans le socle ET dans le fragment du lot ; `en-tetes.test.ts` tomberait ;
   - les 19 tests de `registres.test.ts` et `contrat.test.ts` restent verts : aucun test ne couvre ce cas.
   Correction : `genererOpenapi()` doit utiliser `contratSocle` (importé de `routes.js`) + `contratChat`. Ajouter un test durable : avec une source module fictive, ou en vérifiant que l'ensemble des operationId de `genererOpenapi()` vaut exactement ceux de `contratSocle` + `contratChat`, et que `genererOpenapiComplet()` ne lève pas quand un lot contient une route.

## Remarques (non bloquantes)
- `contrat.test.ts` : le test « les contrôles parcourent le contrat complet » appelle `routesEcritureSansEnTete({ ...contrat, ...contratChat })`, ce qui revient à l'appel par défaut ; il ne prouve pas que les modules sont parcourus (c'est le test fictif de `registres.test.ts` qui le prouve). Acceptable.
- `diff.mjs` : un fichier isolé (pas un dossier) placé dans `openapi/` est signalé comme « fragment orphelin », ce qui est correct ; un dossier `lot-NN` vide de lot non vide est signalé comme « fragment manquant », correct aussi.
