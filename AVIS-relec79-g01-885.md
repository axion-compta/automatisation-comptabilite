VERDICT: A CORRIGER
SHA relu : b816e2bfcf126dc4482c9f8ef0a119a51d11d621
PR : 885 (fiche SENSIBLE L00-T64, branche pilotage/L00-T64), diff relu seul : `pilotage/fiches/L00-T64.md` (+38, ajout seul).

## Vérifications faites
- Simulation sur main + `pilotage/fiches/L11-T44.md` (branche `pilotage/L11-T44`, SHA 8d91c95) : la garde fiches rend 3 erreurs `partage` (L11-T27, L11-T38, L11-T39 avec L11-T44), toutes portées par la première fiche de la paire. Avec l'entrée prévue : 890 fiches cohérentes. Le choix des `id` (sans L11-T44) est exact.
- Après le point (b) (L11-T27 dépend de L11-T43 et L11-T44 ; L11-T38 dépend de L11-T27, L11-T39 de L11-T38) : la garde reste verte SANS l'entrée. Le retrait est donc possible.
- `fiches.mjs` (l. 117-118) n'apparie une exception que par `id` et `regle` : aucune entrée plus étroite n'existe sans toucher la garde. Le contournement par un autre `statut` est fermé (`termine.mjs` n'admet que `a_faire` et `fait`). L'exception est donc le seul chemin, et cette partie est bien justifiée.
- (c) Le test `exception-partage-l11-t44-motivee` rougit sans l'entrée : l'entrée `partage` existante ne cite aucune fiche L11.
- (d) Un seul fichier modifié, dans `fichiers_autorises` ; fichiers autorisés cohérents pour le code (json, test, fiche, journal) ; taille 60 suffisante ; exigence V3-QUA-029, celle de la garde ; aucun mot interdit, aucun prix, aucun octet NUL ; données fictives.

## Défauts
1. `pilotage/fiches/L00-T64.md:28` (À faire 3) et `:38` (Pièges) : rien ne borne l'affaiblissement par une machine. Tant que l'entrée existe, tout partage sans dépendance entre L11-T27, L11-T38 ou L11-T39 et une fiche du lot 11 de nom plus grand (L11-T45 et suivantes, ou une fiche modifiée) passe en silence, y compris après le point (b), où l'entrée ne sert plus à rien. Les Pièges le reconnaissent, mais seule une action manuelle de Will l'arrête. Correction : ajouter un second test nommé, par exemple `exception-partage-l11-t44-bornee`, dans `fiches.test.mjs` : `analyserFiches(charger().fiches, [])`, garder les erreurs `partage` dont la fiche porteuse est L11-T27, L11-T38 ou L11-T39, puis vérifier qu'il n'y en a aucune dont l'autre fiche n'est pas L11-T44. Prototype fait sur main + L11-T44 : 3 paires masquées, 0 hors L11-T44 ; il vaut aussi avant (a) et après (b) (0 paire). Ce test rougit dès que l'entrée masque une autre paire, et il reste valable une fois l'entrée retirée. Ajouter ce test aux `criteres`.
2. `pilotage/fiches/L00-T64.md:28` et `:34` : le retrait n'est exigé par aucun critère, aucun test, aucune fiche nommée (« Will la retire »). Pire, le test prévu exige que l'entrée EXISTE : le retrait cassera un test nommé, ce qui pousse à garder l'entrée. Correction : (i) nommer dans la section Suite la fiche de retrait (par exemple L00-T65, créée par une PR de pilotage juste après (b)), avec `fichiers_autorises` = json, `fiches.test.mjs`, fiche, journal, et le critère « aucune entrée `partage` ne cite L11-T27, L11-T38 ou L11-T39 » ; (ii) préciser que cette fiche retire ou inverse le test `exception-partage-l11-t44-motivee`, le test bornant du point 1 restant en place.

## Remarques (non bloquantes)
- Ligne 28 : « exactement une entrée de règle `partage` dont les `id` sont… » se lit mal, car une autre entrée `partage` existe déjà. Écrire « exactement une entrée dont `regle` vaut `partage` et dont `id` vaut exactement `["L11-T27","L11-T38","L11-T39"]` ».
- Le test doit importer `lireExceptions` (et `charger` pour le point 1) depuis `../fiches.mjs`, sans alias, avec `test` de `node:test` comme le reste du fichier.
- Fiche sensible : fusion par Will seul.
