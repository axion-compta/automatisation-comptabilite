VERDICT: OK

PR 881 — fiche L09-T45 (banc du profil 1, cas P01 à P12)
SHA relu : 6a5c1d88bbd972bd93dcb8790cf7855144e11a77

## Contrôles
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 197 lignes ajoutées, 1 retirée (taille max 300). Aucun fichier hors `__tests__` dans `src`.
- Tests : `vitest run src/profil/__tests__/banc` → 12/12 verts, nommés P01 à P12.
- Chiffres de la spec inchangés : IS 10 750,00 € (6 375,00 + 4 375,00), 15 000,00 € à 60 %, alerte à 75 240,00 € et rien à 75 239,99 €, plafond 85 000 € → alerte à 76 500,00 €, franchise 41 500,00 € > 41 250,00 €.
- Paramètres de test : chacun avec `source_url`, `date_releve: '2026-11-06'`, `statut: 'valide'` ; arrondi de test explicite (`demi-superieur`).
- Mutations à la main (toutes annulées) :
  1. `calcul-is.ts` : `<` → `>` sur le plafond réduit → P08 rouge.
  2. `calcul-is.ts` : exercice ≠ 12 mois → `> 24` → P09 rouge.
  3. `seuils.ts` : `>=` → `>` sur l'alerte → P11 rouge.
  4. `calcul-is.ts` : condition `a_confirmer` inversée → P10 rouge.
- `tsc --noEmit` (noyau) et eslint sur le banc : verts. CI de la PR : 9 contrôles verts.
- Aucun mot interdit, aucun prix, données fictives (SIREN de test 123456782, sociétés inventées). Journal : 6 lignes, commence par `# Journal L09-T45`.

## Remarques (non bloquantes)
- Critère Stryker (score ≥ 80) non lancé par l'auteur (journal ligne 6) ; le job CI `stryker` a duré 5 s, il a sans doute été sauté. À vérifier par Will si le critère doit être tenu au pied de la lettre.
- `banc-1.test.ts:4` : import relatif vers `packages/textes/src` depuis le noyau (précédent existant dans `export-complet/__tests__/lisezmoi.test.ts`).
- P12 : « rien d'appliqué » est vérifié sur un historique que `propositionChangementRegime` ne reçoit pas ; le contrôle est donc faible. La carte « TVA due à partir de la date fixée par la règle » n'est pas testée.
- P06 et P07 testent une matrice écrite dans le test (comme le demande la fiche), pas la matrice réelle du produit.
- `pnpm verifier` local : étape `types` en échec seulement à cause de Node 22 (le dépôt demande Node 24) ; `tsc` lancé directement : vert.
