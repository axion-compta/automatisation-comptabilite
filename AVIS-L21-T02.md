VERDICT: A CORRIGER

PR #1178, fiche L21-T02, tête relue : 56edbdc9d2e236215b5f0da822996a0af5371877

## Défauts
1. Mutant survivant sur le compte journalisé. `packages/noyau/src/securite/compte-service.ts:29` : remplacer `compte: session.personneId` par `compte: 'svc-ia-1'` laisse les 7 tests verts, car tous les tests utilisent le même identifiant `svc-ia-1`. La ligne `securite.compte_service_refuse` pourrait citer un autre compte sans qu'aucun test ne rougisse.
   Correction demandée : dans `packages/noyau/src/securite/__tests__/compte-service.test.ts`, vérifier au moins un refus avec un second compte de service (ex. `personneId: 'svc-ia-2'`) et contrôler `ligne.compte` égal à cet identifiant.
2. Mutant survivant sur l'horodatage journalisé. Même ligne : remplacer `horodatage` par la constante `'2026-11-12T10:00:00.000Z'` laisse les 7 tests verts, car un seul horodatage `T` est utilisé.
   Correction demandée : vérifier au moins un refus avec un second horodatage et contrôler `ligne.horodatage`.

## Vérifications faites
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille 159 lignes (max 200).
- 7 tests nommés présents ; 7/7 passent en local.
- Mutations qui rougissent : `nature !== 'service'` -> `nature === 'personne'` ; garde de nature neutralisée ; masquage non récursif ; tableaux non parcourus.
- Mutant équivalent (non bloquant) : retrait de `typeof operation === 'string' &&` (`includes` rend déjà false).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives (@exemple.fr, `FR00 FICTIF`).

## Remarques (non bloquantes)
- `compte-service.ts:36-43` : un objet non simple (ex. `Date`) devient `{}` dans la copie ; la correspondance des clés est sensible à la casse (`IBAN` n'est pas masqué si `iban` est listé). À documenter ou traiter au branchement.
- CI : job `verifier` encore en attente ; les autres jobs sont verts.
- Fiche sensible : fusion par Will seul.
