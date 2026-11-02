# ADR 0007 : CI publique et routines

- Statut : accepté
- Date : 2026-11-02

## Contexte
Le dépôt est public : la CI doit être sûre et bornée en coût, et des routines automatiques écrivent dans le dépôt.

## Décision
Actions épinglées par SHA, permissions en lecture, 10 minutes par tâche, aucun pull_request_target. Les routines auteurs travaillent sur une branche lot-00/<id> par fiche, un arrêt d'urgence (fichier ARRET) existe, et la fusion des PR sensibles revient à un humain.

## Conséquences
Le seul contrôle obligatoire est la tâche CI `verifier`. Les échecs répétés sont escaladés (règle des 3 échecs).
