VERDICT: OK
SHA relu : 29a58a81128da201113a84a469c6537597651c65
PR : 804 — fiche L03-T36 (Faux serveur : historique du FEC et contrôles tracés, suite commune), branche lot-03/L03-T36

## Vérifications
- Fichiers modifiés (6) : tous dans `fichiers_autorises` (fec.ts, handlers.ts, suite-fec.ts, contrat-commun.test.ts, fiche, journal).
- Taille : 154 lignes ajoutées, 1 retirée, pour une limite de 280 ; aucune ligne « - - » ; `garde:perimetre` vert (L03-T36, 6 fichiers, 154 lignes).
- main fusionné sans perte : les commits fusionnés depuis main n'apparaissent pas dans le diff ; fusion à blanc avec le main actuel (5 commits plus récents) sans conflit.
- Tests : `suiteFec` est jouée sur les deux cibles (vrai serveur Fastify + oRPC, et faux serveur MSW) ; 12/12 verts.
- `pnpm verifier` : tests (689 fichiers, 6386 tests) verts, lint vert, toutes les gardes vertes, dont `garde:portes` (8 portes valides) ; l'étape types échoue seulement parce que le cloud tourne sous Node 22 (pnpm imbriqué) ; `pnpm -r exec tsc --noEmit` lancé directement : vert.
- Mutations sur `packages/faux-serveur/src/domaines/fec.ts` et `handlers.ts`, toutes rouges puis annulées : filtre `resultat` ignoré (2 rouges), route d'exercice vide non refusée (1), FEC inconnu en 400 au lieu de 404 (1), historique inversé (1), `creerHandlersFec` retiré de `handlers.ts` (6).
- Cas limites présents : `limite` 0, 101, 1.5, NaN, Infinity, `decalage` -1, `resultat` invalide ou vide en 400, identifiants vides ou encodés, exercice inconnu en 404, page au-delà de la fin vide.
- Journal : 6 lignes, commence par `# Journal L03-T36`.
- Aucun mot interdit, aucun prix, aucune valeur légale en dur, données fictives (EX2025, EX2026, FEC001 à FEC003), aucun octet NUL.
- Hors périmètre respecté : lecture seule, pas de lien de téléchargement, pas d'action « écarter ».

## Remarques (non bloquantes)
- Cas exigé par la fiche « exercice sans FEC (liste vide) » absent de `suite-fec.ts` : le jeu `genererDeclarations()` n'a aucun exercice connu sans FEC (EX2025 et EX2026 en ont tous deux), et l'en ajouter sortirait du périmètre. Le journal le dit. Le code renvoie bien `[]` dans ce cas (`fec-service.ts`, filtre sur un exercice connu). Risque faible : prévoir une fiche qui ajoute au jeu fictif un exercice sans FEC, puis le test.
- `suite-fec.ts` (test « non OK d'abord ») : comme le journal le note, le jeu fictif ne distingue pas le tri « non OK d'abord » du tri par gravité. Le test reste utile mais ne départagerait pas ces deux règles.
