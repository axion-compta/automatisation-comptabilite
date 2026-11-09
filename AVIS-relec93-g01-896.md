VERDICT: OK
SHA relu: 7174f249e2cf8c7f9b30f6ea92fb7e5a7f5201fe

# Avis relec93-g01-896 — PR 896, fiche L08-T33 (sensible, données personnelles)

## Vérifications
- Fiche `pilotage/fiches/L08-T33.md` lue en entier ; seul changement sur la fiche : `statut: a_faire` → `fait`.
- Fichiers modifiés (8) : tous dans `fichiers_autorises`. `routes.ts`, `app.ts`, `contrat.test.ts` et `.github/` non touchés.
- Taille : 103 ajouts + 4 suppressions = 107 lignes ≤ 210 ; aucune ligne « - - » dans `git diff --numstat`.
- `exploitation-routes.test.ts` : exactement 2 lignes changées (`toEqual([... , 'rechercherPersonne'])` et `toHaveLength(4)`), égalités strictes conservées, aucune assertion supprimée ni affaiblie, aucun `toBeGreaterThan`.
- Contrat : `GET /personnes/recherche`, `tags: ['acces:compte']`, query stricte `{ nom?, email?, iban? }`, erreurs `RECHERCHE_VIDE` 422, `RECHERCHE_TROP_COURTE` 422, `REGLAGE_ABSENT` 503 (via `...reglage`).
- Données personnelles : la sortie est `z.strictObject({ source, id, par })[]` : aucun `iban`, `email` ni `nom` renvoyé en clair ; schéma strict, donc aucun champ supplémentaire ne peut fuiter.
- Serveur : bouchon `ORPCError('NOT_IMPLEMENTED')`, signature `implementerPersonnes` inchangée ; test d'injection avec donnée fictive (`nom=Durand`) seulement.
- `openapi.json` : 45 lignes ajoutées, aucune supprimée (seule la route `/personnes/recherche`) ; `pnpm contrat:diff` : identique, sur la tête de branche et après fusion d'essai avec `origin/main` (d8146f6, fusion sans conflit).
- Tests nommés verts : `recherche-dans-openapi`, `erreurs-recherche-422-et-503-declarees`, `recherche-branchee` (+ 6 tests de `exploitation-routes.test.ts`).
- Mutations rejouées (7), toutes rougissent puis annulées :
  1. `RECHERCHE_VIDE` 422 → 400 : `erreurs-recherche-422-et-503-declarees` rouge.
  2. retrait de `RECHERCHE_TROP_COURTE` : idem rouge.
  3. retrait de `...reglage` (503) : idem rouge.
  4. tag `acces:compte` → `public` : `recherche-dans-openapi` et `chaque-route-a-une-etiquette-acces` rouges.
  5. retrait du paramètre `iban` : `recherche-dans-openapi` rouge.
  6. chemin `/personnes/cherche` : `recherche-dans-openapi` rouge.
  7. chemin `/personnes/recherche-x` côté contrat : `recherche-branchee` (404) rouge.
- `pnpm verifier` : tout est vert (24 étapes).
- Journal `pilotage/journal/L08-T33.md` : 5 lignes, commence par `# Journal L08-T33`.
- Aucun mot interdit, aucun prix, aucun secret, aucun octet NUL, aucune nouvelle dépendance, aucun alias d'`it`/`test`.

## Remarques (non bloquantes)
- `email` et `iban` transitent en paramètres de requête GET (prévu par la fiche) : ils peuvent apparaître dans les journaux d'accès. À traiter dans la fiche de logique (L08-T36/L08-T37) : ne pas journaliser l'URL brute de cette route, ou masquer ces paramètres.
- Les schémas de query n'imposent pas de longueur minimale : normal, `RECHERCHE_TROP_COURTE` est une erreur métier prévue pour la logique à venir.
