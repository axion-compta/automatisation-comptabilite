VERDICT: OK
SHA: 93eed593236abf5486eaa39b03a2e9a65241f3a7
PR: #1052

Fiche L06-T39, SENSIBLE (schéma) : fusion par Will seul. 3e relecture, après l'avis A CORRIGER au SHA ecc80e8645723e1d92991d93959e00a0a2e85975 (commit 9be65f8 sur `avis/L06-T39`). Fiche lue sur origin/main. `pilotage/ARRET` absent.

## Suivi de l'avis précédent : les 4 corrections demandées
1. `table()` doit lire le texte sans commentaires. **CORRIGÉ.**
   - `corpsDe` retire les `--…` avant de chercher le corps de la table.
   - Mutation « commentaires gardés » (`exec(texte)`) : 1 test rouge.
2. Plus de filtre silencieux : un élément non reconnu doit lever une erreur. **CORRIGÉ.**
   - Dans `analyser`, chaque élément est soit une contrainte (`CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK` suivi de `\b`), soit une colonne `/^"?([A-Za-z_][A-Za-z0-9_]*)"?\s/`. Sinon il lève `élément non reconnu`.
   - Mutation « `throw` remplacé par `continue` » : 3 tests rouges (`lève une erreur : …`).
3. Filtre des noms secrets insensible à la casse. **FAIT** (`SECRET = /…/i`).
4. Assertion qui rougit sur L1, L2 et L3. **CORRIGÉ.** Mutations appliquées au vrai `092-securite.sql`, dans `a_compta.jeton_integration` :
   - L1 `token2 text,` : 2 tests rouges ;
   - L2 `"Token" text,` : 2 tests rouges ;
   - L3 `-- note` puis `api_token text,` : 2 tests rouges ;
   - en plus : `API_TOKEN text,`, `reference_coffre2 text,`, et `password_hash text, -- x` dans `personne`. Tous rougissent.
   - Le fichier SQL a été restauré après chaque mutation.

## Contrôles
- `migration-securite.test.ts` : 17 tests verts (Node 22, `engine_strict=false`). `tsc --noEmit` dans `apps/serveur` passe sans message.
- 4 fichiers, tous dans `fichiers_autorises`. Taille : 131 + 57 + 1/1 + 7, soit 198 lignes sur 300. Aucune ligne « - - ».
- Le SQL est inchangé depuis la relecture précédente : `IF NOT EXISTS` partout ; aucun déclencheur, `DROP`, `GRANT` ni `SECURITY DEFINER` ; clés étrangères composées avec `societe_id`.
- Aucun mot interdit, aucun prix, aucun secret, aucun octet NUL. Journal : 7 lignes, commence par `# Journal L06-T39`.
- CI au SHA de tête : les 9 jobs sont verts.

## Remarques (non bloquantes)
- Retirer le `/i` de `SECRET` laisse les 17 tests verts. La comparaison stricte `colonnes(t)` = `ATTENDUES[t]` attrape déjà toute colonne en trop, donc le `/i` sert de seconde défense. Il n'est pas tenu par un test : les cas `rougit : …` vérifient `colonnes`, pas `secretsDans`.
- `analyser` bascule le même indicateur pour `'` et `"`. Un littéral qui mêle les deux (`'a"b'`) fausserait le découpage. Ce cas est absent du SQL actuel.
