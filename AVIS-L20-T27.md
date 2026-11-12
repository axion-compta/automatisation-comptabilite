VERDICT: OK
5fd559ce40d35a0ad9b896a75b5f486e924ab5ab

Seconde relecture de la PR n°1194, fiche L20-T27, au SHA de tête 5fd559ce40d35a0ad9b896a75b5f486e924ab5ab. L'avis précédent (A CORRIGER, tête 10171df) est levé.

## Défauts précédents, vérifiés par mutation
1. Filtre des titres (`vocabulaire-annee.test.ts`, `estTitre`) : tout segment qui contient « titre » ou « legende » est retenu, quelle que soit la casse. Retour à l'ancien filtre `/\.(titre|legende)$/` : `exercice-absent-des-titres` échoue. « exercice » ajouté dans `e24-ventes.videTitre` : le test échoue. Levé.
2. Casse : `/exercice/` sans `i` fait échouer `exercice-absent-des-titres` (cas fabriqués `Exercice 2026`, `EXERCICE`). Levé.

## Contrôles
- Diff : 5 fichiers, tous dans `fichiers_autorises` ; 113 lignes sur 120.
- Seul `vocabulaire-annee.test.ts` a changé depuis la première relecture, pour les fichiers de la fiche. Aucun test retiré.
- Tests ciblés : 3 sur 3. Journal : 6 lignes, commence par `# Journal L20-T27`.
- Aucun mot interdit, aucun secret, aucun prix.

## Remarques (ne bloquent pas)
- CI : `tests` et `verifier` sont rouges pour une seule cause, `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues` (en-tête `porte` attendu, `porte_rgpd` produit). Ce test échoue aussi sur `origin/main` (347401ab), relancé en local. Ce n'est pas un défaut de cette PR, mais la CI doit être verte avant la fusion.
- Les mentions de `GENERIQUES` (n03, n04, e19, e39, e45) restent à suivre dans une fiche dédiée.
