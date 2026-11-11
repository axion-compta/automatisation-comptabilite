VERDICT: A CORRIGER
SHA relu : d4a41c0f1292f8c38d72b2f57deccd6fb1a16840

PR 991, fiche L03-T58 (sensible, IA). Relecture Opus du 11/11/2026. Le SHA de tête est passé de d79fe23 à d4a41c0 pendant la relecture (correction d'une erreur eslint `_tentative` inutilisée) ; c'est d4a41c0 qui est relu.

Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 260 lignes (plafond 300). Les 10 tests nommés sont présents et verts en local ; tsc et eslint propres. Mutations faites à la main (3e essai autorisé, garde `aucune_ecriture_citee` coupée, identifiant d'écriture dans l'entrée, `break` remplacé par `continue` après une exception, `retablir` retiré) : toutes tuées. Mots interdits, prix, secrets : rien trouvé. Données fictives.

## Défaut bloquant
1. `packages/noyau/src/declarations/explication.ts:87` : `t.split(c.code).join(' ')` retire le code de la case partout, y compris à l'intérieur d'un nombre. Les codes de ligne viennent de la table du millésime, et ce sont souvent des chiffres seuls (par exemple « 08 »). Dans ce cas, un nombre inventé formé uniquement de répétitions du code passe la vérification. Sonde : case `08`, texte « La ligne 08 vaut 0808 euros, voir {{ref:e1.montant}}. » donne `ok: true`. Cela viole la règle de la fiche « Aucun montant ne vient du modèle : tout chiffre passe par {{ref:…}} ». Correction : n'exempter le code que s'il forme un mot entier (par exemple `(?<![\p{L}\p{N}])` + code échappé + `(?![\p{L}\p{N}])`, avec le drapeau `u`), puis ajouter un cas à `chiffre-invente-rejete` avec un code numérique (`08` et le texte `0808`, attendu `chiffre_hors_reference`).

## Remarques (non bloquantes)
- `preparerEntree` envoie les libellés tels que `pseudonymiser` les rend : un chiffre présent dans un libellé (sonde : « Acompte 1500 euros ») arrive en clair dans l'entrée du modèle. La fiche l'admet (« libellés passés par `pseudonymiser` »), mais l'interdit « ni montant en clair » est alors contourné par le libellé. À trancher dans une fiche de suite (masquer les nombres des libellés ?).
- `explication.ts:104` : `if (tentative === undefined) break;` est du code mort, ajouté seulement pour faire taire eslint. Une boucle `for (let essai = 0; essai < 2; essai++)` ou `for (const _ of …)` selon la règle de lint serait plus claire.
- `preparerEntree` renvoie un champ `etapes` en plus de la signature de la fiche : c'est acceptable.
- CI de ce SHA : gardes et stryker verts, les autres tâches encore en attente au moment de la relecture.
