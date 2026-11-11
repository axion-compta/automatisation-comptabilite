VERDICT: OK

# Avis L15-T64 (PR #1043, fiche SENSIBLE) : relecture après correction

SHA relu : b665728611ff3386512cc9298d12fc7f477276ab (tête de `lot-15/L15-T64`).
Fiche de référence : `origin/main:pilotage/fiches/L15-T64.md` (#1032 est fusionnée).

## Défauts de l'avis précédent
1. Isolation SQL : corrigé. Le test vérifie `societe_id = $1` dans les gabarits et la société appelante en `params[0]` pour les 4 opérations. La mutation M8 (filtre retiré de `SQL.chercher`) rougit.
2. Retrait attendu : corrigé. Le port rend une promesse que le test résout lui-même. La mutation M3 (`void port.executer`) rougit.
3. Pièce sensible : corrigé. `EntreeBase.sensible` existe. `indexer` retire la ligne au lieu de l'écrire, dans les deux dépôts, et la reconstruction comme le contrôle de cohérence l'excluent. Deux tests ont été ajoutés. Les mutations sur `indexer` (mémoire et SQL) et sur `controlerCoherence` rougissent.
4. Adaptateur vers `ServiceRecherche` : renvoyé à une fiche de suite, comme l'avis précédent le permettait. La taille est de 299 lignes sur 300 et le report est noté dans le journal.
5. Limite : corrigé. `limiteEffective` borne la limite par `BORNES_LIMITE` et ramène NaN, Infinity et les valeurs non entières au défaut. C'est testé en mémoire et en SQL (`params[5]`). Les mutations M9 (défaut changé), borne basse retirée et `isInteger` remplacé par `isNaN` rougissent.

## Contrôles
- Périmètre : 5 fichiers, tous dans `fichiers_autorises` ; 299 lignes ajoutées sur 300 au plus ; aucune ligne « - - ».  La fiche passe à `statut: fait`.
- Journal : 5 lignes, commence par `# Journal L15-T64`.
- vitest ciblé : 18/18 verts. eslint et tsc (serveur) verts. `node scripts/verifier.mjs --gardes` : vert (21 étapes). CI au SHA relu : les 9 tâches sont vertes.
- Remarques suivies : test ET / OU (M7 rougit), `CREATE EXTENSION ... SCHEMA public`, l'apostrophe sépare les mots, choix `to_tsquery` noté au journal.
- Aucun prix, aucun mot interdit, données fictives ; aucune base réelle ni réseau dans les tests.

## Remarques (non bloquantes)
- Fiche de suite à créer : un adaptateur `DepotRecherche` vers `ServiceRecherche` (L15-T37), avec un test.
- `reconstruire` filtre `sensible` dans `voulues`, ce qui fait doublon avec `indexer`. La mutation qui retire ce filtre survit, mais elle est équivalente et ne compte pas comme défaut.
