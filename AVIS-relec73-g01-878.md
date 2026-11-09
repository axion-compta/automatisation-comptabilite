VERDICT: OK
SHA relu : 57f892a9dbf0a4151c11304522bfad0f8b6f3175
PR : #878, fiche L00-T63 (sensible : fusion par Will seul).

## Vérifications
- `outils/gardes/perimetre.mjs:117` : seule ligne changée, `PLAFOND_OPENAPI` 300 → 600. Même chemin exact (`OPENAPI`), même message, même comparaison `>` (ligne 139).
- Exemption inchangée : comptée à part seulement si `estGenere()` (lancement de `packages/contrat/scripts/diff.mjs`) rend vrai et si aucun fichier de `packages/contrat/scripts/` n'est touché (ligne 241) ; sinon les lignes d'openapi sont ajoutées au reste. Le reste du diff garde `taille_max_lignes`.
- Aucune autre garde, ni `.github/`, ni `scripts/pilotage/portier.mjs`, ni `packages/contrat/` modifiés.
- Tests : T38-3, T38-11, T38-12 adaptés (600 vert, 601 rouge avec « 601 lignes > 600 », suppressions comptées) ; T63-1 à T63-6 présents, tous les cas de la fiche couverts (600 vert ; 601 rouge ; 469 + 280, taille 340 vert ; sans confirmation « généré », absente ou fausse : tout compté, rouge « 749 > 340 » ; scripts/ touché : rouge « 470 > 340 »). `node --test` : 61 verts.
- Mutations à la main, puis code remis (arbre propre) : plafond remis à 300 → 7 rouges (T38-3, T38-11, T38-12, T63-1 à T63-4) ; 601 → 4 rouges ; 599 → 6 rouges ; `>` changé en `>=` → 3 rouges ; exemption sans `estGenere` → T38-5 et T63-5 rouges ; condition `packages/contrat/scripts/` retirée → T38-6 et T63-6 rouges.
- `pnpm verifier` (`node scripts/verifier.mjs`, Node 22 du cloud avec `npm_config_engine_strict=false`) : « tout est vert (24 étapes) ».
- Taille : 49 lignes ajoutées, 10 supprimées (plafond 120) ; aucune ligne « - - ». Périmètre : 4 fichiers, tous autorisés.
- Journal `pilotage/journal/L00-T63.md` : 5 lignes, commence par `# Journal L00-T63`.
- Aucun mot interdit, aucun prix.

## Remarques (non bloquantes)
- T63-5 et T63-6 verrouillent un comportement qui existait déjà (L00-T38) : ils ne pouvaient pas être rouges avant le code, contrairement à ce que dit le journal. Ils restent utiles comme garde-fous de non-régression.
