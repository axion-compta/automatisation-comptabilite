VERDICT: OK
52b91e23568457678ec78045b93a0a2928c9aa99

PR #1125 (L16-T41), relecture après correction, 12/11/2026, au SHA de tête 52b91e23568457678ec78045b93a0a2928c9aa99.

Vérifications
- 4 fichiers, tous dans `fichiers_autorises` ; 146 + 3 lignes (max 220).
- Dépendances L14-T21 et L12-T17 à « fait » sur main.
- CI 9/9 verte à ce SHA (verifier, tests, types, lint, gardes, e2e, gitleaks, licences, stryker).
- Tests ciblés en local : 6/6 verts (les 5 tests nommés + `montants-invalides-refuses`). eslint vert.
- Aucun mot interdit, aucun prix, données fictives (SIREN inventé, clé de Luhn valide). Journal : 7 lignes, commence par `# Journal L16-T41`.

Défauts de l'avis précédent (SHA 4afe5dbc), vérifiés par mutation
1. Branche `n < 0` non testée : corrigé. Retrait de `|| n < 0` → 1 test rouge ; `n < -1` → rouge.
2. Cas Infinity et non entier pour `leverBlocage` : corrigé. `isSafeInteger` → `isFinite` → rouge ; `!isSafeInteger(n)` → `isNaN(n)` → rouge. Retrait de `montantEntier` dans `detecterTvaATort` → rouge.

Mutations de non-régression : retrait du contrôle du numéro, retrait de `operationSansTva`, levée à `<= 1` → toutes rouges.

Remarques
- `leverBlocage` ne relie pas la facture reçue à `pieceId` ; le rattachement relève de L16-T95.
- Fiche sensible : fusion par Will seul.
