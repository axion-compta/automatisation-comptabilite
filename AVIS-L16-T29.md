VERDICT: OK

PR #1124, fiche L16-T29, relue au SHA de tête c995733493192009739ae83d08de53ea4675ff04 (relecteur Opus, 12/11/2026).

## Contrôles
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 237 lignes ajoutées et 5 retirées (max 300). `paquet.ts`, `correctif.ts` et `index.ts` ne sont pas touchés.
- Tests : `signature-paquet.test.ts`, 8/8 verts en local, dont les 7 noms exigés et `activation-refusee-si-frontieres-rouges`. La ligne `parametres.paquet_refuse` est vérifiée. CI verte.
- Mutations à la main qui rougissent : clé révoquée ignorée ; `<=` remplacé par `<` (même version acceptée) ; ordre lexical (`v9` contre `v10`) ; `trim()` retiré sur la source ; cohorte en `<=` (0 % non vide) ; activation sans frontières.
- Sécurité : les clés sont générées dans le test et rien n'est écrit dans le dépôt. Les octets signés couvrent `version` et tous les champs (plats) de chaque ligne. Une signature illisible donne un refus et non une exception. `pourcentage` NaN, Infinity, non entier ou hors bornes donne un `RangeError`.
- Valeurs de paramètres inventées (`fictif.*`, pays `XX`) ; aucun prix ni mot interdit. Le journal fait 7 lignes.

## Remarques (non bloquantes)
1. Fiche : la ligne `bloque_par` (V1) est retirée et les critères passent à 8 tests dans la PR elle-même (« levé par Will le 12/11/2026 »). Aucune PR de pilotage séparée ne le confirme : Will doit le valider en fusionnant.
2. `signature-paquet.ts:58` : le type de clé n'est pas contrôlé (Ed25519 attendu). Avec une clé RSA, `verify(null, …)` lève une exception, qui est captée et donne un refus. Ajouter `createPublicKey(...).asymmetricKeyType === 'ed25519'` pour être explicite.
3. `signature-paquet.ts:61` : le contrôle `octets.length === 0` est un mutant équivalent, car Ed25519 refuse déjà une signature vide. Il est sans effet mais inoffensif.
4. `activationAutorisee(paquet, pays)` ne contrôle que les lignes du pays passé : l'appelant doit l'appeler pour chaque pays du paquet.
