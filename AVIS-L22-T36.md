VERDICT: OK

PR n°1228 (pilotage : fiche L22-T36 et son journal), seconde relecture au SHA de tête 978a9d2276746408409c336d645776b1f1c4353e.

## Défaut précédent (avis au SHA 257e7f79d09788d7afb97bc4e5c0efa52eee70f9) : corrigé
- `pilotage/fiches/L22-T36.md:15` passe à `tests_requis: non`, avec le critère « le test existant onze-cases-attendues passe ».
- Mutation : avec `statut: fait`, `garde:termine` passe. Si on remet `tests_requis: oui`, elle échoue à nouveau (« tests_requis oui mais aucun fichier de test suivi dans fichiers_autorises »). La correction est donc effective.
- Portier (`scripts/pilotage/portier.mjs:107-108`) : `non` est accepté et l'exigence de test dans le diff ne s'applique plus.

## Vérifié
- Le diff ne touche que la fiche et le journal (26 lignes, 2 fichiers, aucune ligne binaire). `garde:fiches` passe (1300 fiches cohérentes).
- La fiche correspond au code réel : `outils/exploitation/ouverture.mjs:7` (constante `ENTETE`) et l'en-tête de `docs/ouverture.csv` contiennent encore `porte_rgpd` sur main (f4db434a), alors que `docs/mise-en-production.csv` contient `porte`. Le test `onze-cases-attendues` existe bien (`outils/exploitation/__tests__/ouverture.test.mjs:15`).
- CI de la PR : seul `onze-cases-attendues` échoue dans `tests` (et donc dans `verifier`). C'est exactement le rouge de main que la fiche doit corriger ; ce n'est pas un défaut de cette PR.
- Aucun mot interdit, aucun prix, aucun secret. Le journal fait 2 lignes et commence par `# Journal L22-T36`.

## Remarques (non bloquantes)
- Critère : il manque l'apostrophe dans « couvre l en-tête » (sans effet).
