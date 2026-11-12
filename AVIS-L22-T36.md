VERDICT: A CORRIGER

PR n°1228 (pilotage : fiche L22-T36 et son journal), relue au SHA de tête 257e7f79d09788d7afb97bc4e5c0efa52eee70f9.

## Défaut
- pilotage/fiches/L22-T36.md:12 (`fichiers_autorises`) : la fiche déclare `tests_requis: oui` mais n'autorise aucun fichier de test. Quand l'auteur passera la fiche à `statut: fait`, la garde `garde:termine` sera rouge (vérifié en simulant ce statut : « L22-T36 : tests_requis oui mais aucun fichier de test suivi dans fichiers_autorises »). Le portier refusera aussi la PR (« tests requis absents du diff »).
  Correction demandée : ajouter `"outils/exploitation/__tests__/ouverture.test.mjs"` à `fichiers_autorises`, comme L22-T30, et ajouter au point « À faire » une assertion qui vérifie que l'en-tête de `docs/ouverture.csv` contient la colonne `porte`. Cela donne au portier un fichier de test dans le diff. Seule autre solution : passer `tests_requis` à `non` si Will fusionne cette PR à la main.

## Vérifié sans défaut
- Diff : 2 fichiers, 26 lignes, seulement `pilotage/fiches/L22-T36.md` et `pilotage/journal/L22-T36.md`.
- Format identique aux fiches L22-T30 et L22-T35 : tous les champs y sont et l'`ordre` 36 est libre dans le lot 22. La garde `garde:fiches` passe (« 1300 fiches cohérentes »).
- Dépendances : L22-T30 et L25-T01 existent et sont `fait`. Toutes deux sont en phase P10, comme la fiche.
- Le constat est juste : `docs/ouverture.csv:1` et `outils/exploitation/ouverture.mjs:7` contiennent encore `porte_rgpd`, et `docs/mise-en-production.csv:1` contient `porte`. Sur main, `onze-cases-attendues` échoue (1 test rouge sur 6).
- Le correctif décrit suffit : j'ai remplacé `porte_rgpd` par `porte` dans ces 2 fichiers (1 ligne changée dans chacun), puis 6 tests sur 6 ont passé dans ouverture.test.mjs. Le diff tient sous `taille_max_lignes: 40`. Aucun autre fichier n'utilise `porte_rgpd`.
- Le journal commence par `# Journal L22-T36` et fait 2 lignes. Aucun mot interdit, aucun prix, aucune donnée réelle.
