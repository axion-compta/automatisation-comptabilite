VERDICT: A CORRIGER

Fiche: L06-T47 - PR #1069 - SHA de tête relu : cecf2b3fb19a10289b6b5cfe51828067817f19e8
Relu : seulement ce que la fiche ajoute (diff contre lot-06/L06-T39 / #1052, encore ouverte). Les fichiers de L06-T39 sont identiques à #1052.

CI : n'a pas tourné (tests GitHub en panne générale). Relecture du code et des tests, exécution locale :
- vitest `outils/banc/test/volume.test.mjs` : 3/3 verts.
- Mutations qui rougissent : refus masqué dans `mesurer`, reste de lignes non réparti, « PROPOSÉ » retiré du rapport, graine ignorée.
- `garde:termine` / `garde:perimetre` rouges attendus tant que #1052 n'est pas fusionnée : ce n'est pas un défaut de l'auteur.

Périmètre : 5 fichiers, tous dans fichiers_autorises ; 149 lignes (limite 250). Journal 7 lignes, commence par « # Journal L06-T47 ». Tests nommés présents. Seuil de p95 marqué PROPOSÉ, sans engagement. Aucun prix, secret ni mot interdit ; données fictives.

## Défauts
1. `outils/banc/volume.mjs` : `pnpm exec eslint .` (étape « lint » de `pnpm verifier`, critère de la fiche) donne 2 erreurs :
   - ligne 36 : `'performance' is not defined` (no-undef) ; correction : `import { performance } from 'node:perf_hooks'` ou `globalThis.performance.now()` ;
   - ligne 40 : `Expected an assignment or function call and instead saw an expression` (no-unused-expressions) ; correction : remplacer le ternaire par `if (...) ouvertes.push(b); else refus++;`.
   Relancer `pnpm exec eslint outils/banc` : 0 erreur attendue.

## Remarques (non bloquantes)
- `genererBases` : aucun cas limite NaN, Infinity ou non entier pour `bases` / `lignes` (le code les refuse, mais rien ne le teste).
- `docs/banc-volume.md` : aucune commande ne le régénère (pas de point d'entrée dans `volume.mjs`) ; dire comment il a été produit. Le p95 de 5 ms vient d'un faux serveur, ce que le texte dit bien.
- `executer` qui lève arrête toute la mesure (erreur non comptée) : acceptable, mais à documenter.
