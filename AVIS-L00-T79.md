VERDICT: OK

PR #1016 (L00-T79), SHA relu : 974b2728f3d47d3850b278458e31169119205fe8 (avis précédent OK au SHA b3386ae6a6caf9c38f430fe998b33f24c778bc1e).

Relecture du delta depuis l'avis :
- 6774036d (merge de origin/main, parent main adcb8e07) : l'apport de la branche par rapport à main est identique au diff déjà relu pour les trois fichiers de code et de test et pour le journal ; seule la fiche diffère, réduite au contenu de main avec `statut: fait` (une ligne). Aucun autre fichier touché par le merge.
- 974b2728 : journal seulement, fusion des lignes « Mutation 1 » et « Mutation 2 » en une ligne ; contenu inchangé.

Contrôles :
- Fichiers modifiés (diff origin/main...tête) : les cinq fichiers autorisés seulement.
- Taille : 73 + 7 = 80 lignes, limite 80.
- Journal : 9 lignes, commence par `# Journal L00-T79`.
- Aucun mot interdit, aucun prix, données fictives.
- Tests sur la tête : exploitation-branchement 5/5, personnes-service 13/13 ; `git grep node:crypto` sur personnes-service.ts ne rend rien.
- Mutation : import `node:crypto` réintroduit dans personnes-service.ts → 1 test rouge ; annulée.

Remarques :
- Taille pile à la limite (80/80) : toute nouvelle ligne demandera une nouvelle fiche ou une coupe.
- La fiche porte `sensible: non` alors que la PR est traitée comme sensible : fusion par Will seul, comme demandé.
