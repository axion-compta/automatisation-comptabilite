VERDICT: OK
754501da79024100abf525e839d5b4936ad7f625

PR #1070, fiche L06-T44 (sensible), SHA de tête relu : 754501da79024100abf525e839d5b4936ad7f625 (base main ca9e7d98898ea22a8877333c4fd083152747be8e).
Relecture après changement de tête. Le dernier avis OK portait sur le SHA 44d51fb896ab2d9c84b509a0b5807f337b1ddf29.

## Ce qui a changé depuis 44d51fb8
- Un seul commit propre : `754501da merge: main dans lot-06/L06-T44`. Merge, sans rebase ni force-push. Il reprend main, qui contient maintenant L06-T39 (#1052, fusionnée en squash).
- `git diff --numstat origin/main...HEAD` ne contient plus que les 4 fichiers de la fiche : `acces-expert.test.ts` (103), `acces-expert.ts` (118), fiche (1/1) et journal (5). Total 227 lignes, limite 250. Tous sont dans `fichiers_autorises`.
- Ces 4 fichiers sont identiques octet pour octet à ceux du SHA 44d51fb8 (`git diff 44d51fb8 754501da` vide sur ces chemins). Le diff à deux points contre main est le même que le diff à trois points : la branche contient main.

## CI au SHA de tête
- Les 9 jobs sont verts : `verifier`, `gardes`, `tests`, `e2e`, `lint`, `types`, `gitleaks`, `licences` et `stryker`. `garde:termine` et `garde:perimetre` sont verts maintenant que #1052 est fusionnée.

## Remarques (non bloquantes, reprises de l'avis précédent)
- `acces-expert.ts:43` : aucun test pour `cacheMs` / `preavisMs` à NaN, Infinity ou non entier.
- T-ROL-3 est vérifié avec un cache de 30 s ; un réglage entre 45 et 59,999 s reste permis.

Fiche sensible : la fusion revient à Will seul.
