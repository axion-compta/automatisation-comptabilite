VERDICT: OK

PR #1172 (L20-T26), seconde relecture. Tête relue : 08e9b9635203d775dea430d2fcbaeac4e62df105
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER à la tête f1aabdb45545aebcaecaa3abd7fdb40c9df75c73.

## Défaut précédent : levé (vérifié par mutation)
1. `packages/noyau/src/pieces/classement/rangement-exercice.ts:33` : `piece-a-cheval-question` couvre une pièce du 2026-12-15 au 2027-01-14 (rend `undefined`) et une pièce de l'exercice précédent qui finit hors de tout exercice (motif `exercice_precedent`). Mutation rejouée : retirer `dernier !== undefined &&` fait rougir 1 test.

## Aucune régression
- 5 fichiers, tous dans `fichiers_autorises` ; 127 lignes ajoutées et 1 supprimée (128, maximum 200). `periode.ts` inchangé.
- Tests ciblés : 5/5. Mutations supplémentaires, toutes tuées : `dernier.id !== premier.id` → `true` (4 tests rouges), `premier.id !== courant.id` → `false` (3), réponse « non » qui garde `propose` (1).
- Journal de 6 lignes. Aucun secret, aucun prix, aucun mot interdit, nom fictif.

## Remarques
- CI : `tests` et `verifier` sont rouges à cause du seul test `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui échoue aussi sur `origin/main` (347401ab, reproduit en local). La PR ne touche pas ces fichiers : ce n'est pas un défaut de l'auteur. La fusion attend la correction sur main.
- Inchangé : `packages/textes/src/moteur/rangement-exercice.ts` reste sans test (aucun fichier de test autorisé côté textes) ; à couvrir dans la fiche E08 suivante.
