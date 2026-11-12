VERDICT: A CORRIGER

PR n°1224, fiche L19-T24 (sensible), relue au SHA de tête 3400b3231d6000fdb68c80c7015b74fde1969add.

Le code suit la fiche. Mais deux gardes de `packages/noyau/src/ecritures/proposition-lettrage.ts` ne sont couvertes par aucun test : quand on les casse, les 11 tests restent verts (j'ai vérifié les deux mutations moi-même).

## Défauts
1. Le comportement des sous-comptes n'est pas testé. Si l'on remplace `/^(401|411|455)/` par `/^(401|411|455)$/` à la ligne 34, les sous-comptes (4011, 4551) sont exclus et aucun test ne le voit.
   Correction : dans `packages/noyau/src/ecritures/__tests__/proposition-lettrage.test.ts:47`, ajouter des sous-comptes à la liste des comptes acceptés, par exemple `['401', '411', '455', '4011', '4551']`.
2. Un groupe de lignes à zéro n'est pas testé. Si l'on retire `&& membres.some((x) => net(x) !== 0)` à la ligne 63, le code propose un groupe « référence » fait uniquement de lignes à zéro, et aucun test ne le voit.
   Correction : dans `proposition-lettrage.test.ts:83`, donner une référence commune aux lignes à zéro, par exemple `l('a', 0, 0, { reference: 'R' }), l('b', 0, 0, { reference: 'R' })`, et vérifier qu'aucune proposition n'est faite.
   Ces deux corrections modifient des lignes existantes. La taille reste à 219 lignes, sous le plafond de 220.

## Vérifié sans défaut
- Les 4 fichiers modifiés sont tous dans `fichiers_autorises`. La taille est de 219 lignes sur 220 au plus. Rien dans `.github/`, aucune dépendance, aucun octet NUL.
- Les 8 tests nommés et 3 tests de cas limites sont présents. Aucun test n'a été supprimé. 11 tests sur 11 passent, et la CI est verte au SHA de tête.
- Mutations tuées :
  - ancre `^` retirée ;
  - tolérance de 1 centime ;
  - unicité du débit ou du crédit ;
  - `isFinite` ;
  - borne négative ;
  - lettre déjà posée ;
  - exclusion des lignes de référence ;
  - motif, auteur, date ou code invalides ;
  - auxiliaire retiré de la clé ;
  - groupe vide.
- Cas limites traités : NaN, Infinity, montant négatif, montant décimal, entrée vide, écart de 1 centime dans les deux sens, comptes 4010 et 4011 séparés, comptes 5401, 41 et 400 rejetés, date 2026-02-30 refusée.
- Aucun mot interdit, aucun prix, aucun secret, données fictives. Le journal fait 6 lignes avec le bon en-tête.

## Remarques (non bloquantes)
- La phase « montant » peut associer deux lignes qui portent des références différentes et non vides (par exemple FA-1 et FA-2). La fiche ne l'interdit pas ; c'est à trancher pour l'écran Lettrage.
- Mutations sans effet sur le comportement (survivent sans que ce soit un défaut) : `membres.length >= 1`, `n === 0` retiré, `n >= 0`.
