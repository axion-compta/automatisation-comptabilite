VERDICT: A CORRIGER
PR #1116, SHA de tête fcb86d271eb9380ed96ef0fb2dfa8401686f44e4

Amendement de la fiche L09-T53 : retrait de la dépendance L09-T52 (branche `pilotage/amende-L09-T53`).

## Ce qui est vérifié et juste
- Un seul fichier change : `pilotage/fiches/L09-T53.md` (+2, -2 : `depend_de` et la ligne des Pièges).
- La dépendance retirée est bien de précaution sur le fond. L09-T53 n'utilise aucun symbole de L09-T52 : elle utilise `sessionDeRequete` et `cheminSociete`, posés par L09-T49 (fait). Elle n'utilise ni `exigerNouvelleConnexion`, ni `confirmePar`, ni `REAUTHENTIFICATION_REQUISE`, ni `CONFIRMATION_PAR_AGENT`. Ses domaines (régimes, paramètres, identité) ne recoupent pas ceux de L09-T52 (profil-champs, profil-changements), et sa section « Hors périmètre » exclut L09-T52.

## Défaut bloquant
1. Le job `gardes` est rouge au SHA de tête (donc `verifier` aussi), sur `garde:fiches`, et non sur `garde:termine` ou `garde:perimetre`. Message exact, reproduit en local avec `node outils/gardes/fiches.mjs` :
   `garde:fiches : L09-T52 et L09-T53 (même lot) partagent packages/contrat/openapi.json, apps/serveur/src/app.ts sans dépendance entre elles`
   Les deux fiches modifient les mêmes fichiers. La garde exige alors une dépendance entre elles, même sans symbole commun. On ne peut pas assouplir la garde (règle 8).
   Correction demandée, au choix de Will : fermer la PR et garder `depend_de: ["L09-T49", "L09-T52"]`, ou inverser le sens (L09-T52 dépend de L09-T53). Inverser change une seconde fiche et sort donc du cadre « un seul fichier ».
