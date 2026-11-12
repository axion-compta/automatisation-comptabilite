# BLOQUE-L04-T51

Cause (12/11/2026, après l'amendement de la fiche) : les tests de la fiche sont désormais autorisés, mais le préfixe `PREFIXE_ROUTES_SOCIETE` casse encore du code et des tests HORS des fichiers_autorises (pré-vol 3b). Aucun code écrit. Pré-vol 3a : aucune PR ouverte ne touche les fichiers de la fiche.

Fichiers hors périmètre à modifier :
- packages/faux-serveur/src/domaines/pieces.ts (lignes 9 et 16), depot.ts (lignes 37, 48, 53), correction.ts (ligne 17) : handlers MSW sans préfixe. Les tests autorisés commun-pieces, commun-depot et commun-correction comparent vrai et faux serveur (`memes-reponses-vrai-et-faux`) ; avec `onUnhandledRequest: 'error'`, ils échouent dès que le vrai serveur est préfixé.
- apps/web/src/api.ts (ligne 214), apps/web/src/ecrans/e07/Ecran.tsx (ligne 25), apps/web/src/ecrans/e08/Ecran.tsx (ligne 86) : le client appelle `/pieces` sans préfixe ; il recevrait 404 sur le vrai serveur (les tests web actuels ne l'attrapent pas, ils simulent les appels).
- apps/serveur/src/registres/lot-04.ts : le dépôt et la correction y sont montés ; il faut leur passer la session et le journal.
- packages/faux-serveur/src/__tests__/suite-depot.ts et suite-correction.ts : à ajuster si les cibles changent de signature.

Correction minimale : ajouter à `fichiers_autorises` les trois handlers du faux serveur et `apps/serveur/src/registres/lot-04.ts`, et scinder le client web (api.ts, e07, e08) dans une fiche séparée. Taille : 300 lignes ne suffiront pas, prévoir 450 ou scinder en deux fiches (contrat et serveur / faux serveur et tests communs).
