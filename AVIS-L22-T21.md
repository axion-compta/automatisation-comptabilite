VERDICT: OK

PR #1180, fiche L22-T21, tête 3ec6c812114b5b1cf6167a855ae1920d2083488d (relecteur Opus, lot 5).

## Vérifications
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises`. Taille : 105 lignes (max 150).
- Tests ciblés (documents + routes-internes-absentes) : 39/39 verts. Les 6 tests nommés sont présents.
- CI : gardes, lint, types, tests, e2e, stryker, licences, gitleaks verts (verifier en file d'attente au moment de la relecture).
- Mutations sur `FORME_VERSION_PAQUET` (historique.ts:37) : 7 mutations, toutes tuées ({0,64}, {0,62}, premier caractère élargi, ancres ^ ou $ retirées, `/` ajouté, `_` retiré).
- Aucun secret, aucun prix, aucun mot interdit, données fictives. Journal : 6 lignes, commence par `# Journal L22-T21`.

## Remarques (non bloquantes)
- `paquet.ts` ne fixe aucune forme de version (seulement non vide) : la forme retenue (64 caractères max, `[A-Za-z0-9][A-Za-z0-9._-]*`) est un choix de l'auteur, signalé dans le journal ; à confirmer par Will.
- `version-paquet-transversal.test.ts` : le jeu fictif ne produit que des FEC et des déclarations de TVA ; les documents « declaration », « etat » et « pv » sont construits dans le test. Couverture acceptable faute de générateur, à revoir si un générateur apparaît.
- `routes-internes-absentes.test.ts:27` : `\bq0[1-3]\b` ne détecte pas un identifiant collé comme `q01veille`, ni une déclaration entre guillemets doubles. Sans effet aujourd'hui (style à guillemets simples).
