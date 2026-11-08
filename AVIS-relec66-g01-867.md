VERDICT: OK
SHA relu: 504963dc781afbc2842734e2f0ec3ba49e854752
PR: #867, branche pilotage/L09-T27, fiche L09-T27 (seconde relecture, après l'avis relec64-g01-867 à A CORRIGER)

## Suivi de l'avis précédent
- Défaut 1 (`effet_debut` impossible à remplir) : corrigé. Le tableau « Dates et statut par clé » donne `effet_debut` et `effet_fin` pour les 13 clés, et deux lignes pour `tva.franchise.mention`. « Exercices clos depuis le 31/12/2022 » donne 2022-12-31. « Exercices ouverts depuis le 01/01/2024 » donne 2024-01-01. Les lignes « sans date » ou « en vigueur » prennent 2026-01-01, `a_verifier`, avec la note qui interdit de présenter cette date comme légale. Les deux lignes de la mention se suivent sans trou : CGI jusqu'à 2027-01-01 exclu, puis CIBS à partir de 2027-01-01. Le test `mention-par-date-p21` (31/12/2026 CGI ; 01/01/2027 et 02/01/2027 CIBS `a_verifier`) et `frontieres-sans-ecart` sont donc écrits sans interprétation.
- Défaut 2 (règle de statut ambiguë) : corrigé. Le statut est donné ligne par ligne, et l'étape 2 dit que ce tableau l'emporte sur toute autre phrase. Chaque ligne suit la règle annoncée :
  - « concordant » donne `non_verifie` (les cinq lignes `is.*`) ;
  - « à vérifier », date de début absente ou URL incomplète donnent `a_verifier`.

  La mention du CIBS reste `a_verifier`, comme l'exigent les « Pièges » (L. 233-3 contre L. 223-3). Aucune ligne n'est `valide`.
- Défaut 3 (URL incomplètes) : corrigé. Chaque lecture A porte une URL `https://` sur un domaine de `DOMAINES_OFFICIELS` (`source.ts`). Pour `facture_electronique.*` (https://www.economie.gouv.fr/) et `references.cibs` (page du CGI sur Légifrance), la fiche cite une page générale marquée « page connue », et ces lignes sont `a_verifier` avec le motif « URL incomplète ». La lecture A de `tva.franchise.mention` donne maintenant une URL par mention.
- Remarques traitées : « (pour mémoire, non codé) » est ajouté à `is.plafond.prorata`, et `recouvrement.indemnite` est stockée en centimes (4 000) à l'étape 2.

## Point d'attention : LEGITEXT000006069577
`references.cibs` utilise https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577. D'après mes connaissances, c'est bien l'identifiant du Code général des impôts sur Légifrance. Je n'ai pas pu le vérifier en ligne : le proxy du cloud refuse legifrance.gouv.fr (403). Je juge l'URL acceptable et je ne demande pas de la retirer, pour trois raisons :
- elle est sur un domaine permis ;
- elle est marquée « page connue ; lien des articles non donné par la spec » ;
- la ligne est `a_verifier`.

L'auteur doit citer les articles dans `source_titre`. La vérification PAR-006 devra confirmer l'identifiant et le remplacer par le lien de l'article ou de l'ordonnance. La page https://www.economie.gouv.fr/ est acceptable aux mêmes conditions.

## Contrôles passés
- Un seul fichier modifié (`git diff origin/main...`) : `pilotage/fiches/L09-T27.md`, +38 / -1. Il est dans `fichiers_autorises` et sous `taille_max_lignes` (300). Le front matter et les 8 tests nommés n'ont pas changé.
- `garde:fiches` (887 fiches cohérentes), `garde:textes` et `garde:fictif` passent au vert sur 504963d. Aucun octet NUL.
- Aucun mot interdit, aucun secret, aucune donnée réelle. Les 40 € de l'indemnité sont un montant légal et non un prix de produit. Les valeurs de la spec n'ont pas été modifiées par la correction.

## Remarques (non bloquantes)
- Le titre et la ligne d'en-tête disent « tous « à vérifier » », alors que les cinq lignes `is.*` sont maintenant `non_verifie`. L'affichage reste « à vérifier » (règle « non vérifié = visible »), donc ce n'est pas bloquant.
- Sens des statuts : `statutCalcule` (`lectures.ts:89-93`) rend `non_verifie` sans aucune lecture et `a_verifier` dès qu'une lecture existe. Donner `non_verifie` aux lignes « concordant » inverse cet ordre. Même remarque que pour L09-T26 : le journal PAR-006 recalculera de toute façon les statuts.
- Le début fixé au 2026-01-01 pour la mention du CGI, l'indemnité et `is.plafond.prorata` rend `parametre_absent` pour une facture ou un exercice antérieur à 2026. Ce comportement est prudent et voulu, mais il faudra le lever à la vérification.
- La fiche ne contient pas de code : ni vitest ni mutation à cette étape.
