VERDICT: OK

PR #1030 (L00-T82), SHA relu : 532cadc8a69f4a914c96397eca67ebd24c4ce55a (avis précédent OK au SHA 151a587335eabe3762c2063cb842f1738d650564).

Relecture du delta depuis l'avis (un seul commit, 532cadc8) :
- `pilotage/fiches/L00-T82.md` seulement : `depend_de` passe à `["L00-T75", "L00-T77"]` et une ligne de piège explique la dépendance (même fichier de test que L00-T77). Fichier autorisé.
- La fiche de la branche est désormais identique à celle de main (PR #1029 fusionnée) à `statut: fait` près.
- Aucun autre fichier changé ; portes, `.gitkeep`, test et journal identiques au SHA relu.

Contrôles sur la tête :
- Fichiers modifiés : tous dans `fichiers_autorises`. Taille : 79 + 1 = 80 lignes, limite 80.
- `node --test outils/gardes/test/portes.test.mjs` : 27 passent ; `node outils/gardes/portes.mjs` : vert (18 portes).
- Mutation : suppression de `pilotage/portes/e38.json` → 1 test rouge ; annulée.
- Journal : 6 lignes. Aucun mot interdit, aucun prix, données fictives.

Remarques (non bloquantes pour le contenu relu) :
- La PR est en conflit avec main (`mergeable_state: dirty`) : `outils/gardes/test/portes.test.mjs` (même ligne que L00-T77, fusionnée en adcb8e07) et `pilotage/fiches/L00-T82.md` (add/add). La résolution doit garder e07 dans la liste attendue et la fiche de main avec `statut: fait`. Ce merge déplacera la tête : nouvelle relecture du delta nécessaire avant fusion.
- L00-T77 est fusionnée sur main : la dépendance ajoutée est satisfaite ; `garde:termine` devrait passer après mise à jour depuis main.
- Sensible : fusion par Will seul.
