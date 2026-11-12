VERDICT: OK
aa571ccbab6af3c86dd739d5dfa3fb9aab7ac25c

Seconde relecture de la PR n°1196, fiche L24-T03, au SHA de tête aa571ccbab6af3c86dd739d5dfa3fb9aab7ac25c. L'avis précédent (A CORRIGER, tête 71b37cc) est levé. Fiche sensible : fusion par Will seul.

## Défaut précédent, vérifié par mutation
1. `packages/noyau/src/plan/actions.ts` : `courant.nbEcritures !== apercu.nbEcritures` changé en `>`, un test échoue (`fusion-sans-confirmation-sans-effet`, écriture retirée après l'aperçu). Changé en `<`, un test échoue aussi. Levé.

## Contrôles
- Diff : 4 fichiers, tous dans `fichiers_autorises` ; 280 lignes sur 280.
- Depuis la première relecture, une seule ligne de test a été ajoutée. `version-pcg.ts` et son test viennent de la fusion de main et ne font pas partie du diff.
- Tests : 21 sur 21 dans `src/plan`, dont les 10 tests nommés. Journal : 5 lignes.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.

## Remarques (ne bloquent pas)
- CI : `tests` et `verifier` sont rouges pour la seule cause `ouverture.test.mjs > onze-cases-attendues`. Ce test échoue aussi sur `origin/main`. Ce n'est pas un défaut de cette PR.
- Les signatures plus larges que la fiche sont à reporter dans L24-T05.
- La limite de taille est atteinte : toute correction future devra rester dans 280 lignes.
