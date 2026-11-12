VERDICT: OK

PR #1099, L10-T38, première relecture, au SHA de tête d766d6bdf1ad1c7e487d059d8d251ef7620d7065.

## Contrôles
- Périmètre : les 6 fichiers modifiés sont dans `fichiers_autorises`. Taille : 126 ajouts et 2 suppressions, soit 128 lignes pour 160 au maximum, sans aucune ligne « - - ».
- Dépendances L10-T36 et L10-T37 : `statut: fait` sur main.
- `domaines/clients.ts` : le handler MSW de `GET /clients/:code` appelle le même `creerServiceClients` que le vrai serveur et renvoie 404 `CLIENT_INCONNU` pour un client inconnu. `registres/lot-10.ts` : le handler est ajouté après les ventes, aucun autre registre n'est touché.
- `suite-clients.ts` couvre la fiche et le solde (solde égal à la somme des restes dus), les factures ouvertes seulement, un délai moyen entier ≥ 0 ou null, et le 404. La suite est jouée sur le vrai serveur (Fastify) et sur le faux (MSW), et un test vérifie que les deux serveurs rendent les mêmes réponses.
- Aucune valeur légale en dur, aucun prix, aucun mot interdit, uniquement des données fictives (hôte exemple.fr). Le journal fait 6 lignes et commence par `# Journal L10-T38`.
- Tests ciblés (`commun-clients.test.ts` et `registres.test.ts`) : 16 sur 16 verts, sur la branche et sur sa fusion avec main e23fe5d6ca98ec27360fc0d581fcc94efc7f0788. La fusion se fait sans conflit.
- CI au SHA de tête : les 9 jobs sont verts (`gardes` compris).

## Mutations (le test rougit à chaque fois, puis la mutation est annulée)
- Statut 404 remplacé par 400 : 2 tests échouent.
- `soldeCentimes + 1` dans la réponse du faux : 2 tests échouent.
- Profil `vide` dans le service du faux : 4 tests échouent.
- Handler retiré du registre du lot 10 : 5 tests échouent.
- Code passé en minuscules avant la lecture : 4 tests échouent.

## Remarques (non bloquantes)
- `commun-clients.test.ts`, test `memes-reponses-vrai-et-faux` : `fermer()` n'est pas dans un `finally`. Si une assertion échoue, l'app Fastify reste ouverte jusqu'à la fin du fichier.
- Pour le 404, la comparaison entre les deux serveurs porte sur le statut et le code seulement : le faux ajoute `data: {}`, et `handlers.ts` est hors périmètre. Ce point est noté au journal.
