VERDICT: A CORRIGER
SHA relu : 9da5d09cf969847c70f7ca41d2740dc310e4a313
PR : #874, fiche L09-T26 (sensible : fusion par Will seul)

## Ce qui est exact
- Périmètre : 4 fichiers autorisés ; 242 lignes ajoutées (plafond 300).
- Valeurs relues ligne par ligne contre le tableau de la fiche : toutes exactes. Taux 2000/1000/550/210 pb ; franchise ventes 8 500 000 / 9 350 000, services 3 750 000 / 4 125 000, avocats-auteurs 5 000 000 / 5 500 000 / 3 500 000 / 3 850 000 ; micro 20 310 000 et 8 360 000 ; réel simplifié 94 500 000 / 28 600 000 centimes ; alerte 9000 pb.
- Dates : `effet_debut` 2026-01-01 partout ; `effet_fin` null pour les taux, l'option pour les débits et l'alerte ; 2027-01-01 pour la franchise et l'exigibilité ; 2029-01-01 pour micro et réel simplifié. Les statuts des 15 lignes sont ceux du tableau « Dates et statut par clé » ; aucune ligne `valide` ; la note « date de début non donnée » est présente sur les 7 lignes concernées. URL de la lecture A exactes ; `alerte.seuil_pct` a une URL vide et le titre « réglage du produit ».
- Codes de règle compatibles avec main : `premier_jour_mois_suivant` (profil/fiscal/exigibilite.ts), `joursAnnee` (franchise-seuils.ts).
- 7 tests nommés verts ; `node scripts/verifier.mjs` vert (24 étapes). Aucun mot interdit ni prix.

## Défauts à corriger
1. packages/parametres/src/catalogue/__tests__/tva-micro.test.ts (tests 30-38 et 91-97) : sur une fiche sensible, les dates, les statuts et les URL ne sont pas verrouillés ligne par ligne. Ces mutations faites à la main ne rougissent aucun test :
   - tva-micro.ts:13 `FIN_2028` '2029-01-01' → '2028-12-31' (fin des plafonds micro et réel simplifié) ;
   - tva-micro.ts:11 `DEBUT` '2026-01-01' → '2025-01-01' (début de toutes les lignes) ;
   - statut de `tva.franchise.prorata_creation` `a_verifier` → `non_verifie` ;
   - tva-micro.ts:120, URL A18813 → A18814 ;
   - tva-micro.ts:67, `source_maj` 2026-05-13 → 2026-05-14.
   Correction demandée : ajouter dans le test une table écrite à la main, recopiée de la fiche et non du code, qui donne pour chacune des 15 clés `effet_debut`, `effet_fin`, `statut`, `source_url` (et `source_maj` attendu). La comparer à chaque ligne du catalogue, puis vérifier que chacune des mutations ci-dessus rougit et le noter au journal.

## Remarques (non bloquantes, à trancher au passage)
- tva-micro.ts:67 : `source_maj` 2026-05-13 est appliqué aussi à `micro.plafond.services`, alors que la fiche ne cite « vérifié le » que pour `micro.plafond.ventes`. À l'inverse, `tva.franchise.seuil.services` reçoit null (tva-micro.ts:58). Il faut choisir une seule règle : soit la recopie stricte (null pour services), soit la même page donne la même date, et l'appliquer aux deux.
- tva-micro.ts:85 : la valeur de `tva.exigibilite.services` est `'encaissement'`, alors que la spec dit « encaissement ; débits sur option ». Le renvoi à l'option peut être ajouté à `source`.
- Hypothèse `finIncluse: true` pour le prorata de création : elle est notée au journal ; à confirmer à la vérification.
