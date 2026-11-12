VERDICT: A CORRIGER
PR #1172, fiche L20-T26, tête f1aabdb45545aebcaecaa3abd7fdb40c9df75c73

Contrôles passés : 5 fichiers modifiés, tous dans fichiers_autorises ; 123 lignes ajoutées pour une limite de 200 ; les 5 tests nommés passent (5/5) ; `periode.ts` n'est pas modifié ; `node scripts/verifier.mjs --gardes` est vert ; `tsc --noEmit` passe sur noyau ; aucun secret, prix ni mot interdit ; le nom utilisé (Camille Exemple) est fictif.
J'ai fait 12 mutations à la main : 9 font échouer un test, 3 survivent (dont 2 équivalentes).

## Défauts
1. `packages/noyau/src/pieces/classement/rangement-exercice.ts:33`, cas non testé : une pièce dont la date de fin dépasse le dernier exercice. Retirer `dernier !== undefined &&` ne fait rougir aucun test. Or, sans cette garde, une pièce de l'exercice en cours qui finit après tous les exercices (ex. du 2026-12-15 au 2027-01-14) ferait planter le code (`TypeError` sur `dernier.id`). Correction demandée : dans `piece-a-cheval-question`, ajouter ce cas (`{ date: '2026-12-15', dateFin: '2027-01-14' }`), qui doit rendre `undefined`. Ajouter aussi le cas d'une pièce de l'exercice précédent qui finit hors de tout exercice, qui doit rendre le motif `exercice_precedent`.

## Remarques
- Mutations équivalentes, sans action à prévoir : retirer `courant === undefined ||` (si `courant` est vide, `premier` l'est aussi) et remplacer `t.getUTCDate() === jour` par `true` (le contrôle du mois suffit déjà).
- `packages/textes/src/moteur/rangement-exercice.ts` n'est pas testé, parce que la fiche n'autorise aucun fichier de test côté textes. C'est noté au journal : à couvrir dans la fiche E08 suivante.
- `verifier` était encore en file d'attente pendant la relecture.
