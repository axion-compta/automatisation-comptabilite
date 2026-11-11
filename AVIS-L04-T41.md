VERDICT: OK

Fiche L04-T41, PR #1046, SHA relu : 5cfe49f5ab3aeda60c746c5fd19cbcc2718e27b9
Relecture de mise à jour. Avis OK précédent rendu sur fd29ca6ca701332c192b73ab36f7e75f1536b78a ; seul un merge de origin/main a été ajouté depuis (après la fusion en squash de #1041).

## Vérifications
- `git diff origin/main...5cfe49f` : 6 fichiers seulement, tous dans `fichiers_autorises` (route, Ecran, test, textes e08, fiche, journal). Les fichiers de #1041 ont disparu du diff.
- `git diff fd29ca6 5cfe49f` sur ces 6 fichiers : vide. Le code relu est identique à celui de l'avis OK précédent. Les commits ajoutés ne viennent que de main.
- Taille : 275 + 1 = 276 lignes ≤ 280 (`garde:perimetre` vert en local).

## Tests
- `vitest run src/ecrans/e08` : 7/7 verts. tsc vert. Sur la tête et sur sa fusion d'essai avec main : `garde:textes`, `garde:appels` et `garde:perimetre` verts. Les autres gardes ont tourné sur la fusion d'essai seulement (`fictif`, `couleurs`, `actions`, `interrupteurs`, `ci`, `tests`, `termine`) : toutes vertes.
- Job CI `gardes` rouge sur ce SHA : en local, sans fusion avec main, `garde:termine` dit « L04-T41 : fait alors que L04-T31 ne l'est pas ». La branche porte encore `statut: a_faire` pour L04-T31 ; main l'a passée à `fait` après (#1055). Ce n'est pas un défaut de l'auteur. Avec main fusionné, la garde est verte : relancer la CI (ou fusionner main) suffit.

## Remarques
- Remarques de l'avis précédent inchangées : les tests de cet écran utilisent un bouchon de `fetch` au lieu de `demarrerNoeud` ; un code inconnu s'affiche « Autre … ».
