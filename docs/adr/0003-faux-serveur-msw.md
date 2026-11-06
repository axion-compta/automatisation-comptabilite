# ADR 0003 : Faux serveur MSW

- Statut : accepté
- Date : 2026-11-02

## Contexte
Le développement et les tests ne doivent dépendre d'aucun service réel.

## Décision
Un faux serveur MSW est dérivé du contrat. Il sait simuler les pannes 409, 423 et 403, la latence et la pagination.

## Conséquences
Le mode simulé sert au développement et aux tests de bout en bout ; le mode réel reste séparé.
