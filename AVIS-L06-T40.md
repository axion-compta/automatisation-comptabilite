VERDICT: A CORRIGER

Fiche: L06-T40 (SENSIBLE) - PR #1067 - SHA de tête relu : a395f9438b7f2e50ef3074a529af6df0286032e4
Relu : seulement ce que la fiche ajoute (diff contre lot-06/L06-T39 / #1052, encore ouverte). Les fichiers de L06-T39 sont identiques à #1052.

CI : n'a pas tourné (tests GitHub en panne générale). Relecture du code et des tests, exécution locale :
- vitest `apps/serveur/src/__tests__/service-audit.test.ts` : 6/6 verts ; `node --test outils/gardes/test/audit.test.mjs` : 4/4 verts ; `node outils/gardes/audit.mjs` : vert ; eslint et tsc sans remarque sur les fichiers ajoutés.
- Mutations (toutes rougissent) : file par société retirée, transaction annulée qui écrit quand même, tête lue ignorée, `ecrireTete` retiré, `update` retiré de la garde.
- `garde:termine` / `garde:perimetre` rouges attendus tant que #1052 n'est pas fusionnée : ce n'est pas un défaut de l'auteur.

Périmètre : 6 fichiers, tous dans fichiers_autorises ; 259 lignes (limite 300). Journal 8 lignes, commence par « # Journal L06-T40 ». Aucun prix, secret ni mot interdit ; données fictives.

## Défauts
1. `outils/gardes/audit.mjs:13` (`ESTIME = /\.ts$/`) : la garde ne lit que les `.ts`. Une écriture dans une migration passe : `DELETE FROM a_compta.tete_journal` dans `apps/serveur/src/base/migrations/093-x.sql` donne 0 problème, et `outils/gardes/test/audit.test.mjs:31` fige ce trou (« .sql » attendu vert). Même chose pour `.tsx`, `.mts`, `.js`, `.mjs`. Or la fiche dit que l'interdiction de modifier tient par l'application (garde) tant que la DEMANDE 2 n'est pas acceptée.
   Correction : lire aussi `.sql`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` (le `CREATE TABLE` reste permis) ; remplacer l'assertion `.sql` vert par un cas rouge ; un test par extension.
2. `outils/gardes/audit.mjs:9-12` : l'expression se contourne avec des formes SQL courantes. Mesuré, 0 problème pour :
   - `INSERT INTO "a_compta"."tete_journal" ...` (identifiants entre guillemets) ;
   - `UPDATE ONLY a_compta.tete_journal SET ...` ;
   - `` INSERT INTO ${TABLE_TETE} `` dans un autre module : `service-audit.ts:4-5` exporte `TABLE_ENTREES` et `TABLE_TETE`, qui servent alors à écrire hors du service sans que la garde le voie.
   Correction : accepter les guillemets optionnels et `ONLY` dans l'expression ; refuser hors de `service-audit.ts` tout usage de `TABLE_ENTREES` / `TABLE_TETE` (ou ne plus les exporter) ; ajouter ces trois cas à `ecriture-hors-service-refusee-par-la-garde`.

## Remarques (non bloquantes)
- `update-delete-refuses` (T-JRN-4) teste `DepotMemoire.modifier()` / `supprimer()`, qui lèvent toujours : le test ne prouve rien du code de production ; la vraie protection est la garde (défauts 1 et 2).
- `ErreurAudit` déclare le code `tete_absente`, jamais utilisé.
- `FORMAT_CANONIQUE` laissé à 1, noté au journal : OK.
- PR sensible : fusion par Will seul.
