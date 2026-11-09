VERDICT: A CORRIGER
SHA relu: 0b5d7139977b593b334d5bc4c47fe88568294ea2

# Avis relec102-g01-837 — PR 837, fiche L04-T30 (branche lot-04/L04-T30)

## Constat
Le diff `git diff origin/main...origin/lot-04/L04-T30` ne touche qu'un fichier : `pilotage/fiches/L04-T30.md` (+3 / -2). La fusion de main (0b5d713) est propre : aucune perte côté main, et aucune ligne « - - » dans le numstat. La CI est verte, mais elle ne relit qu'un amendement de fiche.

Points vérifiés et tenus : le fichier modifié est autorisé, la taille est sous 300 lignes, aucun mot interdit, aucun prix, aucune donnée réelle, aucun fichier `.github/` ni aucune garde touchés.

## Défauts bloquants
1. Le travail de la fiche n'est pas livré. `packages/contrat/src/domaines/pieces-service.ts` n'existe pas, et `apps/serveur/src/domaines/pieces.ts:8-13` renvoie encore `NOT_IMPLEMENTED` (les bouchons de L04-T55). Correction : écrire le service pur (tri `recuLe` décroissant puis `id`, filtres combinés, recherche fournisseur sans casse ni accents, masquage des pièces `sensible`), puis brancher `listerPieces` et `lirePiece` avec `PIECE_INCONNUE` en 404.
2. Les 6 tests nommés sont absents (`liste-enveloppe-et-tri`, `filtres-combines`, `recherche-fournisseur-sans-accent`, `piece-inconnue-404`, `sensible-masquee-dans-le-detail`, `serveur-repond-aux-pieces`). Comme `tests_requis: oui`, le critère « les 6 tests nommés passent » n'est pas tenu. Correction : les ajouter dans `packages/contrat/src/__tests__/pieces.test.ts` et `apps/serveur/src/__tests__/pieces.test.ts`. Ils doivent rougir si le tri, un filtre ou le masquage est faux.
3. Le journal `pilotage/journal/L04-T30.md` est absent. Correction : l'ajouter, avec `# Journal L04-T30` en tête et 10 lignes au plus.

## Remarques
- L'amendement de fiche (autoriser `pieces-branchement.test.ts`, en remplaçant seulement `p1` par `piece-001`) est cohérent avec le branchement réel. Si ce test est touché, seul cet identifiant doit changer.
- Le titre de la PR annonce l'implémentation, alors que son contenu se limite au pilotage. Il ne faut pas fusionner la PR en l'état comme si la fiche était livrée.
- Aucun test ciblé n'a été lancé et aucune mutation n'a été faite : la branche ne contient ni code ni test propres à la fiche.
