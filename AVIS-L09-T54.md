VERDICT: A CORRIGER
PR #1117, SHA de tête 71a8d9d58e64dd0395a5e97f7b66dd83b5cd8bb0

Amendement de la fiche L09-T54 : retrait de la dépendance L09-T52 (branche `pilotage/amende-L09-T54`).

## Ce qui est vérifié et juste
- Un seul fichier change : `pilotage/fiches/L09-T54.md` (+1, -1 : `depend_de`).
- La dépendance retirée est bien de précaution sur le fond. L09-T54 ajoute `societe_cotee`, `paie` et `plusieurs_pays` à `CLES_PROFIL`, avec leurs blocages. Elle n'utilise aucun symbole de L09-T52 (`exigerNouvelleConnexion`, paramètre `confirmePar`, `REAUTHENTIFICATION_REQUISE`). Les clés soumises à réauthentification dans L09-T52 (forme, regime_tva, regime_imposition, exercice_debut, exercice_fin) ne comprennent pas les trois nouvelles clés.

## Défaut bloquant
1. Le job `gardes` est rouge au SHA de tête (donc `verifier` aussi), sur `garde:fiches`. Message exact, reproduit en local :
   `garde:fiches : L09-T52 et L09-T54 (même lot) partagent packages/contrat/src/domaines/profil-champs.ts, packages/contrat/src/domaines/profil-champs-service.ts sans dépendance entre elles`
   Les deux fiches modifient les mêmes fichiers (L09-T52 ajoute `confirmePar` à `profil-champs-service.ts`), donc la garde exige une dépendance. On ne peut pas assouplir la garde (règle 8).
   Correction demandée : garder `L09-T52` dans `depend_de` (fermer la PR), ou faire inverser le sens par Will (seconde fiche modifiée).

## Remarque
- Si la dépendance est retirée un jour, la section Pièges devra aussi dire « remettre la branche à jour avant fusion » pour L09-T52, comme elle le fait déjà pour L09-T49.
