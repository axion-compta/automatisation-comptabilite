VERDICT: A CORRIGER

PR #1205, fiche L20-T31, relue au SHA de tête b10b31792aa8ed7b1956d38d67d4ea03b9e19497.

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 150 lignes, pour une limite de 150 (pile à la limite).
- Tests ciblés : 4 tests sur 4 réussis (les 3 tests nommés par la fiche et les refus).
- Aucune validation automatique. Aucun mot interdit, aucun secret, aucun prix, données fictives. Le journal fait 7 lignes.
- CI : tous les jobs sont verts, sauf `verifier` encore en file.
- Mutations qui font échouer un test : limite `< MAX_CARTES`, condition de pièce douteuse sans `!p.lue`, chaînes vides pour la pièce rangée ou proposée, `aValider` égal au nombre total de pièces, `lues` égal au total, doublons.
- Mutation équivalente : `<= MAX_CARTES` remplacé par `< MAX_CARTES + 1` (nombres entiers).

## Défaut
1. `packages/noyau/src/chat/depot-recap.ts:52` (`douteuse`) : la confiance `a_verifier` n'est pas fixée par les tests. Remplacer `p.confiance === 'douteux'` par `p.confiance !== 'sur'` ne fait échouer aucun test : la pièce p5 en `a_verifier` du test `compteur-a-valider-plus-n` ne sert qu'au message. Ajouter dans ce test `expect(r.questions.map((q) => q.pieceId)).toEqual(['p3', 'p4'])`, ou toute autre assertion qui fixe le choix retenu pour `a_verifier`.

## Remarques (ne bloquent pas)
- La taille est exactement à la limite : la correction devra rester dans les 150 lignes (par exemple en raccourcissant un commentaire).
