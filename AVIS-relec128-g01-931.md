VERDICT: OK
SHA relu : 972c33a0061b8a608a3f255e4a623585beaa6f7b
PR 931, fiche L09-T46 (sensible), branche lot-09/L09-T46.

## Contrôles
- Fichiers modifiés : les 5 de `fichiers_autorises`. Aucun code dans `src`.
- Taille : 221 lignes ajoutées et 1 retirée (plafond : 300). Aucune ligne « - - ».
- Journal : 5 lignes, commence par « # Journal L09-T46 ».
- Tests : les 13 cas sont présents et passent (P13 à P18 et P22 à P25 dans banc-2.test.ts, soit 10 tests ; P19 à P21 dans banc-profil.test.ts, soit 3 tests).
- Gardes vertes. `tsc --noEmit` passe sur noyau et sur parametres.
- Chiffres vérifiés :
  - P18 : critères `[true, false, true]` avec les seuils de D123-200.
  - P25 : 20 000 € donne 39 673,91 €, entre la base et le seuil majoré ; 21 000 € donne 41 657,61 €, au-dessus du seuil majoré. Le calcul est cohérent avec les seuils de test ; le statut `a_verifier` donne `aVerifier` vrai.
- Chaque paramètre de test indique sa source et une date de relevé.
- Aucun secret, aucun prix, aucun mot interdit. Les sociétés sont fictives.
- Mutations : 4 sur 4 rougissent (seuil du bilan, borne de la date d'effet de l'option, seuil majoré remplacé par le seuil de base, branche « entre base et majoré » supprimée).

## Remarques (non bloquantes)
- Stryker n'a pas été lancé dans cette relecture. Sa configuration mute seulement `src/argent/**`, que cette PR de tests ne modifie pas : le score ne peut pas baisser.
- P25, dernier cas : `PRORATA_A_VERIFIER.statut === 'a_verifier' ? 'a_verifier' : 'sur'` est toujours vrai. Une écriture directe serait plus lisible.
