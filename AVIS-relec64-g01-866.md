VERDICT: A CORRIGER
SHA relu: 29be250e4ef572c286fc5c48ca37d0c8d4e18684
PR: #866, branche pilotage/L09-T26, fiche L09-T26

## Contrôles passés
- Un seul fichier modifié : `pilotage/fiches/L09-T26.md` (+24, -0), dans `fichiers_autorises`.
- Front matter inchangé : 15 champs, tableaux JSON valides, aucun guillemet double ajouté, aucun octet NUL.
- `garde:fiches`, `garde:textes` et `garde:fictif` au vert. Aucun mot interdit, aucun prix de produit (ce sont des seuils légaux), aucun secret, aucune donnée réelle.
- Chaque valeur porte sa mention d'état (« à vérifier » ou « concordant ») et sa date de lecture, et toutes les dates (06/11/2026, vérifié le 01/01/2026, 13/05/2026, BOI de 2026) sont antérieures ou égales à `date_releve`. Les valeurs sont cohérentes entre elles : seuil majoré au-dessus du seuil de base, anciens plafonds 2025 sous les plafonds 2026, et seuils 37 500 / 41 250 / 83 600 / 90 % identiques à ceux de L09-T45.
- Les sources citées sont toutes sur les domaines de L09-T22, en dehors du réglage `alerte.seuil_pct`, qui est prévu comme exception.

## Défauts
1. Lignes 38 à 41 et 48 : `effet_debut` ne peut pas être rempli. `ParametreLegal` (`packages/parametres/src/au-jour.ts:17`) exige `effet_debut` non nul. Or les quatre taux disent seulement « en vigueur », et `tva.option_debits.effet` « sans date de fin indiquée », sans aucune date de début. L'auteur devrait donc inventer une date, ce que la consigne « recopier sans corriger » lui interdit. Correction demandée : donner la date de début de chacune de ces lignes, ou écrire la règle à appliquer quand la spec n'en donne pas (date explicite + `a_verifier`). Il faut aussi dire quelles dates prendre pour « 2026 » (2026-01-01 → 2027-01-01) et « 2026 à 2028 » (2026-01-01 → 2029-01-01), pour que `frontieres-sans-ecart` soit écrit sans interprétation.
2. Ligne 55 : « `effet_debut` ≤ date de référence ≤ `effet_fin` » prend une fin INCLUSE. Or `au-jour.ts:2` et l'étape 1 de « À faire » (« `effet_fin` 2027-01-01 exclue ») prennent une fin EXCLUE. Un auteur qui suit la ligne 55 ferait échouer `exigibilite-fin-exclue`. Correction demandée : préciser que la spec donne la date de fin incluse et que le code stocke le lendemain, avec une fin exclue.
3. Lignes 24 et 34 : la règle de statut est ambiguë. D'un côté « `a_verifier` pour toute ligne marquée « à vérifier » ». De l'autre « `non_verifie` pour une ligne à une seule lecture ». Les deux s'appliquent à `tva.franchise.prorata_creation`, `tva.franchise.seuil.avocats_auteurs`, `tva.exigibilite.acompte_bien` et `tva.option_debits.effet` (lecture B « aucune », état « à vérifier »). La ligne 34 dit en plus « Statut à l'entrée en base : `non_verifie` » pour toutes les lignes. Correction demandée : dire laquelle des deux règles l'emporte, ou mieux, donner le statut attendu ligne par ligne dans le tableau.
4. Lignes 38 à 41, 48 et 51 : plusieurs lectures A n'ont pas d'URL complète, alors que `source_url` doit être une URL `https:` sur un domaine permis (L09-T22). C'est le cas de « economie.gouv.fr, « Entreprises : … » », de « BOI-TVA-BASE-20-40-20210224 » sans domaine, et de BOI cités par leur seul identifiant. L'auteur ne voit pas la spec privée et devrait fabriquer ces URL. Correction demandée : recopier l'URL complète de chaque lecture A (comme pour F21746 et F23267).

## Remarques (non bloquantes)
- Ligne 51 : `reel_simplifie.plafond` regroupe deux valeurs (ventes, autres) sous une clé unique, sans le format JSON attendu. Le préciser, comme L09-T27 le fait pour les seuils.
- Les valeurs légales (taux, seuils de franchise, plafonds micro et réel) restent cohérentes avec leur mention « à vérifier » ou « concordant » et avec la date du relevé. Je ne me prononce pas sur leur exactitude, qui reste à vérifier sur les sources.
