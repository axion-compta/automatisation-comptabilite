# BLOQUE-L09-T49

Fiche L09-T49 non exécutée : le pré-vol (2) a trouvé des tests hors de `fichiers_autorises` que le travail casserait. Aucun code écrit.

Pré-vol (1) : aucune PR ouverte ne modifie un fichier de `fichiers_autorises` (la PR 1021 ne touche que `packages/contrat/openapi/lot-10/openapi.json`).

## Tests hors périmètre cassés
Préfixer les routes du profil par `PREFIXE_ROUTES_SOCIETE` et exiger une session font échouer :
- `packages/contrat/src/__tests__/profil-champs.test.ts` (l. 55-56) : attend `/profil/champs/{cle}` et `/profil/champs/{cle}/confirmer` dans l'OpenAPI.
- `packages/contrat/src/__tests__/profil-changements.test.ts` (l. 69-70) : attend `/profil/changements/apercu` et `/profil/changements`.
- `apps/serveur/src/__tests__/profil.test.ts` : appelle `GET /profil` sans session ni préfixe.
- `apps/serveur/src/__tests__/profil-champs.test.ts` : appelle `/profil/champs/...` sans session ni préfixe.
- `apps/serveur/src/__tests__/profil-changements.test.ts` : appelle `/profil` et `/profil/changements...` sans session ni préfixe.
- `apps/serveur/src/__tests__/regimes.test.ts` : `/profil/regimes/*` (à vérifier selon que ces routes sont aussi préfixées).
- `apps/serveur/src/app.ts` (assemblage, hors `fichiers_autorises`) : doit recevoir `PortSession`, réglages et horloge.

## Correction minimale proposée
Amender la fiche (fiche seule, PR sensible, fusion par Will) : ajouter à `fichiers_autorises` les trois tests serveur et les deux tests contrat ci-dessus, ainsi que `apps/serveur/src/app.ts`, et relever `taille_max_lignes` (la mise à jour des appels de test et l'injection de session dépassent 300 lignes). Variante : découper en deux fiches (contrat + routes préfixées ; réauthentification + `confirmePar`).
