VERDICT: A CORRIGER

PR #1104, SHA de tête 11f1fa610a775e08f2c19c8a5cda19b4bf7de42d (branche lot-09/L09-T51). Relecture du 12/11/2026.

Ce qui est bon
- Périmètre : 4 fichiers, tous dans fichiers_autorises ; 141 lignes (taille_max 250). CI 9/9 verte. Dépendances L09-T48, L09-T49, L00-T49 « fait » sur main.
- Les 6 tests nommés passent. Dépôt dans `UniteDeTravail.executer` ; charge limitée à la clé et au statut (contrôlée en plus par `creerEnveloppe`).
- Mutations rouges : `etat_change` produit même sans changement ; un type d'événement non déposé.
- Journal : 6 lignes, commence par « # Journal L09-T51 ». Aucun mot interdit, aucun prix, données fictives.

Défauts
1. apps/serveur/src/evenements/profil.ts:27 et :32 : l'identifiant vaut `societe:cle_idempotence:type:objet_id`, et `objet_id` vaut l'identifiant de la société pour `compta.profil.champ_modifie`. Deux champs modifiés dans la même écriture (même clé d'idempotence) donnent donc le même identifiant : la boîte d'envoi écarte le second et UN SEUL événement est publié. Reproduit sur ce SHA : `evenementChampModifie(ctx('k'), {cle:'forme_juridique'})` + `evenementChampModifie(ctx('k'), {cle:'activite'})` dans un même `ecrireEtPublier` -> 1 message reçu au lieu de 2.
   Correction demandée : mettre la clé du champ dans l'identifiant (par exemple `objet_id` = clé du champ, comme pour `parametre.active`, ou ajouter `p.cle` à l'id), avec un test qui publie deux champs dans la même écriture et attend 2 messages.
2. apps/serveur/src/__tests__/evenements-profil.test.ts:61 (`rejeu-idempotent-une-seule-publication`) : la mutation qui retire `cleIdempotence` de l'identifiant (profil.ts:27) laisse les 6 tests verts. Dans ce cas, deux modifications successives et légitimes du même champ (deux clés d'idempotence différentes) ne publient qu'une fois, et aucun test ne le voit.
   Correction demandée : ajouter dans ce test (ou dans `champ-modifie-publie`) deux écritures du même champ avec deux clés différentes -> 2 publications, à côté du rejeu à clé identique -> 1 publication.

Remarques
- Les tests de rejeu reposent sur le dédoublonnage de la boîte en mémoire (L00-T49). C'est le comportement attendu de la boîte ; il faudra le même dédoublonnage dans la boîte réelle.
- Fiche sensible : fusion par Will seul.
