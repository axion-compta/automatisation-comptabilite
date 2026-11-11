# Plan de reprise après sinistre (rôles)

Page publique : rôles seulement. Aucune adresse, aucun nom d'hôte, aucun compte, aucune clé, aucun emplacement de coffre. Le plan détaillé et les comptes rendus réels sont dans le dépôt privé. Aucun agent ne touche un serveur : les gestes réels sont de Will.

## Les six scénarios

| Scénario | Décide | Agit | Où l'on reprend |
|---|---|---|---|
| `base_abimee` | Will | Will | hébergeur principal, depuis la dernière sauvegarde |
| `pieces_perdues` | Will | Will | hébergeur principal, depuis la copie hors site |
| `serveur_perdu` | Will | Will | hébergeur principal (nouveau serveur) |
| `hebergeur_indisponible` | Will | Will | second emplacement de la copie hors site |
| `coffre_perdu` | Will | Will | hébergeur principal, secrets rétablis par les parts hors ligne |
| `rancongiciel` | Will | Will | second emplacement, sur une installation neuve |

## Délai de reprise (RTO)
Chaque scénario renvoie au réglage `restauration.rto_client_secondes` (service client) ou `restauration.rto_plateforme_secondes` (plateforme). Aucune valeur n'est écrite ici.

## Exercice
- Rythme : annuel ; le premier avant le jalon J10.
- Évaluation : `evaluerExercice` et `evaluerRetourArriere` (`packages/noyau/src/exploitation/exercice-reprise.ts`) : les six scénarios joués, durée au plus égale au RTO, contrôles de restauration réussis, au moins deux témoins distincts.
- Compte rendu : archivé dans le dépôt privé.
- Données fictives seulement ; rien en production sans le feu vert J10.
