VERDICT: OK
1688512c9f336b6f73ae7bdfb564aff2fe53fe56

Seconde relecture de la PR n°1197, fiche L24-T19, au SHA de tête 1688512c9f336b6f73ae7bdfb564aff2fe53fe56. L'avis précédent (A CORRIGER, tête 41c83f6) est levé.

## Défaut précédent, vérifié par mutation
1. `packages/noyau/src/ecritures/reclassement.ts:54` : avec `filtre.dateFin` retiré de la validation des dates, `apercu-nombre-annonce` échoue. Le même test échoue quand on retire `filtre.dateDebut`. Levé.

## Contrôles
- Diff : 4 fichiers, tous dans `fichiers_autorises` ; 218 lignes sur 220.
- Depuis la première relecture, une seule ligne de test a été ajoutée ; le code n'a pas changé.
- Tests : 5 tests nommés sur 5. Journal : 8 lignes.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives. Le corps de la PR a été reformulé.

## Remarques (ne bloquent pas)
- CI : `tests` et `verifier` sont rouges pour la seule cause `ouverture.test.mjs > onze-cases-attendues` (`porte` attendu, `porte_rgpd` produit). Ce test échoue aussi sur `origin/main`. Ce n'est pas un défaut de cette PR.
