VERDICT: A CORRIGER
SHA relu : 2b53939f8086f3d6a8b72cd177dff02e7d71d5e7

# Avis de relecture PR 995 (L10-T51, migrations du schéma des ventes). Fiche sensible : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA ci-dessus.

## Défauts bloquants
1. `apps/serveur/migrations/0100_ventes.sql:65-69` : la sécurité par ligne est activée (`ENABLE`) mais pas imposée (`FORCE`). Le rôle propriétaire des tables échappe donc aux politiques. Essai sur un PostgreSQL 16 jetable :
   - rôle non propriétaire réglé sur s1 : 1 ligne ;
   - le même rôle sans réglage : 0 ligne ;
   - **rôle propriétaire réglé sur s1 : 2 lignes, la pièce de s2 est visible.**

   Le critère « un client ne lit jamais les ventes d'un autre » n'est donc pas tenu si l'application se connecte avec le rôle qui a créé les tables.
   Correction : ajouter `ALTER TABLE a_compta.<t> FORCE ROW LEVEL SECURITY;` pour les cinq tables. Dans `apps/serveur/src/__tests__/migrations-ventes.test.ts:47`, exiger aussi `FORCE ROW LEVEL SECURITY` pour chaque table.
2. `apps/serveur/src/__tests__/migrations-ventes.test.ts:33-34` : la fiche interdit la contrainte `ht + tva = ttc`, mais le test ne repère que l'écriture `ht_centimes + tva_centimes =`. En ajoutant `CHECK (ttc_centimes = ht_centimes + tva_centimes)`, les 6 tests restent verts.
   Correction : vérifier que les seules contraintes sur `ttc_centimes` sont de non-négativité. Par exemple, `not.toMatch(/ttc_centimes\s*=|=\s*ht_centimes/)`, ou une liste des clauses CHECK comparée à une liste attendue.

## Mutations à la main (dans le SQL, appliquées puis annulées)
- `UNIQUE (cle_dedoublonnage)` sans `societe_id` : `cle-de-dedoublonnage-unique-par-societe` échoue.
- Sécurité par ligne retirée sur `encaissement_tva` : `autre-societe-invisible` échoue.
- `tva_centimes` en `integer` : `montants-en-bigint` échoue.
- Politique `USING (true)` : `autre-societe-invisible` échoue.
- Garde `IF NOT EXISTS` de la politique retirée : `migration-rejouable` échoue.
- Clé étrangère de `ligne_vente` sans `societe_id` : `autre-societe-invisible` échoue.
- `CHECK (ttc_centimes = ht_centimes + tva_centimes)` ajouté : aucun test n'échoue (défaut 2).
- Seconde politique permissive `USING (true)` sur `piece_vente` : aucun test n'échoue. C'est la limite des tests qui ne lisent que le texte.

## Contrôles
- Fichiers : 4, tous dans `fichiers_autorises`. Taille : 146 lignes, sous 300. Aucune dépendance.
- Vitest : 6 tests verts sur 6. `tsc --noEmit -p apps/serveur` vert. En local, `pnpm verifier` est vert sauf l'étape `types`, qui bute sur Node 22 (766 fichiers de test verts, gardes vertes). La CI GitHub au SHA relu est verte.
- En base jetable : la migration rejouée deux fois donne le même schéma (`pg_dump -s`). La clé de dédoublonnage est unique par société, les montants négatifs sont refusés, une pièce rattachée au client d'une autre société est refusée, et `ht + tva ≠ ttc` est accepté.
- Aucun mot interdit, aucun prix ni secret. Aucune valeur légale en dur. Journal : 6 lignes, il commence par `# Journal L10-T51`.

## Remarques
- Le chemin `apps/serveur/migrations/` est provisoire, et la garde `outils/gardes/migrations.mjs` ne le lit pas. Le test pourrait appeler `analyserMigration`, comme `090-profil.test.ts`.
- `trous`/`doublons` sont en `int[]` (spec) alors que `numero` est en `bigint`.
- Aucune unicité sur `(societe_id, serie_id, numero)`. C'est cohérent avec le suivi des doublons, mais à confirmer.
