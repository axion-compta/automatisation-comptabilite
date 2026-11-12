VERDICT: A CORRIGER

PR n°1159, fiche L22-T34, tête relue : f0a696d7a1f4d7922a256f94867806b20a5fc484

Vérifié : 4 fichiers, tous dans fichiers_autorises ; 131 lignes (max 200) ; 6 tests nommés verts ; CI verte ; aucun Math.random ; données fictives ; aucun secret, prix ni mot interdit.

## Défauts
1. packages/donnees-fictives/src/reference-1000.ts:27 : `Number.isSafeInteger(graine)` accepte toute graine entière, mais `creerAlea` la réduit par `graine >>> 0`. Deux graines différentes donnent donc le même jeu : 1 et 2^32+1, ou -1 et 2^32-1 (vérifié : JSON des pièces identique). C'est contraire au test nommé `graine-differente-jeu-different`. Correction : n'accepter que les entiers de 0 à 2^32-1 (RangeError sinon) et ajouter à `mille-pieces` les cas -1, 2^32 et Infinity.
2. reference-1000.test.ts : des valeurs propres à chaque strate ne sont pas testées. Ces mutations restent vertes (6/6) :
   - `pages: 1` pour toutes les pièces (strate plusieurs_pages) ;
   - `degradee: false` partout (strate scan_degrade) ;
   - `devise: 'XXD'` partout (strate devise) ;
   - code de TVA de multi_taux réduit à un seul taux ;
   - code `TF-AL` de autoliquidation supprimé.
   Le code de TVA est une valeur attendue exigée par la fiche. Correction : dans `chaque-strate-au-moins-60`, vérifier pour chaque strate son marqueur (pages >= 2, degradee, devise différente de la devise par défaut, codeTva contenant « + » pour multi_taux, `TF-AL` pour autoliquidation, sans `TF-AL` ailleurs).

## Remarques
- Avec le minimum HT mis à 1 centime au lieu de 1000, la mutation survit aussi : la borne basse du HT n'est pas testée. Mineur.
- La ligne 36 `if (tva === 0 && ...) tva = signe` ne sert jamais (HT >= 1000 et taux >= 500 pb). Mineur.
