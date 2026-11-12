VERDICT: OK
PR #1214 (L21-T17). SHA de tête relu : 34d15a3588cec79217e96800ada29b88c9dcb2c3

Relecteur Opus, consigne LOT5 section R. Troisième relecture, après l'avis A CORRIGER au SHA c95f8749b145fe2121049447ce95b90b3fb3a1ec. Fiche lue sur origin/main.

## Défaut de l'avis précédent : vérifié par mutation
- `!Object.hasOwn(s.champs, nom)` remplacé par `!(nom in s.champs)` : le mutant est tué (`constructor` et `toString` issus de `JSON.parse` → `hors_contrat`). Corrigé.

## Pas de régression
- Seul le fichier de test change depuis c95f8749, avec 2 assertions ajoutées. Aucun test ni aucune assertion n'a été retiré.
- Mutations des avis antérieurs, rejouées et toutes tuées : objet non-objet → `null` ; `propositions.length < 2 ||`.
- Autres mutations, toutes tuées : `isSafeInteger` → `isFinite` ; `agent in CONTRATS` ; `choix` toujours accepté ; chiffre tranché par vote (première proposition) ; liste non tableau acceptée. Bilan : 8 mutations, 8 tuées.
- 15 tests passent en local (`contrats-agents` et `gardien-sortie`, Node 22).

## Contrôles
- Fichiers : 6, tous dans `fichiers_autorises`. Taille : 171 ajouts et 3 suppressions (maximum 280).
- Journal : 7 lignes, commence par `# Journal L21-T17`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives.

## Remarques
- CI au SHA de tête : `tests` et `verifier` sont rouges. Ce n'est pas le fait de la PR. Seul `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`) échoue, et il échoue aussi en local sur `origin/main`. La PR ne touche pas ce fichier. Les 7 autres jobs sont verts.
- Fiche sensible : fusion par Will seul. Pas de fusion par le relecteur.
