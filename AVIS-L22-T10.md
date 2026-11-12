VERDICT: OK
SHA de tête relu : 6b6f27556a7a9be153ce8017d0c0da37803b2433 (PR n°1200, fiche L22-T10, sensible : fusion par Will seul)

## Contrôles
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises`. Taille : 136 lignes (max 220).
- Tests : `paiement.test.ts` (7 tests nommés de la fiche) et `cas-sur.test.ts` : 19/19 verts. Attentes existantes de `cas-sur.test.ts` intactes (un test ajouté seulement).
- `tsc --noEmit` (noyau) vert ; `pnpm verifier` : lint, tests (861 fichiers), gardes verts ; l'étape « types » échoue en local pour le seul Node 22 du cloud et passe via tsc direct. CI de la PR entièrement verte.
- Mutations à la main (8) : `<= 0` → `< 0`, retrait de `Number.isSafeInteger`, retrait du « jamais rétrogradé », payeur inconnu non promu, moyen de la pièce au lieu de celui de la ligne, `=== false` → `!p.paiementProuve` et `!== true` dans `cas-sur.ts` : toutes tuées. Survivante : `certitude !== 'prouve'` → `=== 'suppose'`, équivalente (deux valeurs seulement).
- Cas limites présents : 0, négatif, NaN, non entier (1,5), frontière 1 centime, ligne nulle.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives. Journal : 7 lignes, commence par `# Journal L22-T10`.

## Remarques (non bloquantes)
- Choix d'auteur à confirmer par Will : un payeur `inconnu` devient `societe` à la preuve par une ligne de banque. Un payeur `dirigeant` (autre carte) reste `dirigeant` alors que le moyen devient celui de la ligne de banque de la société : à trancher dans une fiche suivante si besoin.
