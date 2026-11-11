# BLOQUE-L14-T40

Cause : les 4 routes d'écriture ajoutées au domaine `tva` (obligatoires pour la fiche) font échouer un test existant hors des fichiers_autorises.

- Test : `packages/contrat/src/__tests__/tva.test.ts`, cas « openapi-contient-les-routes-tva » (ligne 88).
- Il attend `['get', 'get', 'get']` pour les chemins contenant `tva` ; il reçoit en plus `put`, `post`, `post`, `put` (réglage, payé, sous réserve, rattachement).

Correction minimale : dans ce test, ne filtrer que les routes de lecture (par exemple n'garder que les verbes `get`, ou attendre `['get','get','get','put','post','post','put']`). Aucun autre test ne casse.

Travail prêt, tests verts (13/13), gardes vertes, `contrat:diff` identique : branche `lot-14/L14-T40` (sans PR). Il suffit d'ajouter `packages/contrat/src/__tests__/tva.test.ts` aux fichiers_autorises de la fiche L14-T40 (fiche sensible, à amender par Will).
