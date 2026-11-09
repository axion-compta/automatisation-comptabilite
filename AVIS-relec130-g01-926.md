VERDICT: A CORRIGER

PR : 926 (fiche L11-T31, sensible : non)
SHA relu : bc2f1d41e7028d9c8f262a539dc4288fb8851a58

## Défauts de l'ancien avis (relec124-g01-926)
- Défaut 1 (en-têtes de colonnes) : corrigé. Les en-têtes sont `Date`, `Libellé`, `Montant` et `État`, repris de `e17-frais.ts` et `e12.ts`, sans texte en dur. Le nouveau test `en-tetes-de-colonnes-correspondent-a-la-colonne` vérifie `th` et `data-entete`. La mutation qui remet « À rembourser » sur la colonne montant fait rougir ce test.
- Défaut 2 (état absent pour `brouillon`, `refuse`, `perso`) : NON corrigé, voir plus bas.

## Défauts
1. `apps/web/src/ecrans/e17/Ecran.tsx:22-27` et `:37-41` (`STATUTS`, `Etat`) : pour les statuts `brouillon`, `refuse` et `perso` de `STATUTS_FRAIS`, `Etat` rend `null`. La colonne « État » est vide et aucune phrase ne s'affiche. Ce cas se produit réellement : les données fictives `packages/donnees-fictives/src/frais.ts:102-110` contiennent un frais `refuse` de 12,60 €, un frais `perso` et un trajet `brouillon`. Un frais refusé ou personnel s'affiche donc avec son montant, sans état. On peut le croire en cours de remboursement. La fiche exige « état (`Pastille` + mot) » pour chaque ligne.
   Correction demandée : donner une pastille et un mot à ces trois statuts, avec un test par statut. Les textes manquent dans `packages/textes/src/ecrans/e17.ts`, qui n'est pas dans `fichiers_autorises`. Il faut donc faire élargir la fiche à ce fichier (ajouts seulement) ou passer par une fiche de textes en amont, sans emprunter de libellé faux.

## Contrôles
- Fichiers modifiés : les 5 `fichiers_autorises` seulement. Taille : 223 lignes ajoutées et 1 retirée (limite 300).
- Tests e17 : 18/18 verts, dont les 9 tests nommés. `node scripts/verifier.mjs` (rc 0) passe sur ce SHA, `garde:textes` compris.
- Mutations : en-tête montant remis à « À rembourser », total exclus additionné à « À rembourser ». Chacune fait rougir un test.
- Règle 13 : faux serveur, aucune adresse, aucun secret. Données fictives, aucun mot interdit, aucun prix. Journal : 6 lignes, il commence par `# Journal L11-T31`.

## Remarques (non bloquantes)
- La phrase « ce qui manque » est placée dans la colonne « État » au lieu d'une colonne à part. C'est lisible, mais différent de la liste de la fiche.
