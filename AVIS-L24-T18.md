VERDICT: A CORRIGER

PR n°1155, fiche L24-T18, tête 913233faf1e4f457495fe7c45049dfa4ae1089a6 (relecteur Opus, lot 5).

Contrôles passés : 4 fichiers, tous dans `fichiers_autorises` ; diff de 193 lignes, limite 220 ; les 5 tests nommés passent en local ; écriture en brouillon seulement ; aucun taux en dur dans le code (la table est passée en paramètre) ; aucun secret, prix ni mot interdit ; données fictives ; journal de 8 lignes qui commence par `# Journal L24-T18`.

Mutations faites à la main : 10. Survivantes : 3.

## Défaut à corriger
1. `packages/noyau/src/ecritures/saisie.ts:68` : on peut remplacer l'arrondi de la TVA recalculée sur le HT saisi (`pourcentage(ht, …, 'demi-superieur')`) par `'demi-inferieur'` sans qu'aucun test rougisse. Or c'est cet arrondi qui décide si une saisie HT + TTC est acceptée ou refusée en `desequilibre`. Ajoute dans `saisie-desequilibree-refusee` un cas à la frontière de l'arrondi : TTC `1000`, HT `833`, taux 20 % (TVA 166,6 arrondie à 167). Il doit être accepté, avec `[833, 167, 1000]` attendu.

## À ajouter dans la même passe (petits)
2. `saisie.ts:57` : on peut retirer `!Number.isSafeInteger(entree.montantHt) ||` sans qu'aucun test rougisse. Ajoute `montantHt` à `NaN` et à `1.5`, avec `montant_invalide` attendu (seul `-1` est testé aujourd'hui).
3. `saisie.ts:42` : on peut retirer le retrait des accents (`.replace(/\p{M}/gu, '')`) sans qu'aucun test rougisse. Ajoute dans `proposition-compte-depuis-libelle` un libellé qui ne diffère de l'historique que par un accent (par ex. « Papèterie du Centre »).

## Remarques (non bloquantes, pour Will)
- La fiche est contredite par le code réel : aucune construction d'écriture par le chat n'existe (`chat/proposition.ts` ne fait qu'envelopper un `apres` opaque). Le test `equivalence-avec-le-chat` compare donc la saisie à une écriture écrite à la main. C'est un test de valeur fixe, pas une équivalence. L'auteur le signale dans la PR. À trancher par une fiche quand la voie du chat construira des écritures.
- `montantHt` optionnel ajouté à l'entrée, hors signature de la fiche, pour rendre `saisie-desequilibree-refusee` atteignable : acceptable.
- Le corps de la PR emploie, à propos de `tsc` et `eslint`, une expression proscrite par la règle 12 de CLAUDE.md : à reformuler.
