VERDICT: OK

PR n°1192 (L21-T03), seconde relecture au SHA de tête bbc77c784af7e2890397f8bdd5fd4ced73ad8fad.

## Défauts précédents (tous levés, vérifiés par mutation)
1. Les valeurs non booléennes de `actif` (`'false'`, `0`, `null`) sont testées. Retirer `dernier-admin.ts:29` fait échouer le test.
2. Les cas `motif: undefined`, `reference: null` et `motif: 3` sont testés. Retirer `typeof v !== 'string' ||` (ligne 57) fait échouer le test.
3. Le rôle `'roi'` du demandeur est testé. Retirer `|| !estRole(demande.role)` (ligne 61) fait échouer le test.

## Remarque précédente
- Prise en compte : les entrées `null` sont testées. Les mutations des gardes `Array.isArray(etat)`, `Array.isArray(changements)` et `demande === null` font échouer le test.

## Pas de régression
- Le dernier commit (« wip: taille ») ne retire que des commentaires et des lignes vides du test, aucune assertion.
- 7 tests sur 7 réussissent en local. Le diff fait 180 lignes, soit pile le maximum ; le job `gardes` est vert. Les fichiers sont dans `fichiers_autorises`. Le journal fait 4 lignes. Les données sont fictives (@exemple.fr).
- CI : tous les jobs sont verts sauf `tests` (et donc `verifier`). Le seul test en échec est `outils/exploitation/__tests__/ouverture.test.mjs` (en-tête `porte` attendu, `porte_rgpd` reçu). Il échoue de la même façon sur `origin/main` (conflit entre L22-T30 n°1215 et L25-T01 n°1146) : ce n'est pas un défaut de l'auteur. Il faut réparer main, puis relancer la CI.
- La fiche est sensible : seul Will peut la fusionner.
