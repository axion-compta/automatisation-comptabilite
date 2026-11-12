VERDICT: OK

PR #1164 (L20-T17), seconde relecture Opus du 12/11/2026 (consigne LOT5, section R). Fiche sensible : fusion par Will seul.
SHA de tête relu : d7095153b00cec70937c9b99bfdcbcb69f25056d

## Défaut de l'avis précédent (tête 724219d9) : levé, vérifié par mutation
1. `echeance-la-plus-proche` couvre un filtre avec `du` < `jour`, une échéance en retard et une échéance sans date. Mutations désormais tuées : `l.statut === 'a_venir'` → `!== 'faite'`, puis la même en excluant seulement `inconnue`, puis seulement `en_retard`.

## Non-régression
- Diff : 4 fichiers, tous dans fichiers_autorises ; 114 lignes pour 180 permises. Journal : 5 lignes.
- 4/4 tests verts. Mutations encore tuées : `seuilsAu(debut)`, garde `estimation === undefined` retirée.
- Aucun seuil en dur, aucun mot interdit, aucun secret, aucun prix ; données fictives.

## Remarques (non bloquantes)
- `prorata` de `positionFranchise` toujours non transmis (première année) : à prévoir dans une fiche suivante.
- CI : `tests`/`verifier` rouges pour le seul test `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, rouge aussi sur origin/main : pas un défaut de l'auteur.
