VERDICT: A CORRIGER

PR n°1173, fiche L26-T23, relue au SHA de tête 4e81415f1ee07a50121f53ed119acf3d83e03cd1.

Contrôles passés : 4 fichiers, tous dans `fichiers_autorises` ; 125 lignes ajoutées (plafond 150) ; aucune valeur de plafond dans le dépôt ; aucun montant, aucun prix, aucun secret, aucun mot interdit ; journal de 8 lignes commençant par `# Journal L26-T23` ; les 4 tests nommés sont présents ; `vitest run outils/banc/test/conversation.test.mjs` : 5/5 au vert. Les mutations de frontière tuées sont `>=`/`>` sur le plafond de tour, `n > plafondTour`, `med > plafondMediane`, `n > 0`/`n >= 0`, le contrôle du plafond médiane, le cas sans tour, `sans_modele` dans `depasse` et le verdict avec le seul plafond médiane. La CI est au vert.

## Défaut
1. `outils/banc/conversation.mjs:24` : l'estimation du modèle n'est pas testée sur des valeurs invalides. La mutation `lire(modele.estimer(t))` -> `modele.estimer(t)` laisse les 5 tests au vert. Sans ce contrôle, une estimation `NaN`, `undefined` ou négative donne `NaN >= plafond` = faux : le modèle est appelé alors que le plafond devait le bloquer. C'est la protection même de V3-CHT-071. Correction demandée dans `outils/banc/test/conversation.test.mjs` : avec `plafonds: { tour: 10 }`, les estimations `NaN`, `-1`, `2.5` et `undefined` doivent rejeter `jetons_invalides`, et le modèle ne doit pas avoir été appelé (`appels` vide).

## Point de fiche (pas un défaut de l'auteur)
- Critère `node --test outils/banc/test/conversation.test.mjs` : il échoue (0 test). Les tests de `outils/banc/test/` utilisent vitest, et `node --test` échoue de la même façon sur `evaluateur.test.mjs` et `volume.test.mjs` de main. Le critère est à corriger par le pilote (`pnpm exec vitest run outils/banc/test/conversation.test.mjs`).

## Remarques (non bloquantes)
- `conversation.mjs:7` : la mutation `Number.isSafeInteger` -> `Number.isInteger` survit (plafond supérieur à 2^53). Un cas `2 ** 53` dans `parametres-invalides-refuses` la fermerait.
- `tours` non tableau : une TypeError brute au lieu d'un refus nommé.
