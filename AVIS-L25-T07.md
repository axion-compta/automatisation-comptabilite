VERDICT: OK

PR n°1189 (L25-T07), seconde relecture au SHA de tête 49ac4c28277f8b35cf3100d3b313bdf4c83ac8df.

## Défaut précédent
1. Levé : `qualification.ts:55` gèle maintenant `reponses`, le tableau `documents` et chacun de ses éléments. Le test vérifie que les 4 objets sont gelés. Trois mutations font chacune échouer le test : retirer le gel de `reponses`, retirer celui du tableau `documents`, retirer celui des éléments.

## Remarque précédente
- Prise en compte : les entrées invalides attendent maintenant une cause exacte, `parametre_invalide` ou `horodatage_invalide`.

## Pas de régression
- 7 tests sur 7 réussissent en local. Le diff fait 146 lignes pour un maximum de 220. Les fichiers sont dans `fichiers_autorises`. Le journal fait 4 lignes. Aucun mot interdit.
- CI : tous les jobs sont verts sauf `tests` (et donc `verifier`). Le seul test en échec est `outils/exploitation/__tests__/ouverture.test.mjs` (en-tête `porte` attendu, `porte_rgpd` reçu). Il échoue de la même façon sur `origin/main` (conflit entre L22-T30 n°1215 et L25-T01 n°1146) : ce n'est pas un défaut de l'auteur. Il faut réparer main, puis relancer la CI.
- La fiche est sensible : seul Will peut la fusionner.
