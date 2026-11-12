VERDICT: OK

PR #1142 « L20-T05 Opérations juridiques détectées et refus du chat de rédiger l'acte », relue au SHA de tête 316786ee6d1b6139d4f30eb52ab0c7ddef9b582c.
Relecteur Opus, consigne LOT5 section R.

## Contrôles
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises`. Diff de +128 −4, sous `taille_max_lignes` (230), aucune ligne « - - ».
- Les 5 tests nommés sont présents. Aucun test existant de `refus.test.ts` n'est retiré.
- En local, `src/juridique` et `src/chat` donnent 260 tests verts, et `tsc --noEmit` passe sur le noyau.
- `refusFixe` n'est appelé hors des tests nulle part dans le dépôt. Élargir `Refus.motif` à `MotifRefusChat` ne casse donc aucun appelant.
- La table des indices est passée en argument : aucun libellé ni compte en dur dans le noyau.
- Aucun mot interdit, aucun prix, aucun secret. Journal : 6 lignes, commence par `# Journal L20-T05`.
- CI : tous les jobs sont verts (verifier, tests, types, lint, gardes, e2e, stryker, gitleaks, licences).

## Mutations faites à la main
- Libellé de l'indice non mis en minuscules : tué.
- `startsWith` remplacé par `includes` : tué.
- Dédoublonnage et tri retirés : tué.
- Levée par l'acte déposé retirée : tué.
- Filtre des libellés vides retiré : tué.
- Ligne `acte_juridique` de `refusFixe` retirée : tué.
- `l.trim()` retiré sur les libellés de la table : le mutant survit (voir Remarques).

## Remarques (non bloquantes)
- `packages/noyau/src/juridique/operations.ts:32` : aucun test ne couvre un libellé de table entouré d'espaces ou écrit en majuscules, comme `' Cession de parts '`. L'ajouter dans `indices-banque-et-pieces` tuerait le mutant.
- Le motif `acte_juridique` n'est pas encore dans `MOTIFS_REFUS` (`chat/types.ts`) et n'a pas de texte e25. C'est hors périmètre et signalé au journal ; il faudra une fiche ultérieure.
- Fiche sensible : la fusion revient à Will seul.
