VERDICT: OK
SHA de tête relu : b658c71469540f71830d6f837aaa2177b67f0b9c (PR n°1204, fiche L22-T13, sensible : fusion par Will seul)

## Contrôles
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises`. Taille : 197 lignes (max 200).
- Tests : `production.test.ts` (7 tests nommés de la fiche) 7/7 verts ; `declarations.test.ts` (textes) 6/6 verts.
- `tsc --noEmit` (noyau et textes) vert ; `pnpm verifier` : lint, tests (861 fichiers, 7980 tests), gardes verts ; l'étape « types » échoue en local pour le seul Node 22 du cloud. CI de la PR entièrement verte.
- Ordre des refus respecté (SIREN puis chaîne), testé. Le noyau ne lit ni horloge ni stockage : la chaîne arrive en argument.
- Mutations à la main (8) : retrait des ancres `^…$` du SIREN, retrait du refus `chaine_rompue`, `travail: true`, retrait de `controlerDatesExercice`, de `controlerEquilibre`, des écarts de structure : toutes tuées.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives (SIREN de banc). Journal : 7 lignes.

## Remarques (non bloquantes)
- Deux mutations survivent, quasi équivalentes sur les jeux actuels : `nombreLignes: brut.lignes.length` → `lu.lignes.length`, et `marqueOrdreAcceptee: profil.fichier.marqueOrdreOctets` → `true` (aucun jeu ne produit de marque d'ordre des octets). Un cas avec `marqueOrdreOctets: true` les fermerait.
- Le test importe `textes` par chemin relatif depuis le noyau (`../../../../textes/src/...`) : précédents existants sur main (`export-complet/__tests__/lisezmoi.test.ts`, `profil/__tests__/banc/banc-1.test.ts`), lint et gardes verts.
- `LIMITE_ECARTS_PAR_REGLE = 20` est une limite d'affichage, pas une valeur légale.
