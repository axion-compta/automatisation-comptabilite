VERDICT: OK
SHA relu : 24c57e6a4d45f4cd05ddf7a0db7ce2fc7c8acb2d

# Avis de relecture PR 995 (L10-T51, migrations du schéma des ventes), seconde relecture. Fiche sensible : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA de tête ci-dessus, après le correctif 24c57e6 qui suit l'avis au SHA 2b53939.

## Défauts bloquants de l'avis précédent
1. Sécurité par ligne non imposée : **corrigé**. `0100_ventes.sql:65-74` ajoute `FORCE ROW LEVEL SECURITY` sur les cinq tables, et `migrations-ventes.test.ts:53` l'exige pour chacune. Essai sur un PostgreSQL 16 jetable, avec un rôle non superutilisateur propriétaire des tables :
   - migration jouée deux fois, la seconde passe aussi ;
   - `relrowsecurity` et `relforcerowsecurity` à vrai pour les cinq tables ;
   - **propriétaire réglé sur s1 : 1 ligne**, la pièce de s2 n'est plus visible (2 lignes avant le correctif) ;
   - propriétaire sans réglage : 0 ligne ;
   - propriétaire réglé sur s1 qui insère une ligne de s2 : refusé par la politique.
2. Test des contraintes sur `ttc_centimes` trop étroit : **corrigé**. `migrations-ventes.test.ts:35-39` refuse `ttc_centimes =`, `= ht_centimes` et `ht_centimes + tva_centimes`, et chaque ligne des corps de table qui cite `ttc_centimes` doit être la seule clause de non-négativité.

## Mutations à la main (dans le SQL, appliquées puis annulées)
- `FORCE` retiré sur `piece_vente` : `autre-societe-invisible` échoue.
- `ENABLE` retiré sur `encaissement_tva`, `FORCE` gardé : `autre-societe-invisible` échoue.
- `CHECK (ttc_centimes >= 0 AND ttc_centimes = ht_centimes + tva_centimes)` : `montants-en-bigint` échoue.
- Contrainte de table `CHECK (ttc_centimes - ht_centimes - tva_centimes = 0)` : `montants-en-bigint` échoue.

## Contrôles
- Fichiers : 4, tous dans `fichiers_autorises`. Taille : 156 + 1 lignes, sous 300. Aucune dépendance. Aucun octet NUL.
- Vitest : 6 tests verts sur 6. `tsc --noEmit -p apps/serveur` vert. La CI GitHub au SHA relu est verte (9 contrôles).
- Aucun mot interdit, aucun prix ni secret. Données fictives. Journal : 6 lignes, il commence par `# Journal L10-T51`.
- Pas de régression : le correctif n'ajoute que des lignes, les six tests d'avant sont tous là.

## Remarques
- Une contrainte posée hors des corps `CREATE TABLE` échappe encore au test, par exemple `ALTER TABLE a_compta.piece_vente ADD CONSTRAINT x CHECK (ttc_centimes - ht_centimes - tva_centimes = 0);` ajoutée en fin de fichier : les 6 tests restent verts. Appliquer le filtre des lignes à tout `code`, et non aux seuls corps, fermerait ce trou. Non bloquant : le schéma actuel n'a pas cette contrainte.
- Les remarques de l'avis précédent restent valables : chemin de migrations provisoire non lu par `outils/gardes/migrations.mjs`, `int[]` pour `trous`/`doublons` face à `numero` en `bigint`, aucune unicité sur `(societe_id, serie_id, numero)`.
