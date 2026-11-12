VERDICT: OK

PR n°1186, fiche L22-T02, relue au SHA de tête e2225e5b84b67f0f879c3798f03162b1a1d5e729.

## Vérifications
- Périmètre : 6 fichiers, tous dans `fichiers_autorises`. Taille : 199 + 5 lignes, sous la limite de 250.
- La fiche correspond au code réel : `qualifierOrigine` renvoyait bien `NATIONAL` quand la TVA était nulle, et c'est corrigé. `ACQUISITION_UE` ne sort qu'avec un pays de l'UE différent de celui de la société et sans TVA française. CC-T09 et CC-T14 ne changent pas.
- `intracom.ts` passe par `effetTraitement` (aucun second calcul). Les comptes sont des arguments. Sans numéro de TVA, le code est `A_VERIFIER` et rien n'est déduit.
- Les 7 tests nommés sont présents. Cas limites testés : NaN, Infinity, montants négatifs et non entiers, base et taux à 0, comptes vides ou identiques, lignes déséquilibrées.
- Tests ciblés : 16/16 verts. `node scripts/verifier.mjs` : tests (861 fichiers), lint et gardes verts. L'étape `types` échoue seulement à cause du Node 22 du cloud ; `tsc --noEmit` lancé à la main passe. La CI est verte (9/9).
- Mutations : 20 faites, 18 tuées. Exemples tués : `tva === zero` → `>=`, retrait de `tvaFrancaise`, de `.trim()`, du contrôle des comptes, de `n >= 0` et de `collectee !== deductible`, et `franchise: true`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives seulement.

## Remarques (non bloquantes)
- `intracom.ts:73` : les deux mutants qui survivent (retrait de `!entier(q.collectee)` seul, ou de `!entier(q.deductible)` seul) sont équivalents. Comme `collectee === deductible` est exigé, un seul contrôle suffit. Si on retire les deux, le mutant est tué.
- `intracom.ts:51` : l'appel à `effetTraitement` pour la branche `A_VERIFIER` reprend celui des lignes 54-61. On pourrait le factoriser.
