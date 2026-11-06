# ADR 0004 : Argent en centimes

- Statut : accepté
- Date : 2026-11-02

## Contexte
Les nombres flottants produisent des erreurs d'arrondi inacceptables en comptabilité.

## Décision
Tout montant est un entier en centimes. Une règle eslint interdit le flottant dans le noyau d'argent ; les tests de mutation visent au moins 80 %.

## Conséquences
Les conversions d'affichage sont isolées en bordure ; le noyau reste exact.
