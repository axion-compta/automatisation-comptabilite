VERDICT: OK
SHA relu : 1c340238e71c6b5d53b88e880aa40f10bd2758a0
PR : 898 (fiche sensible L00-T66, porte n08, branche pilotage/L00-T66-fiche)

## Défaut de l'avis précédent (bd967bb) : corrigé
- Étape 3 de `pilotage/fiches/L00-T66.md` : autorise désormais à passer le cas « date future » de `outils/gardes/test/portes.test.mjs` à une date strictement postérieure à `AUJ` (de préférence le lendemain calculé à partir de `AUJ`), en gardant l'assertion `/futur/`. « Hors périmètre » ajusté : seuls `AUJ` et cette date changent. Aucune assertion retirée ni assouplie.

## Vérification exécutée
- Appliqué localement ce que la fiche demande : `pilotage/portes/n08.json` (`ecran` n08, `date` 2026-11-09, `valideur` Will, trois champs), `apps/web/src/ecrans/n08/.gitkeep`, `AUJ = '2026-11-09'`, cas « date future » = lendemain calculé de `AUJ` (2026-11-10).
- `node --test outils/gardes/test/portes.test.mjs` : 27/27 (0 échec). `node outils/gardes/portes.mjs` : vert, 9 portes. `node outils/gardes/fiches.mjs` : 892 fiches cohérentes (avertissements préexistants seulement). Changements locaux annulés ensuite.
- Diff contre main : seulement `pilotage/fiches/L00-T66.md` (36 lignes ajoutées) ; le commit de fusion n'a rien amené d'autre dans la PR.
- Fichiers autorisés suffisants et minimaux ; taille estimée à environ 20 lignes pour 40 autorisées ; critères exécutables.
- Aucun mot interdit, aucun prix, données fictives (valideur `Will` = liste `VALIDEURS` existante).

## Remarques (non bloquantes)
- L'étape 3 laisse le choix entre une date en dur (`'2026-11-10'`) et le lendemain calculé : le calcul est préférable pour la prochaine porte, la fiche le dit déjà.
