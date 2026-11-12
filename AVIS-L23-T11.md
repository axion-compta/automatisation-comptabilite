VERDICT: OK

PR n°1223, fiche L23-T11 (sensible : fusion par Will seul). Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 2907abcc2d4915e34be4ce3b85321c0edc5515b0
Avis précédent : A CORRIGER au SHA dd0789486967de9b72f427dd5d63bf65c1c567df.

## Défaut précédent : levé (vérifié par mutation)
1. `ventes-b.ts:66` (`rempli`) : si l'on remplace `v.trim() !== ''` par `v !== ''`, un test rougit (1 en échec sur 27). Le test met chacun des trois champs (`idRequete`, `horodatage`, `empreinteReponse`) à `'  '` et attend `ALERTE`. Il met aussi chaque champ à `' x '` et attend `OK`.

## Remarque précédente prise en compte
- `ventes-b.ts:73` : le format de `valeur` est maintenant testé quand `idRequete` vaut null. La mutation qui remplace un champ manquant par `'z'` est tuée.

## Régressions : aucune
- Le commit de correction ne touche que `ventes-b.test.ts`. Le code n'a pas changé depuis la première relecture, à part la fusion de main.
- `git diff origin/main...HEAD` : 6 fichiers, tous dans `fichiers_autorises`. 163 lignes ajoutées et 12 retirées, pour un maximum de 220. Aucune ligne « - - ».
- Tests : 310 sur 310 pour `controles/regles`, 12 sur 12 pour `vies.test.ts`. Aucune assertion n'a été retirée.
- Autres mutations rejouées, toutes tuées :
  - empreinte non exigée ;
  - état ignoré (`complete` seul suffit).
- Aucun mot interdit, aucun prix, aucun secret. Le journal fait 7 lignes et commence par l'en-tête attendu.

## CI (à signaler, ce n'est pas un défaut de l'auteur)
- `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (en-tête `porte` attendu, `porte_rgpd` reçu). Le même échec se reproduit sur `origin/main` 6181242502ba460ea74a102050ff6bbd1dbd2bb0 (conflit entre #1146 et #1215). Ce fichier est hors du diff de la PR.
- `gardes`, `types`, `lint`, `e2e`, `gitleaks`, `licences` et `stryker` sont verts.

## Remarques (non bloquantes, inchangées)
- `ventes-b.ts:82` : quand le statut enregistré n'est pas `verifie`, la preuve est `statut_vies:<statut>`, sans la trace VIES.
- `vies.ts` : l'horodatage est pris avant l'appel, et un numéro hors périmètre donne `a_confirmer`. Ces deux choix ne sont pas documentés en commentaire.
