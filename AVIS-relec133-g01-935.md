VERDICT: OK
SHA relu : f7fb53cbd6b0a328d4d7c47ccae1779c07654d0f
PR 935, fiche L02-T59 (écran E12, non sensible), branche lot-02/L02-T59. Relecture après correction (avis précédent : relec131-g01-935).

## Séparateur de texte
- `packages/textes/src/ecrans/e12.ts:40` : `separateur` vaut maintenant `','`, sans espace finale. `apps/web/src/ecrans/e12/Couverture.tsx:26` ajoute l'espace au moment de joindre (`separateur + ' '`).
- Rendu vérifié par un essai local, non poussé : un trou de juillet à septembre affiche « Il manque le relevé de juillet, août, septembre. ».
- Aucun test affaibli : le commit de correction ne touche pas `couverture.test.tsx`. Le fichier de test est le même qu'au SHA 90dd1ec.

## Contrôles
- Fichiers modifiés : 7, tous dans `fichiers_autorises`.
- Taille : 186 lignes ajoutées et 1 retirée (plafond de la fiche : 260, plafond du dépôt : 400). Aucune ligne « - - ».
- Tests : 22 sur 22 passent dans `apps/web/src/ecrans/e12`, dont les 6 tests nommés. `tsc --noEmit` passe sur apps/web et `node scripts/verifier.mjs --gardes` est vert (21 étapes, dont textes et appels).
- Règle 13 : l'écran lit seulement, via le client et le faux serveur L02-T55. Il ne contient ni adresse en dur ni secret.
- Journal : 5 lignes, commence par « # Journal L02-T59 ».
- Aucun mot interdit, aucun prix. Les données sont fictives.

## Remarques (non bloquantes)
- Aucun test ne vérifie le séparateur. J'ai essayé deux mutations (joindre avec `separateur` seul, qui donne « juillet,août », puis avec deux espaces) : les 22 tests restent verts. Le risque est seulement visuel. Un test avec un trou sur plusieurs mois et une égalité exacte sur le texte du bandeau fermerait ce trou.
