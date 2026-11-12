VERDICT: OK

PR #1163 (L20-T07), seconde relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : f206104a78fa30bcfb7e88da15b46325cc17ffd8

## Défaut de l'avis précédent (tête 87ceca34) : levé, vérifié par mutation
1. `catalogue-sas` compare la liste complète de SAS, EURL et SASU (`toEqual`) et les absents de SAS en saisie seule. Mutations désormais tuées : SAS retiré de `bilan`, SAS retiré de `liasse_fiscale`, `rapport_gestion` réservé à la SARL, `rapport_gestion` non officiel de clôture, SASU retirée de `decision_associe_unique`, SASU ajoutée à `acte_unanime`.

## Non-régression
- Diff : 6 fichiers, tous dans fichiers_autorises ; 205 lignes pour 260 permises. Journal : 6 lignes, commence par « # Journal L20-T07 ».
- 8/8 tests ciblés verts (contrat et noyau).
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.

## Remarques (non bloquantes)
- CI : `tests`/`verifier` rouges pour le seul test `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, rouge aussi sur origin/main : pas un défaut de l'auteur.
