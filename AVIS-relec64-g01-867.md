VERDICT: A CORRIGER
SHA relu: 88b31f13e04b7ad44954fb6a2843edf0921b5d98
PR: #867, branche pilotage/L09-T27, fiche L09-T27

## Contrôles passés
- Un seul fichier modifié : `pilotage/fiches/L09-T27.md` (+22, -0), dans `fichiers_autorises`.
- Front matter inchangé : 15 champs, tableaux JSON valides, aucun guillemet double ajouté, aucun octet NUL.
- `garde:fiches`, `garde:textes` et `garde:fictif` au vert. Aucun mot interdit, aucun secret, aucune donnée réelle. Les 40 € de `recouvrement.indemnite` sont une indemnité légale et non un prix de produit.
- Chaque valeur porte sa mention d'état et sa date de lecture. La cohérence interne tient :
  - 42 500 € / 15 % / 25 % / 75 % sont identiques à L09-T45 ;
  - la mention CGI vaut jusqu'au 31/12/2026, puis le CIBS s'applique au 01/01/2027, comme pour `references.cibs` et le cas P21 ;
  - la tolérance du 30/06/2028 rejoint le « Hors périmètre » ;
  - L. 233-3 est retenu et L. 223-3 signalé, avec le statut `a_verifier`, comme le demandent les « Pièges » ;
  - les seuils en « 2 critères sur 3 » donnent `criteres` = 2, compatible avec `seuils-json-valides` ;
  - 75 % donne 7 500 points de base.

## Défauts
1. Lignes 43, 46, 47 et 48 : `effet_debut` ne peut pas être rempli. `au-jour.ts:17` l'exige non nul. Or `is.plafond.prorata` et les deux lignes `facture_electronique.*` disent « sans date », et `recouvrement.indemnite` dit « en vigueur ». Les lignes 38 à 42 (« exercices clos depuis le 31/12/2022 ») et 44 à 45 (« exercices ouverts depuis le 01/01/2024 ») donnent une condition sur l'exercice et non une date d'effet : il faut dire si `effet_debut` vaut 2022-12-31 ou 2024-01-01. Correction demandée : donner la date de début de chaque ligne, ou la règle à appliquer quand la spec n'en donne pas.
2. Lignes 24 et 34 : la règle de statut est ambiguë. « `a_verifier` ou `non_verifie` selon la spec » d'un côté, « Statut à l'entrée en base : `non_verifie` … l'état proposé reste « à vérifier » ou « concordant » » de l'autre : l'auteur ne sait pas quoi écrire dans `statut` pour une ligne « concordant ». Seul `tva.franchise.mention` est fixé (`a_verifier`, par le test `mention-par-date-p21`). Correction demandée : donner le statut attendu ligne par ligne.
3. Lignes 47 à 49 : il manque des URL complètes alors que `source_url` doit être une URL `https:` sur un domaine permis. La lecture A de `facture_electronique.*` est « economie.gouv.fr « Tout savoir … » » sans chemin, et celle de `references.cibs` « legifrance.gouv.fr » sans chemin. L'auteur ne voit pas la spec privée. Correction demandée : recopier l'URL complète.

## Remarques (non bloquantes)
- Ligne 43 : la valeur commence par « plafond × mois / 12 si l'exercice ≠ 12 mois », ce qui pourrait se lire comme un calcul à coder, alors que « À faire » impose `{ "regle": "par_periode_d_imposition", "a_verifier": true }` sans aucun montant. Ajouter « (pour mémoire, non codé) » éviterait la confusion.
- Ligne 46 : la valeur « 40 € par facture » est à stocker en centimes (4 000) ; le rappeler à côté des seuils.
- Je ne me prononce pas sur l'exactitude des valeurs légales, qui reste à vérifier sur les sources. Elles sont cohérentes avec leur mention et leur date.
