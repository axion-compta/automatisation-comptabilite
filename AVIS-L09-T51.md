VERDICT: OK

PR #1104 (L09-T51), SHA de tête ab6212f02256629c8c230457b23b526b5a10c5ee (branche lot-09/L09-T51). Relecture du 12/11/2026, après l'avis A CORRIGER au SHA 11f1fa610a775e08f2c19c8a5cda19b4bf7de42d.

Vérification des défauts de l'avis précédent (par mutation, sur ce SHA)
1. Identifiant commun à deux champs d'une même écriture : corrigé. `objet_id` de `compta.profil.champ_modifie` vaut la clé du champ (apps/serveur/src/evenements/profil.ts:32). Mutation (retour à `c.societeId`) : `deux-champs-meme-ecriture-deux-publications` rouge.
2. Clé d'idempotence non testée dans l'identifiant : corrigé. Mutation (retrait de `cleIdempotence` de l'id, profil.ts:27) : `meme-champ-deux-cles-deux-publications` rouge ; le rejeu à clé identique reste à 1 publication.

Autres contrôles
- Périmètre : 4 fichiers, tous dans fichiers_autorises ; 159 lignes ajoutées (taille_max 250). CI 9/9 verte sur ce SHA (gardes comprises).
- 8 tests verts en local (les 6 nommés + 2 ajoutés). Mutations supplémentaires rouges : `etat_change` produit sans changement ; un type d'événement non déposé.
- Aucun mot interdit, aucun prix, données fictives.

Remarques
- pilotage/journal/L09-T51.md:6 annonce « 6 tests nommés verts » : il y en a désormais 8. Sans effet sur le verdict.
- Fiche sensible : fusion par Will seul.
