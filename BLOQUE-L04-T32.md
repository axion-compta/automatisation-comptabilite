# BLOQUE-L04-T32

Fiche L04-T32 bloquée : recoupement avec un test existant hors périmètre.

- La fiche demande la route `POST /pieces` (`deposerPieces`) branchée dans le serveur.
- `apps/serveur/src/__tests__/pieces-branchement.test.ts` (ligne 16) exige que `POST /pieces` réponde 404.
- Ce fichier n'est pas dans `fichiers_autorises`, et la règle interdit d'assouplir ou de retirer un test.
- Une fois la route branchée, ce test échoue, donc la CI (`pnpm verifier`) échoue.

Décision attendue de Will : amender la fiche pour autoriser la mise à jour de `pieces-branchement.test.ts` (la ligne 16 devrait viser une autre route inexistante), ou fournir une autre consigne.

Rien d'autre n'a été écrit. Aucune vérification d'oRPC multipart n'a été faite à ce stade.
