VERDICT: OK

PR #1169, fiche L22-T31, tête af0556f080a4a1c296823173764259084b2a04ee.

Vérifié :
- Fichiers : les 4 du diff sont dans fichiers_autorises ; 152 lignes (max 250) ; garde:perimetre, garde:textes, garde:fictif vertes en local ; tsc et eslint verts.
- Les 6 tests nommés passent. Aucune règle recopiée : consolider et verifierCitations sont importés.
- Mutations (toutes détectées) : gravité bloquante critique -> majeur ; refusParChef === true -> !== undefined ; verdict sans contrôle de malFormees ; jeu ramené à 39 constats ; coût non entier ; refus attendus vidés ; escalade attendue ajoutée sur un constat majeur ; helper auMoins (total > 0, frontière 19/20 contre 18/20, total nul).
- Aucun secret, aucun prix, aucun mot interdit, données fictives (sources SRC-FICT-*).

Remarques (non bloquantes) :
- packages/noyau/src/agents/__tests__/hierarchie-jeu.test.ts:56 : le jeu ne contient aucune citation à version erronée ; supprimer le contrôle de version dans sources.ts ne fait pas rougir ce fichier (le mutant est tué par sources.test.ts, version-inconnue-rejetee). Un cas DEC-001:SRC-FICT-1@9 rendrait le jeu autonome.
- packages/donnees-fictives/src/hierarchie.ts:56 : escaladeAttendue est dérivée de la même règle que le code (gravité critique) ; le taux 12/12 mesure donc la cohérence, pas un écart possible. Acceptable pour un jeu fictif.
- coutParEvenement([]) rendrait NaN (division par zéro) ; helper local de test, jeu jamais vide.
- Fiche sensible : fusion par Will seul.
