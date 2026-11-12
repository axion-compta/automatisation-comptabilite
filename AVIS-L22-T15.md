VERDICT: OK

PR #1167 (L22-T15), seconde relecture Opus du 12/11/2026 (consigne LOT5, section R). Fiche sensible : fusion par Will seul.
SHA de tête relu : 005da5e3da5114cd3c9e977fcf6e16e5d8c436d6

## Défaut de l'avis précédent (tête a6ab6ab4) : levé, vérifié par mutation
1. `validerJustifiee` (etats.ts:101-103) retient l'argument s'il n'est pas vide, sinon `e.motif`, et l'écriture validée porte ce motif ; `valider` est inchangé. Mutations tuées : motif retenu = argument seul, `e.motif` prioritaire, `trim()` retiré, motif non rattaché à l'écriture, appel de `exigerJustification` retiré, `trim()` retiré dans `exigerJustification`.

## Non-régression
- Diff : 5 fichiers, tous dans fichiers_autorises ; 178 lignes pour 180 permises. Journal : 6 lignes.
- `src/ecritures` : 57/57 tests verts, attentes existantes inchangées.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.

## Remarques (non bloquantes)
- CI : `tests`/`verifier` rouges pour le seul test `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, rouge aussi sur origin/main : pas un défaut de l'auteur.
