VERDICT: A CORRIGER
SHA relu : 8a4e47d74fb91a27c816b1398070f81158f8c3b1 (PR #1190, fiche L25-T02)

## Vérifications
- Fichiers : les 5 fichiers modifiés sont dans `fichiers_autorises` ; `signature-paquet.ts` non modifié ; diff 259 lignes (max 260). CI : 9 jobs verts.
- 7 tests nommés + 8 tests de `signature-paquet.test.ts` passent. Clés générées dans le test, aucune clé écrite. Aucun module réseau importé. Aucun mot interdit, aucun prix, données fictives.
- Mutations tuées : contrôle `version !== paquet.version`, ancre `^…$` de `dateReelle`. Mutants équivalents (non exigés) : chacun des 3 contrôles année/mois/jour de `dateReelle` pris isolément.

## Défauts (mutations survivantes : filtre « vide » non testé)
1. `packages/parametres/src/installation-paquet.ts:37` : `cleId: z.string().min(1)` → `z.string()` survit. Un `cleId: ''` sort en `cle_inconnue` au lieu de `fichier_illisible`. Correction : ajouter au tableau `cas` de `fichier-illisible-refuse` le cas `{ ...bon, cleId: '' }`.
2. `packages/parametres/src/installation-paquet.ts:38` : `signature: z.string().min(1)` → `z.string()` survit (sort en `signature_invalide`). Correction : ajouter le cas `{ ...bon, signature: '' }`.
3. `packages/parametres/src/installation-paquet.ts:55` : `{ fatal: true }` retiré survit (le seul cas d'octets invalides n'est pas du JSON). Correction : ajouter un fichier JSON valide dont une chaîne contient un octet UTF-8 invalide (ex. remplacer un octet de la valeur `source` par `0xff`) ; attendu `fichier_illisible`.
Taille : la marge est d'une ligne ; regrouper ces cas sur une ou deux lignes du tableau `cas` (ou compacter ailleurs dans le test) pour rester sous 260, sans retirer aucun cas.

## Remarques (non bloquantes, pour Will)
- La date d'effet n'est pas couverte par la signature (octets signés fixés par L16-T29, que la fiche interdit de modifier) : un tiers peut changer `dateEffet` d'un fichier signé sans être refusé, alors que le titre de la fiche dit « signé, daté ». Défaut de fiche ; une fiche de suite est nécessaire avant tout usage de `dateEffet`.
- PR sensible (signature) : fusion par Will seul.
