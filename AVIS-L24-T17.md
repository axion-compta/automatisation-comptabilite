VERDICT: OK
618670f1c33e83e5b26d49ffb344122a7e048b97

Seconde relecture de la PR n°1198, fiche L24-T17, au SHA de tête 618670f1c33e83e5b26d49ffb344122a7e048b97. L'avis précédent (A CORRIGER, tête b3570a7) est levé. Fiche sensible : fusion par Will seul.

## Défauts précédents, vérifiés par mutation
1. `packages/noyau/src/emprunts/echeance.ts:37` : avec le filtre `!estDateValide(e.date) ||` retiré, un test échoue (ligne du tableau au bon montant, date `2027-02-30`). Levé.
2. `echeance.ts:23` : avec `Number.isSafeInteger(p) &&` retiré, un test échoue (`capital: 1.5`, `interets: Infinity`). Levé.
3. Remarque `ventilation.ts:15` : avec `!Number.isSafeInteger(ligne.montant) ||` retiré, un test échoue (NaN, -1.5, -Infinity). Levée.

## Contrôles
- Diff : 6 fichiers, tous dans `fichiers_autorises` ; 185 lignes sur 280.
- Depuis la première relecture, seuls les deux fichiers de test ont changé, et uniquement par des ajouts.
- Tests : 7 sur 7 dans `src/emprunts`. Journal : 8 lignes.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives. Le corps de la PR a été reformulé.

## Remarques (ne bloquent pas)
- CI : `tests` et `verifier` sont rouges pour la seule cause `ouverture.test.mjs > onze-cases-attendues`. Ce test échoue aussi sur `origin/main`. Ce n'est pas un défaut de cette PR.
- `echeance.ts:32` : la mutation survivante est équivalente ; rien à faire.
