VERDICT: A CORRIGER
87f259d24a030dfd6ae76f7b2826607af287e063

PR #1084 (reprise de la PR #1050, fermée quand sa branche de base a été supprimée), fiche L00-T84 (sensible), SHA de tête relu : 87f259d24a030dfd6ae76f7b2826607af287e063 (base main 599f7b3304c84851cf893780c6c33e18722b0f3f).

## Comparaison avec le dernier avis OK de #1050 (commit 5f7f9eb de avis/L00-T84)
- Le SHA de tête est le même que celui de l'avis OK : 87f259d2. Le contenu n'a pas changé. Le fond reste OK.
- Diff contre main : 6 fichiers, tous dans `fichiers_autorises`. La fiche L00-T84 est maintenant sur main (PR #1049 fusionnée en squash, avec `statut: a_faire`).

## Défaut bloquant (mise à niveau, pas un défaut de fond)
1. La PR est en conflit avec main (`mergeable_state: dirty`). Le conflit add/add sur `pilotage/fiches/L00-T84.md` était annoncé à l'étape 2 de l'avis précédent. Depuis le conflit, la CI ne tourne plus : les derniers jobs datent du 11/11 à 20 h, sur l'ancienne base, avec `gardes` et `verifier` rouges.
   Correction : sur `lot-00/L00-T84`, lancer `git merge origin/main` (pas de rebase, pas de force-push). Résoudre en gardant la version de la branche, soit `statut: fait` ligne 8, puis pousser.

## Simulation de cette correction (en local, Node 22)
- Après le merge, `git diff --numstat origin/main...HEAD` donne `1 1` pour la fiche L00-T84, `16 12` L09-T49, `34 0` L09-T52, `36 0` L09-T53, `2 2` L10-T37 et `10 0` journal.
- `garde:perimetre` : vert (6 fichiers, 114 lignes). `garde:fiches` : vert (1061 fiches). `garde:termine` : vert. Toutes les autres gardes sont vertes, sauf `licences`, rouge faute de `node_modules` dans la simulation, et rouge de même sur main.
- Critères `git grep` : 2, 5 et 7 lignes.

## Remarques (reprises, non bloquantes)
- `pilotage/journal/L00-T84.md:6` : la ligne L09-T52 dit « dépend de L09-T49 et L09-T52 ». Or L09-T52 ne dépend que de L09-T49.
- Après la mise à niveau, reprendre `L09-T52` dans `depend_de` de `L09-T54.md` (PR #1061), comme demandé dans l'avis c2b8caa.
- Fiche sensible : la fusion revient à Will seul.
