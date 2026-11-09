VERDICT: A CORRIGER
SHA relu : a18853df7b79c74b09529542a3616d82341ad33a
PR 930, fiche L08-T36 (sensible), branche lot-08/L08-T36.

## Contrôles
- Fichiers modifiés : les 4 de `fichiers_autorises`, rien d'autre.
- Taille : 298 lignes ajoutées et 1 retirée (plafond de la fiche : 300, plafond du dépôt : 400). Aucune ligne « - - ».
- Journal : 9 lignes, commence par « # Journal L08-T36 ».
- Tests : les 9 tests nommés sont présents et passent (vitest). Les gardes (`node scripts/verifier.mjs --gardes`) sont vertes et `tsc --noEmit` passe sur packages/contrat.
- Aucun secret, aucune adresse de serveur, aucun prix, aucun mot interdit. Les données sont fictives.
- Le service n'écrit aucun `console.log` et ne journalise pas la requête de recherche : ni nom, ni e-mail, ni IBAN de `/personnes/recherche` ne vont au journal. Le motif d'un refus ne figure ni dans le journal ni dans le message d'erreur (testé).
- Mutations : 4 sur 5 rougissent (contrôle de l'issue contredite, usage `affichage` du filtre, rejeu par clé, refus de conservation).

## Défaut bloquant
1. `packages/contrat/src/domaines/personnes-service.ts:104` : `categorie === null || regles.length === 0 ? null`. Quand aucune règle de conservation n'est réglée pour une catégorie, le service passe `conservation: null` à `deciderEffacement`, qui répond alors `a_effacer`. Le noyau prévoit l'inverse : appelé, `conserverJusquAu` renvoie `a_confirmer` (`aucune_regle`), et `deciderEffacement` en tire un refus prudent (`refus_conservation`, `aConfirmer: true`).
   Essai reproduit : avec `regles: []`, une demande d'effacement pour « Camille Exemple » accepte `a_effacer`. Les 12 pièces et la conversation reçoivent la marque et disparaissent de la recherche.
   Le risque est réel : un réglage manquant (les vraies règles viendront de L08-T02) suffit pour marquer « à effacer » des pièces ou des écritures soumises à une obligation de conservation.
   Correction demandée :
   - appeler `conserverJusquAu` dès que la catégorie n'est pas `null`, même si aucune règle ne lui correspond, pour garder le refus prudent du noyau ;
   - ajouter un test qui rougit si l'on remet le raccourci, par exemple `regles: []` avec une demande d'effacement : `a_effacer` doit donner `ISSUE_NON_PERMISE`.

## Remarques (non bloquantes)
- Une mutation survit : inverser le tri de `decisionGlobale` (« date la plus tardive ») ne fait rougir aucun test. Un test avec deux objets aux dates de conservation différentes fermerait ce trou.
- `datesDe` ne fournit pas de date pour les écritures. Avec une règle `ecritures_livres`, le noyau répond donc « à confirmer », ce qui donne un refus prudent : acceptable pour l'instant.
