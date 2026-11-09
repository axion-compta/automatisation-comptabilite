# BLOQUÉE L10-T33

- Code terminé et testé (11 tests ventes verts, lint, tsc, openapi sans écart, 211 lignes sur 320), non poussé.
- garde:perimetre ROUGE : « fichier hors liste : apps/serveur/src/__tests__/ventes-branchement.test.ts ».
- Cause : la garde lit la fiche sur origin/main, où fichiers_autorises ne contient pas ce fichier ; l'amendement de fiche n'existe que sur lot-10/L10-T33 (PR 838).
- Autre cause : lot-10/L10-T33 a un historique sans ancêtre commun avec le nouvel origin/main (réécrit) ; fusion possible seulement avec allow-unrelated-histories.
- À changer : fusionner l'amendement de fiche (ajout de ventes-branchement.test.ts aux fichiers_autorises) sur main, puis relancer ; le code est prêt sur la branche locale de la session.
