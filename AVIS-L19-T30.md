VERDICT: OK

PR #1218, fiche L19-T30. Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R).
Tête relue : 9ead9455f7eb5155286819bcee348ba60cb8ff9c

## Défauts de la première relecture (au SHA 1fc42f4d)
1. Journal « Hors menu » : défaut levé. La ligne 6 donne maintenant e39, informations et n08, avec m04 à 1 clic. J'ai recalculé le plan réel et j'obtiens la même liste.
2. Tests sur les vrais écrans : défaut levé.
   - Le test `chaque-ecran-a-deux-clics-au-plus` vérifie la liste exacte des 9 écrans à plus de 2 clics, la même que celle du journal ligne 5.
   - Le test `ecran-hors-menu-signale` vérifie la liste `['e39','informations','n08']`.
   - Mutation de contrôle : j'ai retiré e39 de `horsMenu`. Le test devient rouge.
3. Remarques précédentes : traitées. `/reglages` et l'Accueil provisoire sont précisés au journal et en commentaire, et les apostrophes sont corrigées.

## Vérifié
- Les 4 fichiers modifiés sont autorisés. Le diff fait 135 lignes pour 180 permises.
- Le journal fait 8 lignes et commence par « # Journal L19-T30 ».
- Les 4 tests nommés sont verts en local.
- Aucun secret, prix, nom réel ni mot interdit.
- Pas de régression : `plan-navigation.ts` n'a pas changé depuis la première relecture. Seuls les tests et le journal ont changé, et le diff montre un merge de main.
- Mutations faites :
  - « Discuter » à 2 clics : test rouge ;
  - préfixe sans « / » : test rouge ;
  - e39 retiré de `horsMenu` : test rouge.

## CI
Deux tâches sont rouges : `tests` et `verifier`, qui en découle.
- Le seul échec est `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce fichier n'est pas touché par la PR.
- Je le reproduis à l'identique sur `origin/main` (61812425). Ce n'est donc pas un défaut de l'auteur : il faut corriger main, puis relancer la CI de la PR.
- `pnpm verifier` ne tourne pas en local : le cloud a Node 22 et le dépôt demande Node 24.

## Remarques (non bloquantes)
- Une mutation survit : compter 3 clics au lieu de 4 pour `/reglages/entreprise/*` ne fait rougir aucun test. Il suffirait d'ajouter `expect(ecransAuDela(reel, 3).map((n) => n.id).sort()).toEqual(['e44','e44-client','n03','n04'])`.

Pas de fusion.
