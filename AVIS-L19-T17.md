VERDICT: A CORRIGER

PR #1143 « L19-T17 Essais de parcours ». Relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête bfbe84b3e884576c25ec877dba8bf8b2575318e2.

## Vérifié
- Diff limité aux 6 fichiers_autorises ; 212 lignes ajoutées pour 260 permises.
- `node --test outils/essais/test/parcours.test.mjs` : 8 sur 8 verts. CI de la tête verte.
- Les 7 tests nommés de la fiche sont présents. Aucune nouvelle dépendance, aucune IA lancée.
- Seuils dans docs/essais-parcours.csv, et non dans le code.
- Journal : 6 lignes, commence par « # Journal L19-T17 ». Aucun mot interdit, aucun secret, aucun prix.
- Mutations tuées : `>` → `>=` sur la durée, retrait du test « vert antérieur au rouge », égalité de dates dans `tableau`, `typeof m`, `typeof r.parcours`.

## Défauts
1. outils/essais/parcours.mjs:39 : la frontière `pieges_pct = 100` n'est jamais lue par `lireRapport`. Le test du tableau construit le rapport P2 en mémoire, sans `lireRapport`. La mutation `m.pieges_pct > 100` → `>= 100` survit. Avec elle, tout rapport à 100 % serait refusé, alors que P4 exige 100.
   Correction : `lireRapport` accepte `pieges_pct: 100` et `pieges_pct: 0`, avec des assertions.
2. parcours.mjs:34 : la mutation qui retire `typeof r.version !== 'string' ||` survit. Une version numérique (`version: 2`) n'est pas testée.
   Correction : un test `version: 2` → /version/.
3. parcours.mjs:17 et 19 : deux mutations survivent.
   - `c.length !== 5` → `c.length < 5` : une ligne à 6 colonnes n'est pas testée.
   - L'expression régulière des seuils accepte un signe moins : un seuil négatif (« -1 ») n'est pas testé.
   Correction : un test pour chaque cas.

## Remarques
- La ligne de commande (`--clore`, `--correction`, option sans valeur) n'est pas testée. La fiche ne l'exige pas : ce n'est pas bloquant.
- Les seuils sont « proposés, à confirmer » (doc et journal) : à faire valider par Will.

SHA de tête relu : bfbe84b3e884576c25ec877dba8bf8b2575318e2
