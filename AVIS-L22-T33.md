VERDICT: OK

PR #1158, fiche L22-T33, seconde relecture, tête relue : 7857cdec62dc9f3a7642cd52b150e8fcba1ae82d

## Défauts précédents (avis sur 7a45eaad) : levés
1. `|| dossier === ''` (specs-alignees.mjs:37) : levé. `sans-variable-ignore-avec-message` lance le script avec SPECS_DOSSIER vide et attend le code 0 et le message « ignoré » qui cite L22-T33. Mutant tué.
2. `EXTENSIONS.test(e.name)` (ligne 15) : levé. Le test ajoute c.bin (non signalé), d.txt et e.json (signalés). Mutants tués : filtre retiré, `txt` retiré, `json` retiré, `bin` ajouté.
3. Drapeau 'i' (ligne 24) : levé. La ligne « VALEUR X » de f.md est attendue. Mutant tué.

## Contrôles passés
- Les 5 fichiers sont dans fichiers_autorises ; 169 lignes sur 170 au plus ; aucune ligne « - - ».
- 6 tests nommés verts ; le test hors dépôt est ignoré sans variable.
- Mutants tués à nouveau : `ligne: k`, code de sortie forcé à 0, SPECS_FORME ignorée.
- garde:litteraux verte ; journal de 5 lignes qui commence par « # Journal L22-T33 ». Aucun secret, prix ni mot interdit.
- Aucune régression : la correction ne touche que le fichier de test.

## Remarques (non bloquantes)
- L'ancre `$` de `EXTENSIONS` n'est pas testée : sans elle, un fichier comme `a.md.bak` serait lu. Mineur.
- Le tri de readdirSync n'est toujours pas observable par les tests (déjà signalé, facultatif).
- La taille est à 169 sur 170 : il n'y a plus de marge pour une nouvelle correction.
- CI : les jobs `tests` et `verifier` sont rouges, mais pas à cause de cette PR. Le test en échec est `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues` (en-tête `porte` contre `porte_rgpd`), qui échoue aussi sur origin/main 347401ab.
