VERDICT: OK

PR n°1152, fiche L26-T12, seconde relecture au SHA de tête 27384e8d1134fa8d6d8b8d3510b1a1814abee326 (avis précédent : A CORRIGER au SHA 77e55ff1f19ea11aed7fc6cd4338dc3be00ed694).

## Défaut précédent : levé
1. Branche « ligne sans nom d'écran » (`outils/gardes/manifeste-ecrans.mjs:29`) : nouveau test `ligne-sans-nom-rouge` (ecran absent, `'  '`, `42`). Mutation `{ pb.push(…); continue; }` -> `continue;` : rouge. Mutation `texte(l?.ecran)` -> `typeof l?.ecran === 'string'` : rouge.

## Pas de régression
- Depuis la relecture précédente, seuls le fichier de test et le journal ont changé ; la garde n'a pas bougé.
- `node --test outils/gardes/test/manifeste-ecrans.test.mjs` : 7/7 au vert ; `node outils/gardes/manifeste-ecrans.mjs` : vert. Mutations relancées (retrait de `!Array.isArray(ecrans)`, jeu jamais contrôlé) : rouges.
- 5 fichiers, tous dans `fichiers_autorises` ; 145 lignes (plafond 250) ; journal de 6 lignes ; aucun secret, aucun prix, aucun mot interdit.

## Remarques (non bloquantes)
- La mutation `|| outils.length === 0` -> retrait survit toujours. Elle est équivalente : chaque outil devient alors « inconnu », donc la garde reste rouge.
- Le journal annonce encore « 6 tests node:test » (il y en a 7). Le corps de la PR annonce encore « 23 écrans » (il y en a 24).
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). Ce test est rouge aussi sur `main` (vérifié en local) et la PR ne le touche pas. Ce n'est pas un défaut de l'auteur. Tous les autres jobs sont verts.
- Fiche sensible : la fusion revient à Will seul.
