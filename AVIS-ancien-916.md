VERDICT: A CORRIGER

PR : 916 (fiche L15-T59, sensible)
SHA relu : bc4aa88525f3f1b1af9f5c95ee6d930fca1001c9

## Contrôles
- Fichiers modifiés : les 6 `fichiers_autorises` seulement. Taille : 380 lignes (max 380 dans la fiche, moins de 400).
- Migration placée dans `apps/serveur/src/base/migrations/015-interface-transverse.sql`. Elle est additive, sans DROP, RENAME, TRUNCATE ni DELETE FROM, et toutes les créations portent `IF NOT EXISTS`. Index unique partiel `(societe_id, cle_dedoublonnage) WHERE etat IN ('ouverte','reportee')` présent. `alerte_journal` est en ajout seul par un déclencheur BEFORE UPDATE OR DELETE. L'argent est en `bigint`. `node outils/gardes/migrations.mjs` est vert.
- Aucun test ne se connecte à une base ; `nouvelles_dependances` reste vide. Faux dépôt en mémoire, règle 13 respectée. Données fictives, aucun mot interdit, aucun prix, aucun secret.
- Tests : 31/31 passent, avec tous les tests nommés de la fiche. Les 8 mutations font toutes rougir au moins un test : unicité désactivée, actif limité à `ouverte`, compteur non atomique, `supprimer` du journal autorisé, absence de copie, index partiel sans `reportee`, déclencheur sans DELETE, `CREATE TABLE` sans `IF NOT EXISTS`.
- Gardes (`verifier.mjs --gardes`) : toutes vertes en local. Journal : 6 lignes, il commence par `# Journal L15-T59`.

## Défauts
1. `apps/serveur/src/base/depots-interface-transverse.ts:75` : la CI est rouge (`lint` et `verifier` en échec sur ce SHA). `eslint` signale `'_options' is defined but never used (@typescript-eslint/no-unused-vars)`. Correction : utiliser `options.nouvelId` dans le faux dépôt (la fiche exige cette option), ou lire l'option explicitement. Ne pas assouplir la règle de lint. Relancer `pnpm lint` puis `pnpm verifier`.

## Remarques (non bloquantes)
- La taille est exactement à la limite de la fiche (380). Le correctif ne doit pas ajouter de ligne nette.
