VERDICT: OK
2608fb625728789b6ba0a538b418910057aaaaac

PR #1100, fiche L09-T49 (**sensible** : double relecture, fusion par Will seul), relue au SHA de tête 2608fb625728789b6ba0a538b418910057aaaaac (relecteur Opus). C'est la reprise de la PR #1095, fermée, en un seul commit. `pilotage/ARRET` est absent sur origin/main.

## Identité avec #1095
- Le commit cff7b89cf94e61f51d0f18ae808f5bab414480da reste lisible. Le patch `git diff merge-base..cff7b89c` est identique **octet pour octet** au patch `git diff origin/main...2608fb62` : le diff des deux diffs est vide.
- Les seuls écarts entre les arbres viennent de main, qui a avancé (L08-T53, L11-T35). La PR n'y touche pas.
- Base cd0fa6c0, un seul commit, et l'ancien commit 77471fd5 (le faux positif gitleaks) ne fait pas partie de l'historique.

## CI à cette tête (run 43170260860) : 9/9 verts
verifier, e2e, gitleaks, lint, gardes, types, tests, stryker, licences.

## Revérifié à cette tête
- 24 fichiers, tous dans `fichiers_autorises`. Taille 292 lignes, plus 55 lignes d'`openapi.json` (exemption L00-T38).
- `pnpm contrat:openapi` puis `pnpm contrat:diff` : identique.
- Tests ciblés (isolation serveur et contrat, `contrat-commun`, `commun-profil-ecriture`) : 4 fichiers, 382 tests verts.
- Mutation : sans la comparaison de société (`apps/serveur/src/domaines/profil.ts:19`), `societe-d-autrui-404-meme-corps` rougit. La mutation est annulée.
- Le reste de l'avis OK rendu sur #1095 (mutations, données fictives, journal, remarques non bloquantes) s'applique tel quel, puisque le contenu est identique. Voir l'avis précédent dans l'historique de cette branche (8e5a6b73).

## Remarques (non bloquantes, reprises de #1095)
- `versSessionRoute` garde `societeId`, parce que `jeton.ts` est hors périmètre : à reprendre dans L09-T52 ou L09-T53.
- Le service du profil est encore mono-société : il faudra le brancher sur `session.societeId` avec la base (L09-T48).
- Un corps invalide rend 400 avant le 401 ou le 404 (validation oRPC).
- La classe `Introuvable` force `toJSON` par un double cast `as unknown as`.
