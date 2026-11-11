VERDICT: OK
SHA relu : e096cf0122b3ee0aed7b0df502a5fdd289d13cea

PR 990, fiche L00-T68 (sensible, garde périmètre). Deuxième relecture Opus du 11/11/2026, après la correction de l'avis précédent (SHA 14e03c5 → e096cf0).

Périmètre : 27 fichiers, tous dans `fichiers_autorises` ; 318 lignes ajoutées (plafond 320). Fiche passée à `statut: fait`. Journal : 4 lignes. CI de ce SHA entièrement verte (verifier compris). Mots interdits, prix, secrets : rien trouvé.

## Défaut bloquant de l'avis précédent : corrigé
- `openapi.ts:60` : `genererOpenapi()` lit maintenant `{ ...contratSocle, ...contratChat }`.
- `git diff origin/main -- packages/contrat/openapi.json` : vide. `node scripts/diff.mjs` : « identique », code 0. 486 tests contrat verts, tsc vert, garde périmètre verte.
- Nouveau test durable dans `registres.test.ts` : les operationId de `genererOpenapi()` valent ceux de socle + chat, et `genererOpenapiComplet()` ne lève pas.
- Essai jetable (route GET bien formée `/fictives-lot` ajoutée dans `lot-03.ts`, puis retirée) :
  - avec le correctif : 7/7 tests de `registres.test.ts` et 7/7 de `en-tetes.test.ts` verts ; `contrat:openapi` écrit `openapi/lot-03/openapi.json` sans toucher `openapi.json` ; `contrat:diff` identique ;
  - avec l'ancien code remis (`contrat` au lieu de `contratSocle`) : le nouveau test tombe. Sans route de lot, il passe : mutant équivalent tant que les 15 lots sont vides, c'est attendu, le test protège dès le premier lot non vide.
- Avant la génération du fragment, `contrat:diff` signale bien « fragment manquant : lot-03 ».

## Remarques (non bloquantes)
- `contrat.test.ts` : la correction retire deux assertions ajoutées par cette même PR (`Object.keys(contrat)` contient `ecritures` et `recherche`, et l'appel redondant `routesEcritureSansEnTete({ ...contrat, ...contratChat })`). Rien n'est retiré par rapport à `main` ; la preuve que les modules sont parcourus reste le test fictif de `registres.test.ts`.
- La fiche L00-T72 (serveur) devra vérifier que rien d'autre ne lit encore `contrat` complet là où le socle seul est attendu.
