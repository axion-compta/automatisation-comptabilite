VERDICT: OK

PR n°1201, fiche L22-T04, relue au SHA de tête 38b7c939bf947fe0a20510183771aacb163220f9.

## Vérifications
- Périmètre : 7 fichiers, tous dans `fichiers_autorises`. Taille : 126 + 2 lignes, sous la limite de 200.
- La règle CC-T20 est de gravité B, avec `bloque: ['tva']` et la sortie `activite_mixte_expert`. Elle se déclenche sur un profil mixte, sur `EXONEREE_A_VERIFIER` (code réel de `ventes/types.ts`) ou sur un code de la liste exonérée. Le profil et la liste sont passés en argument. La règle ne produit aucune écriture.
- L'identifiant CC-T20 était libre sur main. Dans `docs/controles.csv`, la colonne test_id contient le titre d'un test réel (`societe-mixte-declaration-bloquee`). `node outils/gardes/controles.mjs` est vert.
- Le texte de CC-T20 vouvoie, renvoie vers l'expert et ne contient ni chiffre ni conseil fiscal.
- Les 6 tests nommés sont présents. Les entrées invalides (types faux, null, undefined) donnent `IMPOSSIBLE` par le moteur.
- Tests ciblés : noyau 6/6, textes 8/8. `node scripts/verifier.mjs` : tests et gardes verts. L'étape `types` échoue seulement à cause du Node 22 du cloud ; `tsc --noEmit` passe. La CI est verte (9/9).
- Mutations : 11 faites, 10 tuées (retrait de chaque condition, `some` → `every`, gravité, `bloque`, liste des codes).
- Aucun secret, aucun prix, aucun mot interdit. Données fictives seulement.

## Remarques (non bloquantes)
- `activite-mixte.ts:25` : le mutant qui retire `!Array.isArray(o.ventes)` survit. Il est équivalent par le moteur, car `for...of` sur `null` lève une exception et le moteur renvoie alors `IMPOSSIBLE`. Seule différence : un appel direct à `evaluer` lèverait une `TypeError` au lieu de `ErreurControle`. Un `expect(() => regleCCT20.evaluer({ ...objet(), ventes: null } as never)).toThrow(ErreurControle)` tuerait ce mutant.
