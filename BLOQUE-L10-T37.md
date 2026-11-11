# L10-T37 bloquée : un test existant hors périmètre casse

Pré-vol (2) de la consigne : le travail de la fiche casse un test qui n'est pas dans `fichiers_autorises`.

- Test : `packages/contrat/src/__tests__/ventes-indicateurs.test.ts`, ligne 62 (test `chaque-nombre-a-ses-pieces` voisin, dans le bloc OpenAPI) :
  `expect(Object.keys(REGISTRES['10'] ?? {})).toEqual(['ventesIndicateurs']);`
- Cause : la fiche exige d'ajouter `clients: { lireClient }` au registre du lot 10 ; les clés deviennent `['ventesIndicateurs', 'clients']`.
- Correction minimale : dans ce test, remplacer `['ventesIndicateurs']` par `['ventesIndicateurs', 'clients']`, ou ajouter ce fichier aux `fichiers_autorises` de L10-T37 (ou la modification à une fiche dédiée).
- État : code et 6 tests de la fiche prêts en local (6/6 verts), rien poussé hors cette note. Dépend de la PR #1021 (L10-T35) non fusionnée.
