VERDICT: OK
PR n°1182, tête ea474d9ea012da8d95b1786eb760cedc3614c21e (fiche lue sur origin/main).

Vérifié :
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille 160 lignes pour un maximum de 160 (pile à la limite).
- `node --test outils/gardes/test/mode-deploiement.test.mjs` : 6/6, les 6 noms de la fiche. `node outils/gardes/mode-deploiement.mjs` : vert, code 0.
- Mutations tuées : opérateur `[!=]=` réduit à `===`/`!==` seuls, conservation des sauts de ligne dans `/* */`, exclusion `node_modules`, préfixe membre `[\w.$?]*` des règles inverses.
- Faux positifs testés (`hebergement`, `installation-paquet`, `modeDeploiementActif`). Aucun mot interdit, aucun secret, aucun octet NUL. Fiche sensible (garde) : fusion par Will seul.

Remarques (non bloquantes) :
1. `outils/gardes/mode-deploiement.mjs:31-33` : 4 mutants survivent dans `sansCommentaires` (échappement `\` dans une chaîne, chaîne arrêtée au saut de ligne, `/*` non fermé, préfixe `[\w.]*` de la règle `case`). L'analyseur ne blanchit que les commentaires : ces mutants donnent au pire des faux positifs (garde rouge, visible), jamais un oubli. Suggestion : un test `const a = 'l\'x'; // modeDeploiement === 1` → 0 problème, et un autre `<p>l'adresse</p>` puis `// modeDeploiement === 1` à la ligne suivante → 0 problème.
2. Faux négatif connu : un littéral d'expression régulière contenant `//` (ex. `/\/\//`) est lu comme un commentaire et masque la suite de la ligne.
3. `switch (m) { case 'installation': }` n'est pas détecté. La fiche ne l'exige pas (littéraux seulement avec `===`, `!==`, `==`, `!=`), mais c'est une branche par mode : à envisager dans une fiche ultérieure.
4. `FICHIER_REGLAGE` désigne un fichier qui n'existe pas encore (indiqué dans le journal). À aligner quand le réglage sera créé.
