# BLOQUE L08-T37 (PR 986)

Correcteur : arrêt après diagnostic du défaut 1. Les défauts 2, 3 et 4 restent à traiter une fois le blocage levé.

## Cause 1a : test L08-T34 rouge (`tests`)
- Test : `packages/faux-serveur/src/__tests__/exploitation-branchement.test.ts`, cas `cinq-routes-interceptees` et `base-appliquee`.
- Message : `POST /personnes/demandes/d1/traitement: expected 404 not to be 404`.
- Cause exacte : le test appelle `POST .../d1/traitement` et exige un statut différent de 404 (il suppose le bouchon de L08-T34). `handlers.ts:104` donne par défaut `REGLAGES_FICTIFS_PERSONNES`, donc le service réel de la PR est créé et répond 404 `DEMANDE_INTROUVABLE` pour l'identifiant inconnu `d1`. Ce 404 est le comportement voulu par le service et par le contrat.
- Aucune correction dans les `fichiers_autorises` de L08-T37 : rendre autre chose que 404 fausserait le faux serveur ; `handlers.ts` et le test sont hors périmètre.
- Correction minimale proposée (fiche corrective type L00-T76) : dans ce test, accepter 404 pour `POST /personnes/demandes/d1/traitement`, en gardant le critère « route interceptée » par l'absence d'entrée dans `inconnues` (la route est atteinte, c'est le service qui répond). Fichier : `exploitation-branchement.test.ts` seul.

## Cause 1b : e2e rouge (11 échecs)
- `packages/faux-serveur/src/domaines/personnes.ts:2` importe `packages/contrat/src/domaines/personnes-service.ts`, qui importe `createHash` de `node:crypto` (ligne 1). Le faux serveur tourne dans le navigateur (`apps/web/src/main.tsx:14`) : l'application en mode simulé ne démarre plus.
- Correction minimale proposée (fiche corrective) : rendre `personnes-service.ts` sans `node:crypto` (empreinte pure, ou fonction d'empreinte injectée en option par le serveur Node). Fichier hors périmètre de L08-T37.

## Suite
Après ces deux fiches correctives fusionnées par Will : reprendre L08-T37 pour les défauts 2 (`SOURCE_MANQUANTE` exact), 3 (503 du faux serveur appelé directement) et 4 (en-tête `idempotency-key` et corps refusés comme le vrai serveur ; taille à 260, prévoir de compacter).
