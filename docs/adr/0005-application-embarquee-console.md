# ADR 0005 : Application embarquée dans la console

- Statut : accepté
- Date : 2026-11-02

## Contexte
L'application doit pouvoir s'intégrer à une console existante sans en dépendre pour le développement.

## Décision
L'application web est conçue pour être embarquée, avec un écran de test autonome. Aucun dépôt de la console n'est modifié depuis ce dépôt.

## Conséquences
L'intégration se fait par le contrat, sans couplage de code.
