VERDICT: OK

PR n°1155, fiche L24-T18, seconde relecture au SHA de tête bdbe0f797d9993b2713c2b2c05da2d06e644984f (avis précédent : A CORRIGER au SHA 913233faf1e4f457495fe7c45049dfa4ae1089a6).

## Défauts précédents : levés
1. Arrondi de la TVA recalculée sur le HT (`saisie.ts:68`) : le cas TTC 1000, HT 833 est accepté avec `[833, 167, 1000]`. Mutation `'demi-superieur'` -> `'demi-inferieur'` : rouge.
2. `montantHt` à `NaN` et à `1.5` : `montant_invalide` attendu. Retrait de `!Number.isSafeInteger(entree.montantHt) ||` : rouge.
3. Accents : « Papèterie du Centre » propose 606. Retrait de `.replace(/\p{M}/gu, '')` : rouge.
4. Le corps de la PR est reformulé.

## Pas de régression
- Depuis la relecture précédente, seul `saisie.test.ts` a changé ; `saisie.ts` n'a pas bougé.
- Vitest sur `saisie.test.ts` : 5/5 au vert. Mutation de l'arrondi HT depuis le TTC (`saisie.ts:67`) : rouge.
- 4 fichiers, tous dans `fichiers_autorises` ; 198 lignes (plafond 220) ; journal de 8 lignes ; aucun secret, aucun prix, aucun mot interdit ; données fictives.

## Remarques (non bloquantes, pour Will)
- Le test `equivalence-avec-le-chat` compare à une écriture écrite à la main, car la voie du chat ne construit pas encore d'écritures. Une fiche devra le trancher.
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs`. Ce test est rouge aussi sur `main` et la PR ne le touche pas. Ce n'est pas un défaut de l'auteur.
