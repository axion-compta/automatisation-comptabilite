# BLOQUE-L09-T52

## Cause
La fiche exige la réauthentification (401 `REAUTHENTIFICATION_REQUISE`) pour confirmer un champ ou un changement portant sur forme, regime_tva, regime_imposition, exercice_debut, exercice_fin.

Des tests existants, HORS des fichiers autorisés de la fiche, confirment ces clés avec une session dont `revendications` vaut `{}` (ni `acr`, ni `authTime`). Ils recevraient 401 :

- `apps/serveur/src/__tests__/profil-champs.test.ts` : `confirmation-rend-confirme`, `sans-en-tete-refuse`, `idempotence-meme-reponse`, `cle-reutilisee-409`, `rien-a-confirmer-409` (confirmation de `forme`).
- `apps/serveur/src/__tests__/profil-changements.test.ts` : `confirmation-cree-une-ligne`, `apercu-perime-409` (confirmation de `regime_tva`).
- `apps/serveur/src/__tests__/profil-isolation.test.ts` : la route de confirmation y est appelée avec la même session.

## Correction minimale
Ajouter ces trois fichiers de test aux `fichiers_autorises` de L09-T52 (et relever `taille_max_lignes` si besoin), pour y donner à `SESSION` des revendications fraîches (`acr: 'mfa'`, `authTime` récent) via les réglages et l'horloge injectés par `options`.

Variante : conserver les tests tels quels et n'activer l'exigence que si `options` fournit les réglages de connexion. Cela contredit le point 3 de la fiche, qui veut une exigence toujours active.

Autre point : `OptionsRouteur` (`registres/types.ts`) n'est pas autorisé ; le plan prévoit une fusion de déclaration de `OptionsModules` depuis `app.ts`.
