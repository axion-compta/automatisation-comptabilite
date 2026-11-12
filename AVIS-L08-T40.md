VERDICT: OK
84842117f2ac2d52f1331423d39701ce23e3b7b7

PR #1072, fiche L08-T40, SHA de tête relu : 84842117f2ac2d52f1331423d39701ce23e3b7b7 (base main 599f7b3304c84851cf893780c6c33e18722b0f3f).
Relecture après changement de tête. Le dernier avis OK portait sur le SHA b9734788.

## Ce qui a changé depuis b9734788
- Un seul commit propre, `84842117 Merge lot-08/L08-T39 dans lot-08/L08-T40`. Il reprend la nouvelle tête de #1051 (27d12cee), elle-même mise à niveau sur main. Merge, sans rebase ni force-push.
- Fond inchangé : les 10 fichiers du diff contre main sont identiques octet pour octet à ceux de b9734788.
- Apport propre à la fiche (diff contre la tête de #1051) : 5 fichiers, 293 lignes ajoutées et 7 retirées, soit 300 pour une limite de 300. Tous sont dans `fichiers_autorises`.

## CI au SHA de tête
- `tests`, `e2e`, `lint`, `types`, `gitleaks`, `licences` et `stryker` sont verts. `garde:termine` est vert.
- `gardes` est rouge pour `garde:perimetre` seulement, et `verifier` l'est par suite. En local, la garde liste les 5 fichiers de L08-T39 et une taille de 565 lignes, plus que 300. Ces fichiers viennent de #1051, encore ouverte. Ce n'est pas un défaut de l'auteur.
- vitest `apps/web/src/ecrans/e50` (Node 22) : 32/32.

## Ordre de fusion
1. #1051 d'abord.
2. Puis mettre #1072 à niveau par `git merge origin/main`. Simulation faite (squash de #1051 sur main, puis merge) : conflit add/add sur `apps/web/src/ecrans/e50/DemandesPersonnes.tsx`. Le résoudre en gardant la version de #1072, qui contient celle de #1051 plus le bouton « Traiter » et le formulaire. Ensuite, `garde:perimetre` doit passer au vert avec les 5 fichiers propres.

## Remarques (reprises, non bloquantes)
- Taille exactement au plafond.
- Lignes JSX longues ; libellés en dur dans `DemandesPersonnes.tsx` ; `clavier-seul` ne choisit pas d'issue au clavier.
