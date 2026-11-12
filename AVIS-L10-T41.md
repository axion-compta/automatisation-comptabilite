VERDICT: A CORRIGER
PR #1119, SHA de tête 056690f6415b6e312f229a39352c02160db1cd0e

Amendement de la fiche L10-T41 : ajout explicite de la dépendance réelle L10-T39 (branche `pilotage/amende-L10-T41`).

## Ce qui est vérifié et juste
- Un seul fichier change : `pilotage/fiches/L10-T41.md` (+1, -1 : `depend_de` devient `["L10-T39", "L10-T40", "L10-T38"]`).
- C'est un ajout, pas un retrait, et il est juste : L10-T41 branche des handlers MSW « sur les services de L10-T39 et L10-T40 » (`ventes-actions-service.ts`). La dépendance à L10-T39 est donc réelle ; elle n'était jusqu'ici que transitive, par L10-T40. Aucun cycle : L10-T39 dépend de L10-T37, L10-T11, L10-T22 et L01-T07.
- `garde:fiches` est vert en local sur cette branche.

## Défaut bloquant
1. Le job `gardes` est rouge au SHA de tête (donc `verifier` aussi), sur `garde:perimetre`. Message exact :
   `garde:perimetre ROUGE - repli CORPS_PR refusé : la fiche L10-T41 n’est pas sensible`
   La branche `pilotage/amende-L10-T41` modifie une fiche existante : elle n'est donc pas une « PR de pilotage » au sens de `estPRPilotage`, qui n'admet que des fichiers ajoutés. Le repli sur `Fiche:` du corps n'est permis que pour une fiche sensible (`outils/gardes/perimetre.mjs:216-229`). Ce n'est pas un défaut du contenu, mais la PR ne peut pas passer `verifier` telle quelle, et on ne peut pas assouplir la garde (règle 8).
   Correction demandée : décision de Will sur la voie d'amendement d'une fiche non sensible. Cet amendement n'est utile que si #1118 (L10-T40) est fusionnée ; si #1118 est fermée, fermer aussi cette PR.
