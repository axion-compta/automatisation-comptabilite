VERDICT: OK

PR #1221, fiche L23-T12 (sensible : fusion par Will seul). Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 6b0269ef3d68ac3176aa8c863d74a2db962ad861
Avis précédent : A CORRIGER au SHA c5fa183eda191a35a8d39cfc6198371c9e5d44fa.

## Défauts précédents : tous levés (vérifiés par mutation)
1. Arrondi (`is-periodes.ts:58-59`) : nouveau cas à 0,5 et 0,75 centime. Avec `'inferieur'` à la place de `p.arrondi`, à la ligne 58 ou à la ligne 59, un test rougit.
2. Solde nul (`releve-2572.ts:28`) : avec `solde <= 0`, un test rougit grâce à l'assertion `nul.cases.at(-1)?.code === 'solde_a_payer'`.
3. Journal ligne 7 : corrigé. Le texte décrit maintenant les mutations rejouées.

## Régressions : aucune
- Le commit de correction ne touche que le test et le journal. Le code n'a pas changé depuis la première relecture, à part la fusion de main.
- `git diff origin/main...HEAD` : 5 fichiers, tous dans `fichiers_autorises`. 242 lignes ajoutées et 1 retirée, pour un maximum de 260. Aucune ligne « - - ».
- Tests : 6 sur 6 pour `is-periodes.test.ts`, 85 sur 85 pour `profil/fiscal`. Aucune assertion n'a été retirée.
- Autres mutations : plafond non appliqué, tuée. `solde < 0` changé en `<=` pour l'excédent (ligne 23), survit, mais elle est équivalente : l'excédent vaut 0 quand le solde est nul.
- Aucun mot interdit, aucun prix, aucun secret. Le journal fait 7 lignes et commence par l'en-tête attendu.

## CI (à signaler, ce n'est pas un défaut de l'auteur)
- `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (en-tête `porte` attendu, `porte_rgpd` reçu). Le même échec se reproduit sur `origin/main` 6181242502ba460ea74a102050ff6bbd1dbd2bb0 (conflit entre #1146 et #1215). Ce fichier n'est pas dans le diff de la PR. La PR sera verte une fois main réparée et fusionnée dans la branche.
- `gardes`, `types`, `lint`, `e2e`, `gitleaks`, `licences` et `stryker` sont verts.

## Remarques (non bloquantes, inchangées)
- La contiguïté des périodes n'est pas vérifiée (à voir en L23-T14).
- Les sources sont des libellés fixes, sans la version datée des paramètres.
