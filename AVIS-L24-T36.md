VERDICT: OK
SHA relu : bdf83ee334b0f74ce579a68d2b01d913aab0ce1b (PR #1199, fiche L24-T36)

## Vérifications
- Fichiers : les 4 fichiers modifiés sont dans `fichiers_autorises` ; diff 145 lignes (max 250).
- Les 3 tests nommés passent (banc-au-moins-98-pour-cent, chaque-type-d-erreur-represente, piece-sans-erreur-non-signalee). CI : 9 jobs verts, dont `verifier` et `gardes`.
- Mutations à la main sur `comparaison.ts` : `valeursEgales` (centimes, numéro, texte) toujours vrai, `douteux` toujours vrai, branche citation retirée : un test du banc rougit à chaque fois. `douteux` sans `estChampCritique` et citation vide acceptée : survivent au banc seul mais sont tuées par les tests existants du dossier `pieces/lecture` (69 tests).
- Données fictives (« Société Exemple »), aucun secret, aucun prix, aucun mot interdit.

## Remarques (non bloquantes)
- Une erreur SIREN est détectée seulement comme `seul_a` (B rejette le SIREN invalide) : `douteux` reste faux. La suite (confiance `aSeul`) la traite comme note plus basse, pas comme champ douteux. Choix de conception à confirmer par Will.
- Les SIREN « valides » générés passent la clé de Luhn ; préfixe `00…`, peu probable chez une entité réelle.
- PR sensible : fusion par Will seul.
