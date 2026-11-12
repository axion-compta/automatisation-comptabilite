VERDICT: OK

PR #1178, fiche L21-T02, tête 435087f637c518159c1e43568d4098f7369c2521 (seconde relecture, relecteur Opus, lot 5). Avis précédent : A CORRIGER sur 56edbdc9d2e236215b5f0da822996a0af5371877.

## Défauts précédents : levés (vérifiés par mutation)
1. Compte journalisé (`compte-service.ts:29`) : `compte: 'svc-ia-1'` en dur fait rougir 1 test (second compte `svc-ia-2` contrôlé).
2. Horodatage journalisé (même ligne) : une constante en dur fait rougir 1 test (second horodatage contrôlé).

## Régressions : aucune
- `compte-service.ts` est inchangé depuis la tête précédente. Le test a seulement reçu un ajout de 4 lignes.
- La mutation `nature !== 'service'` remplacée par `nature === 'personne'` rougit toujours.
- 4 fichiers, tous dans `fichiers_autorises` ; 163 lignes pour un maximum de 200 ; 7/7 tests en local ; journal de 7 lignes ; données fictives ; aucun mot interdit, aucun prix, aucun secret.

## Remarques (non bloquantes)
- Toujours ouvertes : un objet non simple (`Date`) devient `{}` dans la copie masquée, et la correspondance des clés est sensible à la casse. À traiter au branchement.
- CI : `tests` est rouge à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui rougit aussi sur origin/main 347401ab. `verifier` est rouge parce qu'il en dépend. Ce n'est pas un défaut de l'auteur.
- La fiche est sensible : fusion par Will seul.
