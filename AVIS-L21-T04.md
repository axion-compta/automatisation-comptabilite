VERDICT: A CORRIGER

PR n° 1206, tête relue : e02b32ea66dbaa9a75b3800a92d34704c12aeff7
Relecteur Opus, 12/11/2026. Fiche sensible : fusion par Will seul.

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 226 lignes ajoutées, 1 retirée, sous le plafond de 230.
- Tests ciblés : 9 sur 9 verts. Mots interdits, secrets, prix : aucun. Données fictives.
- Mutations tuées : canal en liste blanche, `societeId` et `rattacheA` comparés, `size >= 2`.

## Défauts (mutations survivantes)
1. `packages/noyau/src/cloture/autorisation-cloture.ts:82` : le filtre `texte(x.id) && texte(x.horodatage)` peut être remplacé par `true` sans qu'aucun test ne rougisse. Deux « confirmations » `{ id: '' }` et `{ id: 'x' }`, ou une confirmation sans horodatage, passent alors. Correction : dans `sans-expert-confirmation-renforcee`, ajoute un refus `confirmation_renforcee_requise` pour un id vide et pour un horodatage vide.
2. `autorisation-cloture.ts:104` (`.sort().at(-1)`) et `:100` (horodatage de l'approbation) : mettre `.at(0)` ou `maintenant` à la place laisse les tests verts, car tous les horodatages valent `HORO`. L'horodatage de la trace demandé par la fiche n'est donc pas vérifié. Correction : dans `trace-auteur-et-accord`, utilise des horodatages distincts (confirmations, approbation, `maintenant`) et vérifie la valeur exacte de `trace.horodatage`.

## Remarques (non bloquantes)
- `c.length < 2` (l. 81) et `typeof a.empreinte === 'string'` (l. 71) sont redondants : leurs mutants sont équivalents.
- Avec `confirmeeAEcran: true`, les canaux `api`, `import` et `systeme` sont admis. La fiche ne vise que `chat` et `voix` : à confirmer.
