VERDICT: A CORRIGER

PR n°1152, fiche L26-T12, relue au SHA de tête 77e55ff1f19ea11aed7fc6cd4338dc3be00ed694.

Contrôles passés : 5 fichiers, tous dans `fichiers_autorises` ; 137 lignes ajoutées (plafond 250) ; aucun secret, aucun prix, aucun mot interdit ; journal de 6 lignes commençant par `# Journal L26-T12` ; les 5 tests nommés sont présents ; `node --test outils/gardes/test/manifeste-ecrans.test.mjs` : 6/6 au vert ; `node outils/gardes/manifeste-ecrans.mjs` : vert. Les 24 routes du manifeste correspondent au `chemin` de chaque `route.tsx` ; la fusion avec main est propre ; la CI est au vert.

## Défaut
1. `outils/gardes/manifeste-ecrans.mjs:29` : la branche « ligne sans nom d'écran » n'est pas testée. La mutation `{ pb.push('ligne sans nom d’écran'); continue; }` -> `continue;` laisse les 6 tests au vert : une ligne `{ route: '/x', outil_chat: 'vue.ouvrir', jeu: 'commun' }` sans `ecran` serait alors ignorée et la garde resterait verte. Correction demandée dans `outils/gardes/test/manifeste-ecrans.test.mjs` : un cas `rouge((m) => { delete m.manifeste[0].ecran; }, 'ligne sans nom')`. Ajouter aussi `ecran: '  '` et `ecran: 42`.

## Remarques (non bloquantes)
- Mutations équivalentes ou sans effet sur le résultat : `outils.length === 0` -> `false` (chaque outil devient « inconnu », donc rouge quand même) ; retrait de `!Array.isArray(ecrans)` (l'exception est captée et donne rouge). Un test `analyserManifeste([], null, ['vue.ouvrir'])` qui attend le message « illisibles » les fermerait.
- Le journal et le corps de la PR annoncent « 23 écrans ». Le manifeste et `apps/web/src/ecrans/` en comptent 24 (e38, sans `route.tsx`, est exclu à juste titre).
- La garde ne compare pas `route` au `chemin` de `route.tsx`. La fiche ne le demande pas ; c'est cohérent aujourd'hui (vérifié à la main).
