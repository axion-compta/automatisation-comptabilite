VERDICT: A CORRIGER

PR #1221, fiche L23-T12 (sensible : fusion par Will seul). Première relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : c5fa183eda191a35a8d39cfc6198371c9e5d44fa

## Vérifié
- 5 fichiers, tous dans `fichiers_autorises` ; 236 lignes ajoutées sur 260 permises ; aucune ligne « - - » ; `calcul-is.ts` n'est pas modifié ; aucune dépendance ajoutée.
- Les 6 tests nommés de la fiche sont présents : 6 sur 6 verts. Les 85 tests de `profil/fiscal` passent. tsc et eslint ne remontent rien.
- Aucun taux, plafond ni arrondi en dur : tout vient de `ParametresIs`.
- Le plafond est appliqué en entier à chaque période, sans prorata (banc de 16 mois). Les résultats sont toujours `a_verifier`, avec leurs sources.
- Solde et excédent sont calculés au centime, en entiers. NaN, négatif, non entier et infini sont refusés.
- Journal de 7 lignes, commence par « # Journal L23-T12 ». Aucun secret, prix, nom réel ni mot interdit.

## Défauts (deux mutations survivantes, rejouées par moi : 6 sur 6 verts)
1. `packages/noyau/src/profil/fiscal/is-periodes.ts:58-59` : forcer `'inferieur'` à la place de `p.arrondi` laisse tous les tests verts. Le seul montant fractionnaire du jeu (0,25 centime) donne 0 avec toutes les règles.
   Correction : dans `plafond-applique-par-periode`, ajouter une période dont la part fractionnaire atteint au moins 0,5 centime. Par exemple, une période éligible à 4 250 002, dont la part au taux normal donne 0,5 centime : attendre `c(1)` avec `demi-superieur` et `c(0)` avec `inferieur`.
2. `packages/noyau/src/profil/fiscal/releve-2572.ts:28` : `solde < 0` remplacé par `solde <= 0` laisse tous les tests verts. Le relevé à solde nul afficherait alors une case « excédent » à 0.
   Correction : dans `releve-2572-solde-au-centime`, ajouter `expect(nul.cases.at(-1)?.code).toBe('solde_a_payer')`.
3. `pilotage/journal/L23-T12.md:7` : « survivantes équivalentes (arrondi à la frontière, zéro) » est inexact, puisque les survivantes 1 et 2 ne sont pas équivalentes. À corriger une fois les tests ajoutés.

## Autres mutations
- Plafond proratisé : tuée.
- Perte non bornée à 0 : tuée.
- NaN et non entier acceptés : tuée.
- `a_confirmer` au taux réduit : tuée.
- Plafond `<` changé en `<=` : survit, mais elle est équivalente.

## Remarques (non bloquantes)
- La contiguïté des périodes n'est pas vérifiée. Ce n'est pas demandé par la fiche (à voir en L23-T14).
- Les sources sont des libellés fixes, sans la version datée des paramètres.
