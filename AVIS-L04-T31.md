VERDICT: OK

Fiche L04-T31, PR #1041, SHA relu : 4efb76710668ebed61e86a6ca9ce0e61658055cc
Fiche lue sur origin/main (7c5f74c, amendée par #1025 : `registres/lot-04.ts` autorisé).

## Vérifications
- Fichiers : 5, tous dans `fichiers_autorises` (fiche non touchée).
- Taille : 157 ajouts + 2 suppressions = 159 ≤ 280.
- Handlers `GET /pieces` et `GET /pieces/:id` sur le même service du contrat que le vrai serveur ; query validée par `QueryPieces` (400) ; 404 `PIECE_INCONNUE`.
- `handlersLot04` ajoute les handlers, rien réordonné ; `ctx.attendre()` (latence) appelé.
- Suite commune jouée sur Fastify et sur MSW + test `memes-reponses-vrai-et-faux` ; cas limites : limite 0 et 101, décalage négatif, date invalide, ordre inversé (du > au, montantMin > montantMax), pièce inconnue, pièce sensible masquée.
- Aucune valeur légale, aucun prix, aucun mot interdit, données fictives (`exemple.fr`). Journal 7 lignes, commence par `# Journal L04-T31`.
- CI au SHA relu : 9 contrôles verts (gardes, tests, types, lint, e2e, stryker, licences, gitleaks, verifier).

## Tests
- `vitest run src/__tests__/commun-pieces.test.ts` : 15/15 verts.
- Fusion temporaire avec origin/main : faux-serveur 550/550 verts ; tsc et eslint propres sur les fichiers touchés.
- Mutations (toutes rougissent, puis annulées) : validation de query neutralisée (2 rouges) ; code 404 changé en `NOT_FOUND` (2 rouges) ; `handlersLot04` vide (8 rouges) ; filtre `type` ignoré par le faux (4 rouges).

## Remarques
- `packages/faux-serveur/src/domaines/pieces.ts:19` : la 404 est construite à la main au lieu de `ctx.erreur('PIECE_INCONNUE', 404, {})` comme `ventes.ts`. Même corps (prouvé par le test de réponses identiques) ; à aligner à l'occasion, non bloquant.
- Le test de réponses identiques ne compare que le statut pour les 400 ; acceptable, le corps d'erreur de validation diffère par nature.
