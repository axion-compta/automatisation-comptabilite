VERDICT: OK

PR #1111, fiche L16-T23, relue au SHA de tête e3f909544bdacbea0a907b7dc347a14d810f785c.
Avis d'audit V1 (dépôt privé) non accessible depuis cette session : jugé sur la fiche (origin/main) et sur l'amendement porté par la PR (6e test, renvoi à L16-T78).

## Contrôles
- Fichiers : les 4 sont dans `fichiers_autorises`. Taille : 176 + 5 = 181 lignes, pour une limite de 250.
- CI verte au SHA de tête. Localement : 6 tests nommés verts ; gardes litteraux, textes, fictif et perimetre vertes.
- Aucune valeur légale en dur : organe, documents et document de reprise viennent de l'appelant et sont « à vérifier » tant qu'ils ne sont pas confirmés. Mention `prepare_par_ia_a_faire_valider` sur chaque document ; aucun dividende pour une association ni pour une société en formation ; rien n'est signé ni déposé.
- Mutations rouges : `aVerifier` sans `documents.confirme` ; branche `immatriculee` supprimée ; filtre `!a.repris` supprimé ; refus du dividende en formation supprimé.
- Données fictives ; aucun mot interdit ; journal de 6 lignes, il commence par `# Journal L16-T23`.

## Remarques (non bloquantes)
- `packages/noyau/src/juridique/formes-particulieres.ts:57` : le refus des codes de documents en double n'est pas testé (la mutation qui retire `new Set(codes).size === codes.length` passe).
- `formes-particulieres.ts:80` : le départage par `id` à date égale n'est pas testé (la mutation passe).
- `formes-particulieres.ts:58,83` : seul `propositionDividende === true` est refusé. Une valeur vraie non booléenne venue d'un appel non typé passerait.
- `formes-particulieres.ts:76` : `2026-13-45` passe le contrôle de date (forme vérifiée, pas le calendrier).
- `voletEnFormation` reçoit un 3e argument (`parametres.documentReprise`) que la signature de la fiche n'a pas : c'est cohérent avec la règle « paramètres fournis par l'appelant ».
- Fiche sensible : fusion par Will seul.
