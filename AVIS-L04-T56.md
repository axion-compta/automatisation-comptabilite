VERDICT: A CORRIGER

PR #1065 — fiche L04-T56 (sensible) — SHA de tête relu : c610f3521fe4423358901e9b3473853c1e2b39a4
Relecture Opus. Périmètre respecté (4 fichiers autorisés), 217 lignes ≤ 250, journal de 6 lignes commençant par « # Journal L04-T56 », aucun mot interdit, aucun prix, données fictives. Les 5 tests nommés passent localement (vitest, Node 22).
CI : run 43096859329 toujours « queued » depuis 20:34 UTC après plus d’une heure d’attente (26 runs en file sur le dépôt). Résultat de CI inconnu au moment de l’avis. Le verdict repose sur le code et ne dépend pas de la CI.

## Défauts

1. `apps/serveur/src/pieces/adaptateurs/extracteur-pdf.ts:59-70` — couleur décalée quand pdf.js fusionne plusieurs `Tj` en un seul élément. `couleursDeTexte` produit une couleur par opérateur `showText`, mais `getTextContent` regroupe les `Tj` voisins d'une même ligne. Sonde : `BT 0 0 0 rg (Total ) Tj 1 1 1 rg (cache) Tj 0 0 0 rg ( fin) Tj ET` puis `BT (Ligne2) Tj ET` donne `["Total cache fin", noir]` et `["Ligne2", blanc]` : le texte blanc sur blanc passe pour visible, et la ligne suivante, noire, devient « cachée ». C'est le cas d'usage visé par `texte-cache.ts` (texte caché inséré au milieu d'un texte visible).
   Correction demandée : ne plus apparier par rang. Par exemple, tirer texte et couleur de la même source (opérateurs `showText` avec leurs glyphes, ou `getTextContent` avec `disableCombineTextItems` et contrôle que le nombre d'éléments égale le nombre d'opérateurs, sinon couleur la plus défavorable ou erreur). Test demandé : le PDF de la sonde ci-dessus, avec « cache » blanc et « Ligne2 » noir.

2. `extracteur-pdf.ts:62-63` — calques masqués jamais détectés. Avec `includeMarkedContent`, pdf.js 6.4 renvoie `{ type: 'beginMarkedContentProps', tag: 'OC', id: null }` pour un contenu optionnel (sonde : OCG listé dans `/D /OFF`, `isVisible` rend `false` pour l'id `6R`, mais l'élément sort avec `calqueVisible: true`). La condition `typeof it.id === 'string'` est donc toujours fausse pour un calque. Correction demandée : lire les calques dans la liste d'opérations (`beginMarkedContentProps` porte `{ type: 'OCG', id }`) avec `isVisible`. Test demandé : un texte dans un OCG à OFF ressort avec `calqueVisible: false`, un texte hors calque avec `true`. La mutation `calqueVisible: true` en dur laisse aujourd'hui les 5 tests verts.

3. `extracteur-pdf.ts:68-74` — mode de rendu invisible (`3 Tr`) non traité : `BT /F1 12 Tf 3 Tr 50 700 Td (invisible) Tj ET` ressort en texte noir visible. C'est la forme la plus courante de texte caché dans un PDF. Correction demandée : suivre `setTextRenderingMode` dans `couleursDeTexte` et marquer ces éléments comme cachés (par exemple `couleur = couleurFond`, sans changer `ports.ts` ni `ElementTexte`). Test demandé : ce PDF.

4. `apps/serveur/src/pieces/adaptateurs/__tests__/extracteur-pdf.test.ts` — annotations non testées : la mutation `annotationCachee: false` en dur (ligne 82) laisse les 5 tests verts. Ajouter, dans un test nommé existant (par exemple `pdf-texte-et-positions`), une annotation `/Contents` avec `/F 2` (cachée) et une sans drapeau, avec `annotationCachee` attendu à `true` et à `false`.

## Mutations faites
- `isEvalSupported: true` → `pdf-avec-javascript-non-execute` rouge.
- couleur hexadécimale forcée à noir → `pdf-texte-et-positions` rouge.
- factur-x jamais reconnu → 2 tests rouges.
- `disableAutoFetch: false` → `aucun-appel-reseau` rouge.
- `annotationCachee` forcé à `false` → 5 verts (défaut 4).
- `calqueVisible` forcé à `true` → 5 verts (défaut 2).

## Remarques (non bloquantes)
- `fichiersIncorpores` s'appuie sur `filename` (chemin retiré par pdf.js) : un fichier nommé `dossier/factur-x.xml` est pris pour la facture. C'est acceptable, mais à documenter dans le journal.
- Avertissement pdf.js « standardFontDataUrl » à chaque police standard : sans conséquence (aucun réseau), mais `verbosity: 0` ne le coupe pas en test.
- Les annotations ont `taillePolice: 12` en dur. Pour le filtre de taille, ce n'est pas une valeur légale, mais une constante nommée serait plus claire.
