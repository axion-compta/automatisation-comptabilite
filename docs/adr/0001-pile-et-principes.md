# ADR 0001 : Pile et principes

- Statut : accepté
- Date : 2026-11-02

## Contexte
Le projet automatise la comptabilité avec des agents IA. Il faut une pile unique, simple à vérifier, et des principes stables.

## Décision
Monorepo pnpm, TypeScript strict, Node 24. Tout le code est vérifié par la commande unique `pnpm verifier`. Données fictives seulement dans le dépôt public.

## Conséquences
Un seul point d'entrée de contrôle. Toute exception à la pile passe par l'ADR 0006.
