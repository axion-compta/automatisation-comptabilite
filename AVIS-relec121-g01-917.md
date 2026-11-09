VERDICT: A CORRIGER

PR : 917 (fiche L11-T37, sensible)
SHA relu : ee99f9c7d04e333d8ad847d2db215c26f3121708

## Contrôles
- Fichiers modifiés : les 4 `fichiers_autorises` seulement. Taille : 200 lignes (max 300 dans la fiche, moins de 400).
- SQL additif, sans DROP ni RENAME, `IF NOT EXISTS` partout. Invariant 1 posé en CHECK, invariant 3 en index unique partiel. Montants en `bigint`, km en dixièmes entiers, immatriculation en `bytea`.
- Tests : 9/9 passent en local (PostgreSQL 16 présent). Les 4 mutations font toutes rougir au moins un test : index sans `statut <> 'refuse'`, inv1 sans `rembourse`, km sans CHECK, `CREATE TABLE` sans `IF NOT EXISTS`. Gardes vertes. CI verte.
- Journal : 8 lignes. Aucun mot interdit, aucun prix, aucun secret ni adresse. Données fictives.

## Défauts
1. `apps/serveur/migrations/a_compta/0110_frais.sql` : la migration est hors du dossier que contrôle la garde. `outils/gardes/migrations.mjs:7` ne lit que `apps/serveur/src/base/migrations`, donc `garde:migrations` ne voit jamais ce fichier : aucun contrôle des DROP, des RENAME ni de la compatibilité N et N-1. Le chemin confirmé est `apps/serveur/src/base/migrations/` (fiche L15-T59 et migrations 057, 080, 081). Un second dossier de migrations crée en plus un risque d'ordre d'application. Correction : faire d'abord corriger la fiche par le pilotage (chemin `apps/serveur/src/base/migrations/` avec un numéro libre, par exemple `011-frais.sql`, et le test sous `apps/serveur/src/base/__tests__/`), puis déplacer le fichier et passer par `analyserMigration` et `analyserNoms`. L'auteur ne doit pas élargir le périmètre lui-même.
2. `apps/serveur/migrations/a_compta/__tests__/0110_frais.test.ts:8-45` : les tests démarrent un vrai PostgreSQL (`initdb`, `pg_ctl`, `runuser`) à partir de chemins machine en dur (`/usr/lib/postgresql/1x/bin`). Sans ces binaires, `describe.skipIf` saute les 8 tests nommés sans rien signaler. Cela va contre J3a et la règle 13 (interface et faux service, aucun test sur base), comme pour L15-T59 corrigée après la PR 910. Correction : alignée sur L15-T59 (lecture du SQL et contrôle par la garde, aucune base), ou alors une décision écrite de Will autorisant une base jetable de test. Les critères de la fiche (« base de test vide », « appliquée deux fois ») sont à réécrire en conséquence.

## Remarques (non bloquantes)
- Aucune colonne `societe_id` : c'est cohérent avec une base par client `cli_<id>`, mais à confirmer avec L11-T38.
