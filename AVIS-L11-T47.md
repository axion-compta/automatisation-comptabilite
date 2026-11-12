VERDICT: A CORRIGER
PR #1120, SHA de tête 6aeb9e0626708f5ff509a6b0b54f40709a59f263

Amendement de la fiche L11-T47 : retrait de la dépendance L11-T40 (branche `pilotage/amende-L11-T47`).

## Ce qui est vérifié et juste
- Un seul fichier change : `pilotage/fiches/L11-T47.md` (+2, -2 : `depend_de` et la ligne des Pièges).
- La dépendance retirée est bien de précaution sur le fond. L11-T47 (droits et identité de session) n'utilise aucun symbole de L11-T40 : ni `frais-evenements.ts`, ni la boîte d'envoi de L00-T49, ni les événements `compta.frais.*`. Elle s'appuie sur la session de L09-T49 / L11-T38 (fait) et sur `PortSession` de L00-T50.

## Défaut bloquant
1. Le job `gardes` est rouge au SHA de tête (donc `verifier` aussi), sur `garde:fiches`. Message exact, reproduit en local :
   `garde:fiches : L11-T40 et L11-T47 (même lot) partagent apps/serveur/src/domaines/frais-validation.ts, apps/serveur/src/domaines/frais-actions.ts sans dépendance entre elles`
   Les deux fiches modifient ces fichiers serveur, donc la garde exige une dépendance. On ne peut pas assouplir la garde (règle 8).
   Correction demandée : garder `L11-T40` dans `depend_de` (fermer la PR), ou faire inverser le sens par Will (seconde fiche modifiée).
