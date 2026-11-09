VERDICT: A CORRIGER

PR : 917 (fiche L11-T37, sensible)
SHA relu : c6099979de74a9040f499af24449b313a97eb0e7

## Contrôles
- Taille : 153 lignes (max 300 dans la fiche, moins de 400). Journal : 8 lignes, il commence par `# Journal L11-T37`.
- Défauts de l'ancien avis (SHA ee99f9c) :
  - Chemin : corrigé côté code. La migration est maintenant dans `apps/serveur/src/base/migrations/011-frais.sql`, le dossier lu par la garde, et `node outils/gardes/migrations.mjs` est vert.
  - Base réelle : corrigé. Le test lit le SQL avec `readFileSync` et le passe à `analyserMigration` et `analyserNoms`. Aucune base n'est démarrée, aucun chemin machine n'est écrit en dur (J3a, règle 13).
- SQL additif et rejouable : `IF NOT EXISTS` partout, aucun DROP, RENAME, TRUNCATE ni DELETE. L'invariant 1 est un CHECK, l'invariant 3 un index unique partiel. Montants en `bigint`, km en dixièmes entiers, immatriculation en `bytea`, `taux_applique` en texte.
- Tests ciblés : 8/8 passent. Mutations qui rougissent un test : index sans `statut <> 'refuse'`, inv1 sans `rembourse`, km sans CHECK.
- Aucun mot interdit, aucun prix, aucun secret, aucune adresse. Données fictives.

## Défauts
1. Fichiers hors de la fiche de main. La fiche `pilotage/fiches/L11-T37.md` de `origin/main` autorise encore `apps/serveur/migrations/a_compta/0110_frais.sql` et `apps/serveur/migrations/a_compta/__tests__/0110_frais.test.ts`. Elle n'autorise pas `apps/serveur/src/base/migrations/011-frais.sql` ni `apps/serveur/src/base/__tests__/011-frais.test.ts`. La PR de fiche 934 (branche `pilotage/L11-T37-chemin`), qui ajoute ces chemins, n'est pas encore fusionnée. En conséquence, `garde:termine` est rouge (« tests_requis oui mais aucun fichier de test suivi dans fichiers_autorises »), le test des gardes « le dépôt réel est vert » aussi, et `pnpm verifier` échoue. Correction : fusionner d'abord la PR 934 (par Will, la fiche est sensible), puis remettre la branche à jour. Cette PR ne peut pas être fusionnée avant.
2. `apps/serveur/src/base/__tests__/011-frais.test.ts:27` : le lint est rouge (`no-regex-spaces`, « Spaces are hard to count. Use {2} »), donc `pnpm verifier` échoue indépendamment du défaut 1. Correction : écrire `\n {2}\)` au lieu de `\n  \)`.

## Remarques (non bloquantes)
- Certains tests ne rougissent pas sous mutation : ajouter une valeur à l'union `energie` ou à `source_payeur`, ou retirer la clé étrangère `trajet.frais_id`. Seules les unions `statut`, `payeur` et `nature` sont fermées par le test. On pourrait figer aussi `energie`, `proprietaire` et `source_payeur`, et vérifier les `REFERENCES`.
- Le critère « migration appliquée deux fois » n'est vérifié que par la lecture du texte (`IF NOT EXISTS` sur chaque CREATE). C'est cohérent avec la fiche corrigée de la PR 934.
- Le numéro 011 est placé avant 057, 080 et 081, qui existent déjà. Aucun outil d'application des migrations n'existe encore dans le dépôt. Il faudra vérifier l'ordre quand il sera branché.
- Aucune colonne `societe_id` : c'est cohérent avec une base par client, à confirmer avec L11-T38.
