# ADR 0008 : la facturation de l'abonnement reste hors du module

- Statut : proposé
- Date : 2026-11-12

## Contexte
Le module comptable est vendu avec un abonnement géré par la console et son portail. Le module n'émet aucune facture de vente (L10-T42 vérifie l'absence de route d'émission), mais cette limite n'était écrite dans aucune décision, et rien n'empêchait d'ajouter plus tard une route qui facture l'abonnement lui-même.

## Décision
- Le module n'émet ni ne refait la facturation de son propre abonnement : ni création, ni numérotation, ni envoi, ni calcul de montant d'abonnement.
- Il affiche l'état d'accès et renvoie vers le portail (lien « Abonnement et factures », L07-T27) ; le lien est lu dans une variable de construction et absent tant qu'elle n'est pas fournie.
- Le test `routes-emission-interdites` refuse toute route du contrat ou de l'OpenAPI dont le nom ou le chemin associe « abonnement » et « factur » (ou « facture d'abonnement »). Les routes d'abonnement sans facture (accès, volume, demande de palier) restent permises.
- Aucun montant commercial n'apparaît dans le dépôt.

## Conséquences
Lever cette limite exige une nouvelle décision écrite, puis la modification du test, relue par Will. Toute route d'émission ajoutée par erreur fait échouer la tâche CI `verifier`.
