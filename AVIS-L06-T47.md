VERDICT: OK
eb9d20b02ec3f17407aa9813cb6d5d26494c5460

Fiche: L06-T47 - PR #1069 - SHA de tête relu : eb9d20b02ec3f17407aa9813cb6d5d26494c5460
Seconde relecture, après l'avis A CORRIGER du SHA cecf2b3f (relecteur Opus, lot 5 section R, 11/11/2026).

## Défauts de l'avis précédent
1. `outils/banc/volume.mjs`, erreurs de lint : **corrigé**.
   - `import { performance } from 'node:perf_hooks'` ajouté. Mutation : si je retire l'import, `pnpm exec eslint outils/banc` redonne `'performance' is not defined` (no-undef).
   - Le ternaire est devenu un `if / else`. Mutation : si je remets le ternaire, eslint redonne `no-unused-expressions`.
   - Au SHA de tête, `pnpm exec eslint outils/banc` ne sort aucune erreur.

## Contrôles relancés
- vitest `outils/banc` : 8/8 verts (Node 22, `engine-strict=false`).
- La remarque sur les cas limites est traitée : `generateur-deterministe` teste NaN, Infinity et 2.5 pour `bases` et `lignes`.
  - Mutation : si `bases` n'a plus à être entier, le test rougit (`expected [Function] to throw`).
  - Mutation : si le contrôle de finitude saute, le générateur boucle sans fin, et le test ne passe donc pas.
- Périmètre propre à la fiche : 5 fichiers, tous dans `fichiers_autorises`. Il fait 158 lignes, pour une limite de 250.
- Journal : 7 lignes, commence par « # Journal L06-T47 ».
- Aucun prix, aucun secret, aucun mot interdit ; données fictives.

## CI au SHA de tête
- Verts : tests, lint, types, e2e, gitleaks, licences, stryker. `garde:termine` est vert.
- `gardes` est rouge sur la seule étape `garde:perimetre`. Les fichiers hors liste viennent tous de L06-T39 (#1052, encore ouverte), et la taille comptée (309 lignes) les inclut. Ce n'est pas un défaut de l'auteur.
- `verifier` est rouge uniquement à cause de `gardes`.
- La PR ne peut être fusionnée qu'après #1052.

## Remarques (non bloquantes, reprises de l'avis précédent)
- `docs/banc-volume.md` : aucune commande ne le régénère. Le texte ne dit pas comment il a été produit.
- Si `executer` lève, toute la mesure s'arrête. C'est acceptable, mais à documenter.
