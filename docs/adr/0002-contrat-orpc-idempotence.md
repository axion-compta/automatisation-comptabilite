# ADR 0002 : Contrat oRPC et idempotence

- Statut : accepté
- Date : 2026-11-02

## Contexte
Les écritures peuvent être rejouées (réseau, relance d'agent). Deux envois identiques ne doivent produire qu'un seul effet.

## Décision
Contrat oRPC partagé. Les routes d'écriture exigent un en-tête Idempotency-Key. Une version périmée donne une erreur 409.

## Conséquences
Le client et le serveur dérivent du même contrat. Une garde refuse une route d'écriture sans en-tête.
