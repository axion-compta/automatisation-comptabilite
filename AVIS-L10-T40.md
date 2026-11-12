VERDICT: A CORRIGER
PR #1118, SHA de tête a55fa9a1f12c41e1b65ebb7d9e55b577d67cac67

Amendement de la fiche L10-T40 : retrait de la dépendance L10-T39 (branche `pilotage/amende-L10-T40`).

## Ce qui est vérifié et juste
- Un seul fichier change : `pilotage/fiches/L10-T40.md` (+1, -1 : `depend_de`).
- La dépendance retirée est bien de précaution sur le fond. L10-T40 (import des ventes) utilise `lireCsv`, `appliquerProfil` (L10-T25) et `importer` (L10-T26, fait). Elle n'utilise aucun fichier ni symbole de L10-T39 (`ventes-actions.ts`, `ventes-actions-service.ts`, `corrigerVente`, `validerVente`).

## Défaut bloquant
1. Le job `gardes` est rouge au SHA de tête (donc `verifier` aussi), sur `garde:fiches`. Message exact, reproduit en local :
   `garde:fiches : L10-T39 et L10-T40 (même lot) partagent packages/contrat/src/registres/lot-10.ts, packages/contrat/openapi/lot-10/openapi.json, apps/serveur/src/registres/lot-10.ts sans dépendance entre elles`
   Les registres du lot 10 sont modifiés par les deux fiches, donc la garde exige une dépendance. On ne peut pas assouplir la garde (règle 8).
   Correction demandée : garder `L10-T39` dans `depend_de` (fermer la PR), ou faire inverser le sens par Will (seconde fiche modifiée).

## Remarque
- La PR #1119 (L10-T41) ajoute `L10-T39` à L10-T41 pour compenser ce retrait. Si cette PR-ci est fermée, #1119 devient inutile mais sans danger.
