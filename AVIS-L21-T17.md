VERDICT: A CORRIGER

PR #1214 (L21-T17). Tête relue : 8bf05e27992ceff5a705c984baf4980bad1b32ae
Relecteur Opus, consigne LOT5 section R. Première relecture de cette PR de code.

## Vérifié
- Fichiers : les 6 fichiers du diff sont dans `fichiers_autorises`. Taille : 165 lignes ajoutées et 3 supprimées (maximum 280), aucune ligne « - - ».
- Les 6 tests nommés existent et passent en local (vitest, 15/15 avec `gardien-sortie.test.ts`). CI : lint verte, les autres jobs encore en file au moment de la relecture.
- La fiche est respectée : 7 contrats stricts, un rejet `hors_contrat` qui donne le chemin, la sorte `reprise` limitée au niveau `L`, et un chiffre tranché par le recalcul, jamais par un vote. `SorteAgent` n'est utilisé ailleurs que comme type (`apps/serveur/src/chat/tour.ts`) : pas de régression.
- Mutations tuées : `isSafeInteger` remplacé par `isInteger`, propagation du défaut d'une liste, refus des tableaux comme objets, retrait de `centimes()` sur le recalcul, retrait de `Object.hasOwn` sur l'agent, et `reprise: ['L', 'B']`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives. Journal de 7 lignes.

## Défauts (mutations survivantes)
1. `packages/noyau/src/reprise/contrats-agents.ts:48` : on peut remplacer `return chemin === '' ? '$' : chemin;` par `... : null` sans qu'aucun test ne rougisse. Un élément de liste qui n'est pas un objet (`{ soldes: [null] }`, `{ soldes: [3] }`, `{ soldes: [[]] }`) serait alors accepté. Correction : dans `type-faux-rejete`, ajoute ces trois cas, avec le chemin `soldes[0]` attendu.
2. `packages/noyau/src/reprise/contrats-agents.ts:73` : on peut remplacer `propositions.every(...)` par `propositions.length < 2 || propositions.every(...)` sans qu'aucun test ne rougisse. Le seul cas à une proposition est un cas d'accord. Correction : dans `chiffre-tranche-par-le-code`, ajoute une proposition unique en désaccord, par exemple `[{ agent: 'soldes', valeur: centimes(1000) }]` avec un recalcul de `centimes(0)` → `{ valeur: 0, source: 'recalcul', accord: false }`. Ce cas couvre aussi la frontière à zéro.

## Remarques
- Dans `choix`, `typeof v === 'string'` est redondant avec `includes` : la mutation est équivalente, rien à faire.
- Fiche sensible : fusion par Will seul.
