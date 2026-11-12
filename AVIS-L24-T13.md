VERDICT: A CORRIGER

PR n°1226, fiche L24-T13 (sensible), relue au SHA de tête e0e3b2fe4dc99feba333c27fa26bccd7f52e42c9.

## Défauts
1. `packages/noyau/src/immobilisations/registre.ts:37` : `if (saisie.base <= 0)` laisse passer `NaN`, `Infinity` et `12.5`, qui ne sont pas des entiers de centimes. `creerBien` renvoie alors un bien avec ces bases.
   Correction : `if (!Number.isSafeInteger(saisie.base) || saisie.base <= 0) throw new ErreurImmobilisation('base_invalide');`, avec un test qui couvre `NaN`, `Infinity` et `12.5`.
2. `packages/noyau/src/immobilisations/amortissement.ts:80` : le facteur `dureeEnMois(exercice.debut, exercice.fin).mois` compte les mois du calendrier touchés, même partiellement. Sur un exercice dont les dates ne tombent pas en début et fin de mois, ce que `exercices.ts:94` admet en le marquant `a_verifier`, la dotation est trop forte.
   Exemples pour 1 200,00 sur 48 mois :
   - du 2024-03-15 au 2024-12-31 : 250,00 au lieu de 240,00 au prorata des jours ;
   - du 2024-01-31 au 2024-02-01 : 50,00 pour 2 jours.
   La fiche (§À faire 3) demande « prorata en jours de détention sur jours de l'exercice ».
   Correction : soit refuser un exercice dont `aligne` est faux, avec une erreur dédiée, soit calculer sur les jours réels. Ajouter un test avec un exercice qui ne commence pas le 1er du mois.
3. `packages/noyau/src/immobilisations/__tests__/amortissement.test.ts` : le sens de l'arrondi n'est pas testé. La mutation `'demi-superieur'` → `'inferieur'` (`amortissement.ts:83`) survit.
   Correction : ajouter un cas dont la partie décimale fait au moins un demi-centime. Par exemple, une mise en service le 2025-07-03 sur l'exercice civil 2025 doit donner `14959` (30 000 × 182 / 365 = 14 958,9).
4. Même fichier de test : les dates d'exercice inversées ne sont pas testées. La mutation qui retire `exercice.fin < exercice.debut` (`amortissement.ts:68`) survit.
   Correction : vérifier que `{ debut: '2025-12-31', fin: '2025-01-01' }` donne `date_invalide`.

## Vérifié sans défaut
- Les 5 fichiers modifiés sont tous dans `fichiers_autorises`. Le diff fait 233 lignes, sous le maximum de 250. Rien dans `.github/`, aucune dépendance, aucun octet NUL. La fiche ne change que par `statut`.
- Les 6 tests nommés passent (6 sur 6). Aucun test n'a été supprimé.
- Cas chiffrés recalculés :
  - 300,00 pour une année pleine ;
  - 151,23 pour une mise en service le 1er juillet 2025 (184 / 365) ;
  - 150,82 pour une mise en service le 1er juillet 2024, année bissextile (184 / 366).
- Mutations tuées :
  - prorata à ±1 jour ;
  - terrain ;
  - fin de plan décalée d'un jour ;
  - plafond au reste à amortir ;
  - compte 6811 et préfixe 28 ;
  - statut brouillon ;
  - durée 0 ;
  - nombre de mois remplacé par 12.
- Aucun mot interdit, aucun prix, aucun secret, données fictives. Le journal fait 5 lignes avec le bon en-tête.

## Remarques (non bloquantes)
- `dotationExercice` fait confiance au `cumulAnterieur` que lui passe l'appelant. Avec un cumul à 0, un bien déjà amorti en totalité recevrait encore toute sa base. À documenter, ou à recouper avec le registre dans une fiche suivante.
- La taille après corrections doit rester sous 250 lignes : il reste 17 lignes de marge.
