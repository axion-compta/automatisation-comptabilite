VERDICT: OK
SHA relu : 28dfd286db2fdb2ad11073f70d268e4a0dafd671

PR de pilotage 963, nouvelle fiche L00-T67 (sensible).

## Contrôles
- Le diff AJOUTE un seul fichier : `A pilotage/fiches/L00-T67.md` (33 lignes, 0 retrait). Aucun autre fichier touché.
- Frontmatter : 15 champs, dans l'ordre habituel (id, titre, phase, lot, couloir, ordre, statut, sensible, exigences, depend_de, fichiers_autorises, nouvelles_dependances, taille_max_lignes, tests_requis, criteres). Valeurs valides : lot "00", ordre 67 (unique dans le lot), statut a_faire, sensible oui, exigences ["V3-QUA-027"].
- `depend_de: []` (vide).
- `fichiers_autorises` : exactement les quatre fichiers attendus : pilotage/fiches/L04-T30.md, pilotage/fiches/L10-T33.md, pilotage/fiches/L00-T67.md, pilotage/journal/L00-T67.md.
- `nouvelles_dependances: []`, `tests_requis: non`, `taille_max_lignes: 60`.
- `node outils/gardes/fiches.mjs` sur la branche : 895 fiches cohérentes, code de sortie 0 (avertissements préexistants seulement).
- Aucun mot interdit, aucun prix, aucun octet NUL, aucune donnée réelle.
- Faits du Contexte vérifiés sur la branche : les deux tests de branchement existent ; ils ne sont pas dans les fichiers_autorises de L04-T30 ni de L10-T33 ; les deux fiches sont `sensible: non` et `a_faire` ; L04-T30 dépend de L04-T55 et L10-T33 de L10-T56, les fiches qui possèdent ces tests, donc le partage reste accepté par la garde.

## Remarques
- Le test `pieces-branchement.test.ts:14` vérifie « statut différent de 404 » sur `/pieces/p1` : le changement prévu (`p1` devient `piece-001`) garde ce sens. La PR qui appliquera L00-T67 devra s'en tenir à ce seul identifiant, comme le précise la fiche.
- Fiche sensible : fusion par Will seul.
