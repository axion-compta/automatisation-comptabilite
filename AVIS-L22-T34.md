VERDICT: OK

PR n°1159, fiche L22-T34, seconde relecture, tête relue : 548284cae514d7648080ebfec19c996ddf8b7219

## Défauts précédents (avis sur f0a696d7) : levés
1. Graine hors de 0..2^32-1 : levé. reference-1000.ts:26 n'accepte plus que les entiers de 0 à 0xffffffff. `mille-pieces` vérifie que -1, 2^32, 2^32+1, Infinity et -Infinity sont refusés, et que les bornes 0 et 2^32-1 sont acceptées. Mutants tués : chaque borne retirée, borne déplacée à 2^32, `Number.isInteger` retiré.
2. Marqueurs de strate : levé. `chaque-strate-au-moins-60` vérifie les pages, `degradee`, la devise, le code multi-taux et `TF-AL`, dans les deux sens (la strate porte son marqueur, les autres ne le portent pas). Les 5 mutants signalés sont tués, ainsi que leurs inverses (`degradee: true` partout, 2 pages partout, devise par défaut changée).

## Contrôles passés
- Les 4 fichiers sont dans fichiers_autorises ; 154 lignes sur 200 au plus ; aucune ligne « - - ».
- Les 6 tests nommés sont verts.
- La remarque de l'avis précédent est levée aussi : la borne basse du HT est testée (mutant `1 + entier(...)` tué). Mutants tués également : TTC décalé de 1, signe des avoirs retiré.
- Aucun Math.random ; garde:litteraux verte ; données fictives (noms inventés, aucun IBAN ni e-mail). Aucun secret, prix ni mot interdit. Journal : 6 lignes, commence par « # Journal L22-T34 ».
- Aucune régression : seuls le contrôle de la graine et les tests ont changé.

## Remarques
- La ligne 38 (`if (tva === 0 && ...) tva = signe`) ne sert toujours jamais. Mineur.
- CI : les jobs `tests` et `verifier` sont rouges, mais pas à cause de cette PR. Le test en échec est `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, qui échoue aussi sur origin/main 347401ab.
