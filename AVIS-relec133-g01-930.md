VERDICT: OK
SHA relu : 5c412d49bec5bf4d748e2203ebd8797e04683f44
PR 930, fiche L08-T36 (sensible), branche lot-08/L08-T36. Relecture après correction de l'avis relec128-g01-930.

## Défaut de l'ancien avis
- Corrigé. `packages/contrat/src/domaines/personnes-service.ts:101` : le raccourci `regles.length === 0` a disparu. Si la catégorie est connue, `conserverJusquAu` est appelé même sans règle, donc le noyau répond « à confirmer » et `deciderEffacement` refuse par prudence.
- Nouveau test `aucune-regle-reglee-refus-prudent` : avec `regles: []`, l'issue `a_effacer` donne `ISSUE_NON_PERMISE:422` et la conversation reste trouvable par la recherche.
- Mutation : quand on remet `categorie === null || regles.length === 0 ? null`, ce test rougit (1 échec sur 10). Mutation annulée ensuite.
- Le cas `categorie === null` (source `tiers`) ne pose pas de risque : la recherche reçoit `tiers: []` (ligne 88), donc aucun objet tiers n'arrive jusqu'à la décision.

## Contrôles
- Fichiers modifiés : les 4 de `fichiers_autorises`, rien d'autre.
- Taille : 299 lignes ajoutées et 1 retirée (plafond de la fiche : 300, plafond du dépôt : 400). Aucune ligne « - - ».
- Le commit de correction ne retire aucun test ni aucune assertion. Il compacte aussi quelques lignes, sans changer le comportement.
- Tests : 10 sur 10 passent (vitest). `tsc --noEmit` passe sur packages/contrat et `node scripts/verifier.mjs --gardes` est vert (21 étapes).
- Règle 13 : le service est pur et en mémoire, sur le jeu fictif. Il ne contient ni adresse, ni accès réseau, ni base, ni secret.
- Journal : 9 lignes, commence par « # Journal L08-T36 ».
- Aucun mot interdit, aucun prix. Les données sont fictives (Zoe Inventee, Camille Exemple).

## Remarques (non bloquantes)
- Reste de l'ancien avis : quand on inverse le tri de `decisionGlobale` (« date la plus tardive »), aucun test ne rougit. Un test avec deux objets aux dates de conservation différentes fermerait ce trou.
- Le journal ne dit rien du refus prudent quand aucune règle n'est réglée. Une ligne suffirait (il reste de la place sous le plafond de 10).
