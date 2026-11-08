VERDICT: OK
SHA relu: 430581f7f63b05207863959adf6e4c0219401c99
PR: #866, branche pilotage/L09-T26, fiche L09-T26 (seconde relecture, après l'avis relec64-g01-866 à A CORRIGER)

## Suivi de l'avis précédent
- Défaut 1 (`effet_debut` impossible à remplir) : corrigé. Le tableau « Dates et statut par clé » donne `effet_debut` et `effet_fin` pour les 15 clés. « 2026 » donne 2026-01-01 → 2027-01-01, « 2026 à 2028 » donne 2026-01-01 → 2029-01-01, et « jusqu'au 31/12/2026 » donne une fin 2027-01-01. Une règle couvre les lignes « en vigueur » : date 2026-01-01, `a_verifier`, avec une note qui interdit de la présenter comme date légale. Chaque clé a une seule période, sans chevauchement : `verifierFrontieres` (`frontieres.ts`) attend `parametre_absent` à la veille du premier `effet_debut`, donc `frontieres-sans-ecart` peut s'écrire sans interprétation.
- Défaut 2 (fin incluse ou exclue) : corrigé. La règle de la spec est réécrite : la spec donne une fin INCLUSE, le code stocke le lendemain avec une fin EXCLUE, `effet_debut` ≤ date < `effet_fin`, comme dans `au-jour.ts`. Le test `exigibilite-fin-exclue` (31/12/2026 lu, 01/01/2027 `parametre_absent`) est cohérent avec `effet_fin` 2027-01-01.
- Défaut 3 (règle de statut ambiguë) : corrigé. Le statut est donné ligne par ligne, et l'étape 2 dit que ce tableau l'emporte sur toute autre phrase. Chaque ligne suit la règle annoncée : « à vérifier », lecture B absente ou URL incomplète donnent `a_verifier` ; « concordant » donne `non_verifie`. Aucune ligne n'est `valide`.
- Défaut 4 (URL incomplètes) : corrigé. Chaque lecture A porte une URL `https://` sur un domaine de `DOMAINES_OFFICIELS` (`source.ts`). Quand la spec ne donne pas le chemin exact, la fiche cite une page générale marquée « page connue » et la ligne est `a_verifier` (motif « URL incomplète » ou « lien de l'article absent »). Ces URL passent `domaineOfficiel`.
- Remarque sur le format de `reel_simplifie.plafond` : traitée. Les formats JSON sont donnés (`{ ventes, autres }`, `{ base, majore }` et les quatre champs pour avocats et auteurs).

## Point d'attention : LEGITEXT000006069577
D'après mes connaissances, `https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577` est bien l'identifiant du Code général des impôts sur Légifrance. Je n'ai pas pu le vérifier en ligne : le proxy du cloud refuse legifrance.gouv.fr, economie.gouv.fr et bofip.impots.gouv.fr (403). Je juge l'URL acceptable et je ne demande pas de la retirer, pour quatre raisons :
- elle est sur un domaine permis ;
- elle est présentée comme « page connue ; lien de l'article non donné par la spec » ;
- les deux lignes qui l'utilisent (`tva.exigibilite.*`) sont `a_verifier` ;
- l'article (269, 2 c et 2 a) est cité à côté.

En revanche, l'auteur doit écrire l'article dans `source_titre` (par exemple « CGI, art. 269, 2 c ») et ne pas présenter cette page comme le lien de l'article. La vérification PAR-006 devra ouvrir la page, confirmer l'identifiant et le remplacer par le lien LEGIARTI de l'article. Les pages générales https://www.economie.gouv.fr/entreprises et https://bofip.impots.gouv.fr/ sont acceptables aux mêmes conditions.

## Contrôles passés
- Un seul fichier modifié (`git diff origin/main...`) : `pilotage/fiches/L09-T26.md`, +44 / -1. Il est dans `fichiers_autorises` et sous `taille_max_lignes` (300). Le front matter et les 7 tests nommés n'ont pas changé.
- `garde:fiches` (887 fiches cohérentes), `garde:textes` et `garde:fictif` passent au vert sur 430581f. Aucun octet NUL.
- Aucun mot interdit, aucun prix de produit (les montants sont des seuils légaux), aucun secret, aucune donnée réelle. Les valeurs de la spec n'ont pas été modifiées par la correction : seules les URL et la colonne de la décision changent.

## Remarques (non bloquantes)
- `alerte.seuil_pct` : la colonne « État proposé » du premier tableau dit encore `non_verifie`, alors que le tableau de décision dit `a_verifier`. La règle de priorité tranche, mais il faudrait aligner les deux à l'occasion.
- Sens des statuts : `statutCalcule` (`lectures.ts:89-93`) rend `non_verifie` sans aucune lecture et `a_verifier` dès qu'une lecture existe. Donner `non_verifie` aux lignes « concordant », qui ont deux lectures, inverse cet ordre. Ce n'est pas bloquant, puisque les deux statuts s'affichent « à vérifier » et qu'aucun n'est `valide`. Le journal PAR-006 recalculera de toute façon les statuts.
- Le début fixé au 2026-01-01 pour les lignes « en vigueur » (taux, exigibilité, option pour les débits) rend `parametre_absent` pour toute date antérieure, par exemple un exercice 2025. Ce comportement est voulu (« absent = IMPOSSIBLE ») et prudent, mais il faudra le lever à la vérification.
- La fiche ne contient pas de code : ni vitest ni mutation à cette étape.
