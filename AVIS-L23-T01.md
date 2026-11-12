VERDICT: OK

PR n°1161, fiche L23-T01 (sensible : fusion par Will seul), seconde relecture, tête relue : 7e99fb8d3eff19b4e2d90995cc527980637bc305

## Défaut précédent (avis sur 56f0c653) : levé
1. `exercice-herite-de-la-societe` (mode-travail.test.ts:29-36) : levé. Le test parcourt les 3 modes (`autonome`, `saisie_seule`, `expert_complet`), avec un exercice absent, `{}` ou `{ modeTravail: undefined }`. Mutants tués : `?? 'saisie_seule'`, `?? 'autonome'`, `?? 'expert_complet'` et `return societe.modeTravail` (surcharge ignorée).

## Contrôles passés
- Les 6 fichiers sont dans fichiers_autorises ; 86 lignes sur 160 au plus ; aucune ligne « - - ».
- 14 tests verts (mode-travail et mention), dont les 6 tests nommés ; tsc du noyau vert.
- Le mutant `assiste` remis dans MODES_TRAVAIL est toujours tué.
- Journal : 8 lignes, commence par « # Journal L23-T01 ». Aucun secret, prix ni mot interdit.
- Aucune régression : la correction ne touche que le fichier de test.

## Remarques
- CI : les jobs `tests` et `verifier` sont rouges, mais pas à cause de cette PR. Le test en échec est `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, qui échoue aussi sur origin/main 347401ab.
- Fiche `sensible: oui` : la fusion revient à Will.
