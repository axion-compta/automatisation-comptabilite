VERDICT: OK
f402f26287029504a39e8240229f56878e7348dc

# Avis L14-T40, PR #1081 (troisième relecture, relecteur Opus, lot 5 section R, 12/11/2026)

SHA de tête relu : f402f26287029504a39e8240229f56878e7348dc. L'avis précédent (A CORRIGER) portait sur le SHA f1292348.
Fiche sensible : la fusion revient à Will seul. Fiche lue sur `origin/main`, qui contient l'amendement #1083.

## Défaut 1 (bloquant) : CORRIGÉ
- #1083 a ajouté `packages/contrat/src/__tests__/tva.test.ts` aux `fichiers_autorises` de L14-T40.
- `tva.test.ts:88-89`, cas `openapi-contient-les-routes-tva` : les lectures sont filtrées (`['get','get','get']`), et une assertion séparée vérifie les 4 écritures (`['put','post','post','put']`). Les assertions existantes sur les chemins, les operationId et la réponse 404 sont gardées. Le test n'est pas affaibli : un verbe en plus ou en moins le fait rougir.
- Mutation : la route de rattachement passe de `PUT` à `POST` (`packages/contrat/src/domaines/tva-ecriture.ts`). Résultat : `openapi-contient-les-routes-tva` et `serveur-par-defaut-refuse-401` rougissent.
- Mutation : `modifierInclureSousReserve` est retiré de `tvaEcriture`. Résultat : `t1-reglage-refuse-quel-que-soit-le-role` et les tests suivants rougissent.
- Le job `tests`, rouge à cause de ce cas, est vert. `verifier` l'est aussi.

## Défaut 2 (identifiant vide) : resté corrigé
Les tests `tva-ecriture.test.ts` (ligne `''` et pièce `''` refusées en 400) sont inchangés depuis f1292348.

## Commits depuis f1292348
Une fusion de `main` (aa232d41). `d761613a` modifie le test. `651b94af` et `f402f262` compactent `apps/serveur/src/domaines/tva-ecriture.ts` pour tenir sous 300 lignes.
- La refonte remplace les `if` par une table code → erreur. Le comportement ne change pas : un code inconnu donne `undefined`, et l'erreur est relancée comme avant.
- Mutations (annulées ensuite) :
  - ligne de refus retirée → `t1-reglage-refuse-quel-que-soit-le-role` et `reglage-valeur-false-aussi-refuse` rougissent (critère de la fiche) ;
  - `transition_interdite` mal relié → `sous-reserve-ligne-solide-409` rougit ;
  - `mois_identique` mal relié → `rattachement-ancien-et-nouveau-mois` rougit ;
  - `piece_inconnue` retiré → `rattachement-periode-deposee-409` rougit.

## Vérifications au SHA de tête (Node 22)
- vitest sur `tva.test.ts`, `tva-ecriture.test.ts`, `routes-paiement-interdites`, `routes-sans-virement`, `routes-interdites` et `identite` : 64/64 verts. Les 13 tests nommés sont verts.
- `pnpm contrat:diff` : identique.
- Gardes en local :
  - `perimetre.mjs` (avec `GITHUB_HEAD_REF=lot-14/L14-T40`) : vert, 9 fichiers, 300 lignes plus 262 lignes d'openapi.json ;
  - `termine.mjs` et `fiches.mjs` : verts (1061 fiches).
- Diff : 9 fichiers, tous autorisés, aucune ligne « - - ». La fiche passe à `statut: fait`. Le journal fait 4 lignes et commence par `# Journal L14-T40`.
- CI : les 9 jobs sont verts.
- Aucun mot interdit, aucun prix, aucun secret, données fictives.

## Remarques (non bloquantes)
- La taille est exactement à la limite (300/300). La moindre retouche future demandera un amendement de taille.
- La ligne compactée `const { type, par, reglage } = ...; journal.ecrire(...)` met deux instructions sur une seule ligne. C'est lisible, mais ce n'est pas le style du dépôt.
- Points repris des avis précédents :
  - l'état du service est commun à tous les exercices ;
  - la même `Idempotency-Key` sur une autre route donne `DEJA_FAIT`, ce qui est à documenter ;
  - le test d'identifiant vide passe par `call()`, pas par `inject` HTTP.
