VERDICT: OK

PR #1110, fiche L16-T22, relue au SHA de tête 40a678538190cbd64b187e3a329f7c433ce33729.
Avis d'audit V1 (dépôt privé) non accessible depuis cette session : jugé sur la fiche (origin/main).

## Contrôles
- Fichiers : les 4 sont dans `fichiers_autorises`. Taille : 106 + 2 = 108 lignes, pour une limite de 200.
- CI verte au SHA de tête. Localement : 4 tests nommés verts ; gardes migrations et perimetre vertes.
- Le SQL suit la fiche : deux tables `a_compta`, `CREATE TABLE IF NOT EXISTS`, `piece_id NOT NULL`, `CHECK (nombre > 0)`, nombre et valeur nominale en `bigint`, unicité (societe_id, sequence), `cedant_id` nul possible, déclencheur qui refuse UPDATE et DELETE. Aucun DROP, TRUNCATE, RENAME ni GRANT.
- Mutations, toutes rouges : `piece_id` sans NOT NULL ; déclencheur réduit à UPDATE ; `bigint` -> `numeric` ; unicité réduite à (sequence) ; `cedant_id` NOT NULL.
- Aucun mot interdit ; journal de 6 lignes, il commence par `# Journal L16-T22`.

## Remarques (non bloquantes)
- Les déclencheurs FOR EACH ROW ne bloquent pas TRUNCATE. C'est le même modèle que 090-profil.sql ; un déclencheur `BEFORE TRUNCATE ... FOR EACH STATEMENT` renforcerait l'ajout seul (fiche ultérieure).
- `a_compta.refuser_modification()` est redéfinie avec un corps identique à celui de 090 : sans effet aujourd'hui, mais les deux migrations sont liées.
- `packages/noyau/src/juridique/registres.ts` (L16-T21, encore `a_faire`) n'existe pas : les colonnes suivent la liste de la fiche. Vérifier l'alignement quand L16-T21 sera codée.
- Fiche sensible : fusion par Will seul.
