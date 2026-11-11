# BLOQUE-L06-T38

Fiche L06-T38 non exécutée : le pré-vol (2) montre que le travail casserait des tests hors de `fichiers_autorises`. Aucun code écrit.

Pré-vol (1) : aucune PR ouverte (autre que #1032) ne modifie un fichier de `fichiers_autorises`.

## Tests et fichiers hors périmètre touchés
Préfixer toutes les routes par `PREFIXE_ROUTES_SOCIETE` change les chemins de 78 routes déclarées dans `packages/contrat/src/domaines/*.ts` et `registres/` (hors périmètre : la fiche n'autorise que `routes.ts`) et fait échouer au moins 17 fichiers de test qui appellent les chemins sans préfixe :
- `apps/serveur/src/__tests__/` : serveur, tiers, banque, banque-sans-fuite, correlation, en-tetes, jeton, arret, debit, garde-acces, securite-squelette, abonnement-branchement, fin-contrat-branchement ;
- `apps/serveur/src/exploitation/__tests__/` : parcours-sans-fuite, journal-requetes ;
- `apps/serveur/src/principes/__tests__/banc-parite.test.ts` ;
- `packages/faux-serveur/src/__tests__/garde-acces.test.ts`.
S'y ajoutent les tests contrat qui attendent des chemins non préfixés dans l'OpenAPI, et la garde d'accès (`garde-acces.ts`).

## Correction minimale proposée
Amender la fiche (PR sensible, fusion par Will) : soit élargir `fichiers_autorises` à ces domaines et tests et relever `taille_max_lignes` (300 lignes ne suffisent pas), soit découper : (a) une fiche qui ajoute le préfixe via un point unique de `routes.ts` avec compatibilité transitoire des tests, (b) une fiche par lot pour migrer ses tests.
