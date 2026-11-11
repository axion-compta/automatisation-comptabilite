# Blocage de la fiche L07-T20

- PR : 1008, branche `lot-07/L07-T20`.
- CI rouge : job `gardes`, étape `garde portes.mjs`.
- Message : « lot back-end de l'écran e50 sans porte « maquette validée » sur origin/main (pilotage/portes/e50.json) ».
- Cause : la fiche touche `apps/serveur/`, `packages/contrat/` ou `packages/faux-serveur/` pour l'écran e50. La garde exige un fichier `pilotage/portes/e50.json` (date, ecran, valideur) présent sur `origin/main`, avec pour valideur Will.
- Pourquoi je m'arrête : cette porte est une validation humaine. Elle est lue sur `origin/main`, jamais sur la branche, et le fichier n'est pas dans les `fichiers_autorises` de la fiche. Le créer moi-même reviendrait à contourner la garde.
- Les autres gardes (périmètre : 8 fichiers, 299 lignes) et les tâches types, lint, tests, e2e, gitleaks, licences, stryker sont vertes.
- Action attendue de Will : valider la maquette e50 et ajouter `pilotage/portes/e50.json` sur `main`, puis relancer la CI de la PR 1008. Aucune modification de code n'est nécessaire.
