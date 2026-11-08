VERDICT: OK
SHA relu : e7d2f77d5de684dda429b3a8fabf1163ac652623
PR : 876 (branche pilotage/L00-T63), nouvelle fiche `pilotage/fiches/L00-T63.md` (+32 lignes, seul fichier du diff).

## Vérifications
- Périmètre : `fichiers_autorises` = `outils/gardes/perimetre.mjs`, `outils/gardes/test/perimetre.test.mjs` (chemin réel, vérifié sur main), fiche et journal. Mêmes chemins que L00-T38. Aucun chemin `.github/`, `scripts/pilotage/`, `packages/contrat/`.
- Plafond : la fiche fixe une seule valeur, `PLAFOND_OPENAPI = 600`, constante en dur ; « rien d'autre ne change dans la garde » (même chemin exact, égalité de chaîne). Critères : 600 = vert, 601 = rouge.
- Exemption : reste conditionnée à `pnpm contrat:diff` (`estGenere`) et à `packages/contrat/scripts/` non touché ; sinon tout est compté (À faire 2, critère 4, tests T63-4 et T63-5). Le piège interdit d'élargir l'exemption à un autre fichier.
- Tests rouges si l'on remet 300 : simulation locale non commitée sur origin/main (T38-3, T38-11, T38-12 adaptés + 5 tests T63 décrits), `node --test outils/gardes/test/perimetre.test.mjs` :
  - plafond 600 : 60 verts, 0 rouge ;
  - mutation 300 : 6 rouges (T38-3, T38-11, T38-12, T63-1, T63-2, T63-3) ;
  - mutation 601 : 3 rouges (T38-3, T38-11, T63-2) ;
  - mutation exemption sans `estGenere` : 2 rouges (T38-5, T63-4).
- `garde:fiches` sur la branche : 888 fiches cohérentes. Phase P0 ; `depend_de: ["L00-T38"]` (fait). `taille_max_lignes: 120` suffit (environ 50 lignes attendues).
- Aucun mot interdit, aucun prix, aucune donnée réelle.

## Remarques (non bloquantes)
1. `pilotage/fiches/L00-T63.md:21` (À faire 3) : « La clause de taille ne s'applique toujours pas au reste du diff » peut se lire à l'envers. Formulation plus sûre : « L'exemption ne s'applique jamais au reste du diff : tout autre fichier respecte `taille_max_lignes` de sa fiche ».
2. `pilotage/fiches/L00-T63.md:22` : le cas T63-3 cite « taille 340 » alors que la PR 877 passe L11-T26 à 400. Sans effet sur la garde ; on peut écrire « taille 400 » pour coller au cas réel.
3. `pilotage/fiches/L00-T63.md:18` : la date de validation « 09/11/2026 » est postérieure au jour de la relecture (08/11/2026) ; à vérifier.
4. Le relèvement vaut pour toutes les fiches, pas seulement L11-T26 : toute fiche qui autorise `packages/contrat/openapi.json` pourra en ajouter jusqu'à 600 lignes générées. C'est le choix de Will ; à garder en tête.
5. Le portier (non sensible) refuse toujours 400 lignes ou plus au total, openapi compris : une PR avec +469 lignes d'openapi ne passera que par une fusion humaine. Sans effet ici (L11-T26 est sensible).
