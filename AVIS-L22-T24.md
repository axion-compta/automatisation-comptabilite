VERDICT: OK

PR #1149, fiche L22-T24, tête e04ca7c14eafd8e797ab3d7ae4aa54c00a25df65 (relecteur Opus, lot 5).
Fiche SENSIBLE (nouvelle garde) : fusion par Will seul.

## Vérifications
- Fichiers : les 5 fichiers modifiés sont dans `fichiers_autorises`. Taille : 199 lignes (max 200).
- `node --test outils/gardes/test/attaques.test.mjs` : 6/6 verts, ce sont les 6 tests nommés. `node outils/gardes/attaques.mjs` donne « 3 decrites / 30 a_decrire / 0 critiques sans test », vert. La garde est découverte d'office par `scripts/verifier.mjs`.
- CI : les 9 jobs sont verts, verifier compris.
- Mutations sur `attaques.mjs` : bornes `n < 1` / `n > 33`, doublon, saut des non-critiques, gravité inconnue, lookbehind des titres, titre non vide pour `a_decrire`, en-tête. Toutes tuées.
- ATK-01 à ATK-30 : aucun énoncé inventé (`a_decrire`, titre vide). Les tests reliés à ATK-31, 32 et 33 existent. Aucun secret, prix ni mot interdit. Journal : 6 lignes.

## Remarques (non bloquantes)
- `attaques.mjs:29` : la mutation `c.length !== 6` vers `c.length < 6` survit (une ligne à 7 colonnes ne serait plus rejetée). Ajouter un cas à 7 colonnes dans `critique-decrite-sans-test-rouge`.
- Gravité « majeure » provisoire pour ATK-01 à ATK-30 : à reprendre à la publication des énoncés. Une attaque critique restée `a_decrire` n'est pas surveillée par la garde, ce qui suit la fiche.
