VERDICT: OK
PR #1175, fiche L20-T21, tête f9e8a2332f3354115c30d867ba5c82560946f602 (seconde relecture, relecteur Opus, lot 5). Avis précédent : A CORRIGER sur 102d9a3812acf5a1bd9f476b5e89d0c05e76f133.

## Défauts précédents : levés (vérifiés par mutation)
1. Frontière basse de la classe (`a-nouveaux.ts:75`) : les comptes `012000` et `901000` sont testés. `classe >= 0` fait rougir 1 test ; `classe <= 9` en fait rougir 5.
2. Statut de N+1 (`a-nouveaux.ts:128`) : supprimer `statutConnu(exerciceN1.statut)` fait rougir 1 test.

## Régressions : aucune
- `a-nouveaux.ts` est inchangé depuis la tête précédente. Seul le test a changé, et seulement par ajout : l'ancien cas `8x` et `801000` est toujours dans la boucle.
- Autres mutations rouges : `fin >= debut` remplacé par `>` ; le résultat écrase le solde 120/129 au lieu de s'y ajouter.
- 4 fichiers, tous dans `fichiers_autorises` ; 250 lignes pour un maximum de 250 ; 7/7 tests en local ; journal de 4 lignes ; aucun mot interdit, aucun prix, aucun secret.

## Remarques
- CI : `tests` est rouge à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui rougit aussi sur origin/main 347401ab. `verifier` est rouge parce qu'il en dépend. Ce n'est pas un défaut de l'auteur. Les autres jobs sont verts, `gitleaks` compris.
- La fiche est sensible : fusion par Will seul.
