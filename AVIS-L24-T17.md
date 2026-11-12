VERDICT: A CORRIGER

PR n°1198, fiche L24-T17, tête b3570a7b89cb75ddc480ba3cea8f3f25bb8c98e8 (relecteur Opus, lot 5).

Contrôles passés : 6 fichiers, tous dans `fichiers_autorises` ; diff de 177 lignes, limite 280 ; les 7 tests passent en local (vitest `src/emprunts`) ; écriture en brouillon ; aucun montant deviné sans tableau ; aucun secret, prix ni mot interdit ; données fictives ; journal de 8 lignes qui commence par `# Journal L24-T17`. CI verte au moment de la relecture (`verifier` encore en file d'attente). Fiche sensible : fusion par Will seul.

Mutations faites à la main : 10. Survivantes non équivalentes : 2.

## Défauts à corriger (tests seulement)
1. `packages/noyau/src/emprunts/echeance.ts:37` : on peut retirer le filtre `!estDateValide(e.date) ||` sans qu'aucun test rougisse. Un tableau avec une date invalide lèverait alors l'erreur de `comparerDates` au lieu d'ignorer la ligne. Ajoute dans `echeance.test.ts` un tableau dont une ligne a le bon montant et une date invalide (par ex. `2027-02-30`), et vérifie que `reconnaitreEcheance` rend `undefined` sans lever d'erreur.
2. `packages/noyau/src/emprunts/echeance.ts:23` : on peut retirer `Number.isSafeInteger(p) &&` sans qu'aucun test rougisse, car le NaN est déjà rejeté par `p >= 0`. Le commentaire annonce pourtant le refus d'une part « non entière ». Ajoute dans `tableau-incoherent-refuse` une part non entière (`capital: 1.5 as never`) et une part `Infinity`, avec `tableau_incoherent` attendu.

## Remarques (non bloquantes)
- `ventilation.ts:15` : on peut retirer `!Number.isSafeInteger(ligne.montant) ||` sans qu'aucun test rougisse. Un NaN lèverait alors `ErreurArgent` au lieu de `pas_un_debit`. Un cas `ligne(Number.NaN)` dans `somme-egale-au-debit` le fixerait.
- `echeance.ts:32` : la même mutation survit, mais elle est équivalente (un débit non entier n'égale jamais un total entier).
- Le corps de la PR emploie, à propos de `tsc` et `eslint`, une expression proscrite par la règle 12 de CLAUDE.md : à reformuler.
