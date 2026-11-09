VERDICT: A CORRIGER
SHA relu : bd967bbec2362b8f67b0a51c6469cbc85645856c
PR : 898 (fiche L00-T66, branche pilotage/L00-T66-fiche)

## Défaut bloquant
- `pilotage/fiches/L00-T66.md:25` (étape 3) : sur origin/main, `outils/gardes/test/portes.test.mjs:98` contient le cas `['date future', porte({ date: '2026-11-09' }), /futur/]`, avec une date en dur. Si `AUJ` passe à `'2026-11-09'` et que « rien d'autre ne change dans ce test », ce cas n'est plus dans le futur et `porte-invalide-rouge : date future` échoue. Vérifié en local : `node --test outils/gardes/test/portes.test.mjs` passe de 27/27 à 26/27 (`not ok 14 - porte-invalide-rouge : date future`). Le critère « node --test outils/gardes/test/portes.test.mjs vert » est donc impossible à tenir sans sortir de la fiche.
  Correction demandée : autoriser explicitement, à l'étape 3, le passage de la date du cas « date future » à une date strictement postérieure au nouvel `AUJ` (par exemple `'2026-11-10'`, ou mieux une valeur calculée à partir de `AUJ`, pour éviter le même piège à la prochaine porte). Le cas garde son assertion `/futur/` : rien n'est affaibli. Ajuster aussi la phrase « Rien d'autre ne change dans ce test » et la section « Hors périmètre ».

## Points vérifiés (OK)
- Cohérence avec L00-T61 et `outils/gardes/portes.mjs` : porte à trois champs (`date`, `ecran`, `valideur`), `valideur` = `Will` (liste `VALIDEURS`), dossier `apps/web/src/ecrans/n08/.gitkeep` exigé hors PR par `ecranExiste`. Le lien avec L15-T38 passe par L15-T54 (qui cite `ecrans/n08/` et L15-T38).
- origin/main : `AUJ` vaut bien `'2026-11-08'` (ligne 6) ; `portes-du-depot-valides` refuserait une porte du 09/11 (`date > aujourdhui`).
- Passer `AUJ` à `'2026-11-09'` ne retire ni n'assouplit aucune garde ni assertion (la garde réelle lit l'horloge système).
- Fichiers autorisés suffisants et minimaux (une fois le défaut corrigé, le test est déjà dans la liste). Taille 40 lignes plausible (environ 20 à 25 lignes).
- Critères exécutables ; 8 portes sur main, donc « au moins neuf » cohérent.
- `node outils/gardes/fiches.mjs` vert sur le SHA relu (892 fiches cohérentes, avertissements préexistants seulement) ; `node outils/gardes/portes.mjs` vert.
- Aucun mot interdit, aucun prix, données fictives.
