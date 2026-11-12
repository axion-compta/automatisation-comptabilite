VERDICT: A CORRIGER

PR #1212 (L21-T15). Tête relue : 2500b5bd15e91381760dfbca23a4fe15e04252a2
Relecteur Opus, consigne LOT5 section R. Première relecture de cette PR de code.

## Vérifié
- Fichiers : les 4 fichiers du diff sont dans `fichiers_autorises`. Taille : 121 lignes ajoutées et 1 supprimée (maximum 250), aucune ligne « - - ».
- Les 5 tests nommés existent et passent en local (vitest, 5/5). CI : gardes, tests, types, gitleaks et licences vertes ; lint, e2e et stryker encore en file au moment de la relecture.
- La fiche est respectée : divergence, champ absent ou illisible donnent `a_arbitrer`, sans valeur choisie ni moyenne. Le pied est contrôlé au centime. Seules les pages en échec sont relues.
- Mutations tuées : suppression de `valeurA !== undefined`, et `ecart === 0` remplacé par `ecart <= 0`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives. Journal de 7 lignes.

## Défauts (mutations survivantes)
1. `packages/noyau/src/reprise/double-lecture.ts:39` : le tri `.sort((a, b) => a - b)` peut être remplacé par `.sort()` (tri lexical) sans qu'aucun test ne rougisse. Les pages 10 et 2 sortiraient alors dans l'ordre [10, 2]. Correction : dans `page-en-echec-relue-seule`, ajoute un cas avec au moins une page à deux chiffres, par exemple `[{ page: 10, statut: 'echec' }, { page: 2, statut: 'echec' }]` → `[2, 10]`.
2. `packages/noyau/src/reprise/double-lecture.ts:33` : on peut retirer `centimes(...)` autour de `etat.total` sans qu'aucun test ne rougisse. Un total NaN ou non entier n'est pas testé, seuls les postes le sont. Correction : dans `pied-d-etat-faux-signale`, ajoute `total: NaN` et `total: 1.5`, avec une exception attendue.

## Remarques
- `Object.hasOwn` dans `lire` (ligne 14) n'est couvert par aucun test, par exemple pour un champ `constructor` présent dans une seule lecture. Ce test serait utile, sans être bloquant.
- Remplacer `r.statut === 'echec'` par `r.statut !== 'ok'` est une mutation équivalente avec ce type : rien à faire.
- Fiche sensible : fusion par Will seul.
