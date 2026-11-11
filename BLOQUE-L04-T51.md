# BLOQUE-L04-T51

Cause : le préfixe `PREFIXE_ROUTES_SOCIETE` sur les routes pieces, depot et correction casse des tests existants HORS des fichiers_autorises de la fiche (pré-vol 3b). Aucun code écrit.

Tests cassés (chemins sans préfixe) :
- apps/serveur/src/__tests__/pieces.test.ts (lignes 15, 20, 24, 27, 30)
- apps/serveur/src/__tests__/pieces-branchement.test.ts (lignes 13 à 16)
- apps/serveur/src/__tests__/depot.test.ts (lignes 21 à 35)
- apps/serveur/src/__tests__/correction.test.ts (lignes 17 à 29)
- packages/contrat/src/__tests__/depot.test.ts (ligne 95, chemin `/pieces` dans l'OpenAPI)
- packages/contrat/src/__tests__/pieces-routes.test.ts, pieces.test.ts, correction.test.ts (chemins des routes)
- packages/faux-serveur/src/__tests__/suite-pieces.ts (suite partagée sur les routes pieces)
Les sessions et permissions compta-* rendraient aussi ces tests rouges (appels sans session).

Correction minimale : ajouter ces fichiers de tests à `fichiers_autorises` de L04-T51 (ou scinder la fiche), et prévoir la taille : 300 lignes ne suffiront sans doute pas. Amont : #1059 (L04-T34, ouverte) touche correction.ts.
