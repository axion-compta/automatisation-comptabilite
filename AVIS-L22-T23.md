VERDICT: A CORRIGER

PR #1183, fiche L22-T23, tête ca2bacb09e65ace28955818d822224fc3111e34e (relecteur Opus, lot 5).

## Vérifications
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises`. Taille : 265 lignes (max 300).
- Tests ciblés : 14 réussis, 1 ignoré (banc réel sans variable, titre citant L22-T23). Les 7 tests nommés sont présents.
- CI verte (verifier en file d'attente au moment de la relecture). Aucun secret, prix, mot interdit ni chemin réel ; données fictives.

## Défauts
1. `outils/banc/banc-reel.mjs:28-31` (mutation survivante) : la validation `centimesValides(attendu) && centimesValides(obtenu)` de `compare` n'est couverte par aucun test. Si on la retire, les 7 tests restent verts. Scénario : `soldeOuverture` vaut `10.5`, `"1000"` ou `"abc"` à la fois dans le relevé et dans le manifeste ; le résultat est alors `solde_ouverture: ok`, alors que la fiche demande une comparaison au centime. Correction : ajouter un test où la même valeur non entière, puis la même chaîne, figure des deux côtés (`solde_ouverture` et un total du manifeste non entier), avec `ecart` et `ok: false` attendus.
2. `outils/banc/banc-reel.mjs:33-43, 89-91` et `banc-reel.test.mjs:31-37` (fiche contredite) : sur le banc réel, le réimport passe toujours par l'import simulé par défaut. Celui-ci dédoublonne par `id` sur un `Set` neuf, donc le second import crée 0 ligne par construction, même sur des lignes sans `id`. La vérification `reimport` ne peut pas échouer et ne rejoue pas le réimport réel de L02-T21 (`empreinteLigne`, `numeroterOccurrences`, `lignesNouvelles` dans `packages/noyau/src/banque/doublons.ts`), alors que la fiche demande de « vérifier qu'un réimport du même relevé crée 0 ligne » sur la machine du banc. Correction (dans les fichiers autorisés) : dans `banc-reel.test.mjs`, construire un `importeur` sur `doublons.ts` (vitest charge le TS), l'injecter dans le test du banc réel et le tester sur un relevé fictif. Cas à couvrir : deux lignes identiques le même jour comptées comme 2 occurrences, et 0 ligne créée au réimport.

## Remarques (non bloquantes)
- `banc-reel.mjs:79` : remplacer `?? NaN` par `?? 0` ne fait échouer aucun test (sans effet visible, car `solde_ouverture` est déjà en écart).
- `banc-reel.mjs:62-68` : le dédoublonnage `unique` par `id` survit à sa suppression avec l'importeur par défaut. Il deviendra testable avec un importeur injecté qui compte les lignes reçues.
- `banc-reel.mjs:89` : `lignesCreees === 0` contre `<= 0` survit (un importeur renvoyant -1 passerait pour « ok »).
- Le rapport recopie les codes de `constats.json` tels quels : sans conséquence si ce fichier ne contient que des codes CC-xxx.
