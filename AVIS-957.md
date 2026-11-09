VERDICT: A CORRIGER
SHA relu : f703382b6c8d29ee8a3945c5fda776628b063fa6

Fiche L02-T06, PR 957. Périmètre (3 fichiers autorisés), taille (14 lignes nettes, max 80), journal (9 lignes, en-tête correct), mots interdits et prix : rien à signaler. CI verte (9/9) au SHA relu.

## Vérification des deux mesures corrigées
- Score Stryker du noyau : MESURÉ, reproduit par le relecteur. `npx stryker run` dans packages/noyau au commit 69605cb7251a1b43b26ae45355f065ca29dea6c3 (bien sur main) : 86,67 %, 195 tués, 30 survivants, 0 délai, 0 non couvert. Identique au journal.
- Échecs CI : MESURÉ, cohérent. Recherche GitHub : 79 PR « L02-T* » fusionnées, 70 fiches distinctes, 1 fermée sans fusion (785). Chaque PR porte 9 contrôles : 79 × 9 = 711. Échantillon de 3 PR (187, 332, 813) : 9/9 en succès au dernier commit. Le chiffre « 7 runs de workflow en échec sur 56 » n'a pas été recompté (remarque).

## Défauts
1. REPRENDRE.md:54 (bloc « Lot 13 ») : « Score Stryker du noyau à la fin : 86,67 % (09/11/2026…) ». Ce bloc relève la fin du lot 13 (08/11) ; une mesure du 09/11 sur main 69605cb n'est pas le score « à la fin » du lot 13. C'est une attribution inexacte, et la fiche (À faire 1) limite l'écriture au bloc du lot 02. Correction : rétablir la ligne d'origine (« non mesuré »).
2. REPRENDRE.md:80 (bloc « Lot 14 ») : même écart de périmètre ; le bloc date ses relevés du 08/11. Correction : rétablir « score Stryker du noyau sur main : non mesuré » ; la mesure du 09/11 reste dans le bloc du lot 02 (ligne 89), où elle est datée et sourcée.

## Remarques
- REPRENDRE.md:89 : préciser la source du décompte des runs (« actions/runs, 3000 derniers runs ») comme dans le journal, ou le retirer s'il n'est pas reproductible.
- La garde fiches signale le partage de REPRENDRE.md entre lots (avertissement seulement).
