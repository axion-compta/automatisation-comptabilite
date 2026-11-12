VERDICT: OK

PR #1107 (amendement de la fiche L10-T39), SHA de tête relu : 3042c1cb26a94b770b7c3978d2d9dce88cebf8b8

Vérifications :
- Diff : une seule ligne changée, `fichiers_autorises` de `pilotage/fiches/L10-T39.md` ; rien d'autre ne bouge (statut, exigences, dépendances, taille 320, critères identiques).
- Fichier ajouté : `packages/contrat/src/__tests__/ventes-indicateurs.test.ts`, présent sur main.
- Il est bien cassé par le travail : ligne 62, `expect(Object.keys(REGISTRES['10'] ?? {})).toEqual(['ventesIndicateurs', 'clients'])` ; la fiche exige d'ajouter `ventesActions` à `packages/contrat/src/registres/lot-10.ts` (aujourd'hui `{ ventesIndicateurs, clients }`), d'où une 3e clé. Constat identique à `BLOQUE-L10-T39.md`.
- Aucun autre test sur main n'énumère les clés du registre du lot 10 : la liste est complète.
- CI verte sur ce SHA (gardes, tests, types, lint, verifier, e2e).

Remarques :
- PR sensible (touche `pilotage/`) : fusion par Will seul.
- L'auteur ne doit modifier que la ligne 62 de ce test (ajout de `'ventesActions'`), sans retirer aucune autre assertion.
