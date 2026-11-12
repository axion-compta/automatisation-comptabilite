VERDICT: A CORRIGER

PR #1164, tête relue : 724219d99b839de4332d23350db9eb96aa9dc36c

Vérifié : 4 fichiers, tous dans `fichiers_autorises` ; 106 lignes (max 180) ; 4 tests nommés verts ; aucun seuil en dur (seuils lus par `seuilsAu(periode.fin)`) ; pièce en doute : aucun appel ni montant ; aucun mot interdit, secret ni prix ; journal de 5 lignes. CI verte (verifier en attente).
Mutations tuées : `seuilsAu(debut)`, garde `estimation === undefined` retirée, `caServices` remplacé par `caVentes`, exercice figé.

## Défauts
1. Mutation survivante, `packages/noyau/src/tableau-de-bord/bloc-tva.ts:30` : remplacer `l.statut === 'a_venir'` par `l.statut !== 'faite'` laisse les 4 tests verts. Une échéance `en_retard` (date entre `filtre.du` et `filtre.jour`) ou `inconnue` (sans date) pourrait alors être montrée comme « prochaine échéance ».
   Correction demandée dans `__tests__/bloc-tva.test.ts` (test `echeance-la-plus-proche`) : un filtre avec `du` < `jour`, une échéance en retard plus ancienne que l'échéance à venir, et attendre l'échéance à venir. Ajouter aussi un cas avec seulement une échéance sans date : `prochaineEcheance` vaut `null`.

## Remarques (non bloquantes)
- `prorata` de `positionFranchise` n'est pas transmis (première année d'activité) ; la fiche ne le demande pas, à prévoir dans une fiche suivante.
- Fiche sensible : fusion par Will seul.
