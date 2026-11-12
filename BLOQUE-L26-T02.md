# BLOQUE-L26-T02

Cause : le journal doit copier l’état COMPLET du faux serveur, or cet état est dispersé dans des fermetures privées sans accesseur.
- packages/contrat/src/service.ts : ecritures, rejeux, compteur (privés ; hors fichiers_autorises).
- packages/faux-serveur/src/domaines/{profil,correction,palier,acceptations,chat,chat-propositions,depot,fin-contrat}.ts : Map/tableaux locaux (hors périmètre).
- handlers.ts seul ne peut ni lire ni rétablir ces états ; un journal limité aux écritures violerait « état complet, pas d’un seul domaine ».
Correction minimale : élargir fichiers_autorises à service.ts et aux domaines à état, pour exposer lireEtat/ecrireEtat (ou un registre d’états) ; taille_max_lignes à revoir (250 insuffisant).
