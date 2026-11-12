# BLOQUE-L10-T39

Cause : ajouter `ventesActions` au registre du lot 10 (exigé par la fiche) casse un test existant hors `fichiers_autorises`.

- Test : `packages/contrat/src/__tests__/ventes-indicateurs.test.ts`, ligne 62 :
  `expect(Object.keys(REGISTRES['10'] ?? {})).toEqual(['ventesIndicateurs', 'clients']);`
- Résultat avec le domaine ajouté : les clés deviennent `['ventesIndicateurs', 'clients', 'ventesActions']`.

Correction minimale : ajouter ce fichier de test aux `fichiers_autorises` de L10-T39 (ou faire corriger la ligne par la fiche L10-T37) et y remplacer la ligne 62 par
`expect(Object.keys(REGISTRES['10'] ?? {})).toEqual(['ventesIndicateurs', 'clients', 'ventesActions']);`

Le reste de la fiche (contrat, service en mémoire, serveur, 9 tests nommés) passe en local ; le travail n'est pas poussé.
