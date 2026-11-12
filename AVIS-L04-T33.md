VERDICT: OK
SHA: fb9bee3e85565e6fe3ded3c40f665605d91f2317
PR: #1058

Fiche L04-T33, 4e relecture. Elle fait suite à l'avis A CORRIGER au SHA 0b13e10d24f748711bca5e045e6b3ce84f5d214d (commit 35b071a sur `avis/L04-T33`, publié aussi en commentaire le 2026-11-12T00:06Z). Fiche lue sur origin/main. `pilotage/ARRET` absent.

## Suivi de l'avis précédent (chaque défaut vérifié par mutation)
1. Partie `fichiers[...]` invalide ignorée au lieu d'un 400 : **CORRIGÉ**.
   - `depot.ts` a une nouvelle fonction, `fichiersOrpc` : toute partie `fichiers[<seg>]` dont le segment n'est ni un indice sans zéro de tête ni `[]` renvoie null.
   - Les cas demandés sont dans le tableau commun `suite-depot.ts:39-46`, joué sur le vrai serveur et sur le faux : `['fichiers[0]','fichiers[01]']` → 400, `['fichiers[0]','fichiers[00]']` → 400, `['fichiers[0]','fichiers[10000]']` → 400.
   - Mutation « segment invalide ignoré » (`continue` au lieu de `return null`) : rouge.
   - Mutation « zéro de tête accepté » (`/^(0|[1-9]\d*)$/` → `/^\d+$/`) : rouge.
   - La borne 9999 n'est plus dans le code. Un indice au-delà de 20 donne un tableau creux, que le schéma du contrat refuse. Elle n'a donc plus d'effet observable, et le cas `fichiers[0]`+`fichiers[9999]` → 400 la couvre.
2. `fichiers` nu placé avant des crochets : **CORRIGÉ**.
   - `fichiersOrpc` repart d'un tableau vide quand la valeur précédente n'est pas un tableau, ce qui reproduit l'ordre d'arrivée d'oRPC.
   - Les cas `['fichiers','fichiers[0]']` et `['fichiers','fichiers[]']` attendent `200` avec **1** résultat. Le test compare maintenant aussi le nombre de résultats.
   - Mutation « le nu est gardé » (`[val]` au lieu de `[]`) : rouge.
3. Maximum de fichiers du contrat : **CORRIGÉ**.
   - Le corps est validé par `deposerPieces['~orpc'].inputSchema.shape.body`, sans « 20 » en dur. Le canal est vérifié par le même schéma.
   - Cas communs : 20 fichiers → 200 avec 20 résultats, 21 fichiers → 400.
   - Mutation « troncature à 20 » : rouge.

## Contrôles
- `commun-depot.test.ts` : 21 tests verts (Node 22, `engine_strict=false`). `tsc --noEmit` dans `packages/faux-serveur` passe sans message.
- Toutes les mutations ont été annulées et l'arbre est propre.
- 6 fichiers, tous dans `fichiers_autorises`. Taille : 70 + 104 + 62 + 2/1 + 1/1 + 7, soit 248 lignes sur 250. Aucune ligne « - - ».
- Aucun mot interdit, aucun prix, aucun secret, aucun octet NUL. Données fictives (`exemple.fr`, `cle-fictive-*`). Pas d'alias d'import de `it`/`test`.
- Journal : 7 lignes, commence par `# Journal L04-T33`.
- CI au SHA de tête : les 9 jobs sont verts (verifier, gardes, tests, lint, types, e2e, gitleaks, licences, stryker).

## Remarques (non bloquantes)
- Une partie texte (non fichier) nommée `fichiers[0]` est maintenant transmise au schéma, qui la refuse (400). C'est cohérent avec la validation zod du vrai serveur, mais aucun cas commun ne la couvre.
- Pour un 400, le vrai serveur renvoie `data.issues`, le faux non (remarque reprise).
- Budget presque atteint (248 sur 250) : toute retouche future devra remplacer des lignes, pas en ajouter.
