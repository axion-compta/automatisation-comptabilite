VERDICT: A CORRIGER

PR n°1148, fiche L19-T19 (sensible : fusion par Will seul), SHA de tête relu : bfb238f4497ce2aeabc91f5888a909e05626fe81

Vérifié : 7 fichiers, tous autorisés ; 184 lignes (max 220) ; `node --test outils/gardes/test/performance.test.mjs` : 7 verts ; `vitest run outils/banc` : 8 verts ; `node scripts/verifier.mjs --gardes` : 23 étapes vertes ; `garde:performance vert` sur la branche. Aucun secret, prix ni mot interdit.

Défauts : trois mutations survivent (tous les tests restent verts).
1. `outils/gardes/performance.mjs:11` : si on retire `-?` de `SEUIL_EN_DUR`, aucun test ne rougit. Un seuil négatif en dur (`const seuil = -5;`) n'est pas couvert. Ajouter ce cas rouge dans `seuil-en-dur-dans-le-banc-rouge`.
2. `outils/gardes/performance.mjs:39` : si on retire `&& l.metrique === 'p95'`, aucun test ne rougit. Ajouter dans `banc-lit-le-tableau` un tableau qui n'a que `banc-volume,p50,…`, sans p95 : l'erreur « banc-volume/p95 absent » est attendue.
3. `outils/banc/volume.mjs:12` : si on retire `&& l.metrique === metrique` dans `lireSeuil`, aucun test ne rougit. Ajouter `lireSeuil(csv('banc-volume,p50,1,ms', 'banc-volume,p95,123,ms'))` qui doit valoir 123, et `lireSeuil(csv('banc-volume,p50,1,ms'))` qui doit lever une erreur.

Remarques
- La garde ne repère qu'un identifiant commençant par « seuil ». Une constante nommée autrement (`const P95_MAX_MS = 800`) passe. C'est une limite à documenter, pas un défaut bloquant.
- La CI de la tête était encore en file au moment de la relecture.
