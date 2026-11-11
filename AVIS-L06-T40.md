VERDICT: A CORRIGER

Fiche L06-T40, PR #1067, SHA de tête relu : fd219c07a38c32eb1c4fa349a3b3679dd73450ce
Deuxième relecture, après l'avis A CORRIGER du SHA a395f9438b7f2e50ef3074a529af6df0286032e4. Fiche sensible : fusion par Will seul.
Relu : ce que la fiche ajoute (le diff contre main contient aussi les fichiers de L06-T39, PR #1052, encore ouverte).

## Vérifications
- Fichiers de la fiche : 6, tous dans `fichiers_autorises` ; 260 lignes ≤ 300. Journal 8 lignes, commence par `# Journal L06-T40`. Aucun mot interdit, aucun prix, données fictives.
- `vitest run apps/serveur/src/__tests__/service-audit.test.ts` : 6/6 verts ; `node --test outils/gardes/test/audit.test.mjs` : 6/6 verts ; `node outils/gardes/audit.mjs` : vert sur le dépôt. La garde est lancée par `scripts/verifier.mjs` (tous les `outils/gardes/*.mjs`).
- CI au SHA relu : `gardes` et `verifier` rouges pour la seule `garde:perimetre`, ce qui est attendu tant que #1052 n'est pas fusionnée (ce n'est pas un défaut de l'auteur). `garde:termine` est verte. Les autres jobs sont verts.

## Défauts de l'ancien avis, vérifiés par mutation
1. Extensions : corrigé. `ESTIME = /\.ts$/` fait rougir `toutes-les-extensions-sont-lues` ; le `.sql` d'une migration avec `DELETE` est rouge ; `CREATE TABLE` reste permis.
2. Guillemets, `ONLY`, constantes : corrigé. Chacune de ces mutations rougit un test : guillemets de la table retirés, guillemets du schéma retirés, `ONLY` retiré, contrôle de `TABLE_TETE`/`TABLE_ENTREES` retiré, `ALTER TABLE` retiré.

## Défaut
1. `outils/gardes/audit.mjs:10` : deux ordres SQL d'écriture échappent encore à la garde. Mesuré, 0 problème pour :
   - `MERGE INTO a_compta.tete_journal t USING x ON true WHEN MATCHED THEN UPDATE SET n = 1` (PostgreSQL 15 et plus) ;
   - `COPY a_compta.entree_journal FROM STDIN`.
   Correction demandée : ajouter `merge\s+into` et `copy` à l'alternative de `ECRITURE` (pour `COPY`, seul `COPY <table> FROM` écrit ; `COPY <table> TO` lit, il peut rester permis). Ajouter ces deux cas à `ecriture-hors-service-refusee-par-la-garde`, plus un `COPY a_compta.tete_journal TO STDOUT` attendu vert si la lecture reste permise.

## Remarques (non bloquantes)
- Un nom de table construit par concaténation (`'a_compta.' + 'tete_journal'`) échappe à toute garde statique : c'est la limite connue du test statique, couverte plus tard par la DEMANDE 2.
- `update-delete-refuses` (T-JRN-4) teste toujours le faux dépôt seulement ; `tete_absente` toujours inutilisé (déjà signalé).
