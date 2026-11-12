VERDICT: A CORRIGER

PR n°1154, fiche L26-T09, relue au SHA de tête 78f1674c1df71548169ad5a35364e6f8cb9d0ae5.

Contrôles passés : 8 fichiers, tous dans `fichiers_autorises` ; 223 lignes ajoutées (plafond 250) ; aucune dépendance nouvelle (`node:crypto`) ; aucun secret, aucun prix, aucun mot interdit ; journal de 6 lignes commençant par `# Journal L26-T09` ; les 4 tests nommés sont présents ; `node --test outils/captures/test/comparer.test.mjs` : 7/7 au vert ; `playwright.config.ts` non modifié.

## Défauts
1. `outils/captures/lancer.mjs:10` (`FORMAT_IMAGE`) : la frontière haute de l'empreinte n'est pas testée. La mutation `[0-9a-f]{64}` -> `[0-9a-f]{64,}` laisse les 7 tests au vert : une empreinte de 65 caractères ou plus serait acceptée. Correction demandée dans `outils/captures/test/comparer.test.mjs` (test `image-sans-empreinte-refusee`) : ajouter `${ok}0` (65 caractères) aux références refusées.
2. Même test : deux autres mutations survivent dans `validerImage`. `/\r?\n$/` -> `/\s+$/` (espaces de fin acceptés) et `^[^\s@]+@` -> `^[^\s]+@` (`a@b@sha256:…` accepté). Ajouter `${ok} ` et `a@${ok}` aux valeurs refusées.

## Remarques (non bloquantes)
- `comparer.mjs:25` : la mutation `&&` -> `||` survit (un seul dossier vide). Le résultat reste un refus, mais un cas « premier dossier vide, second non vide » qui attend les messages « capture manquante » fermerait ce trou.
- Le test `comparer.test.mjs` utilise `node:test` hors de `outils/gardes/test/`. `pnpm tests` (vitest `--passWithNoTests`) le charge sans y trouver de suite et passe en silence ; `scripts/verifier.mjs` ne lance `node --test` que sur `outils/gardes/test/`. Ces tests ne tournent donc dans aucun job de CI : à décider par Will (hors `fichiers_autorises`).
- La fiche passe à `statut: fait` alors que le critère `lancer.mjs --deux-passages` n'a pas été exécuté (image.txt sans empreinte, attendu par la fiche). Cela débloquera L26-T10 (gel des captures) avant toute capture réelle : à décider par Will.
- `lancer.mjs` monte le dépôt en écriture et lance `pnpm install` dans le conteneur : le `node_modules` de l'hôte est réécrit avec les binaires de l'image.
- CI : tous les jobs au vert sauf `verifier`, encore en file d'attente au moment de la relecture.
