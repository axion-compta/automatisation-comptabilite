VERDICT: OK
SHA relu: bb8c2879643b6a2523158655e693bddd284e0c6b
PR: #868, branche pilotage/L09-T45, fiche L09-T45

## Contrôles passés
- Un seul fichier modifié : `pilotage/fiches/L09-T45.md` (+21, -0), dans `fichiers_autorises`.
- Front matter inchangé : 15 champs, tableaux JSON valides, aucun guillemet double ajouté, aucun octet NUL.
- `garde:fiches`, `garde:textes` et `garde:fictif` au vert. Aucun mot interdit, aucun prix de produit, aucun secret. Sociétés et personnes inventées (Lemoine Rénovation, Atelier Bertin), SIREN de test.
- Chiffres recalculés :
  - SIREN : 123456782 passe la clé de Luhn et 123456789 non ; 987654324 la passe aussi.
  - Clé de TVA : 123456782 mod 97 = 32, donc (12 + 3 × 32) mod 97 = 11.
  - P08 : 42 500 × 15 % + 17 500 × 25 % = 6 375 + 4 375 = 10 750 €.
  - P09 : 42 500 × 18 / 12 = 63 750 €, et l'exercice du 01/07/2026 au 31/12/2027 dure bien 18 mois.
  - P10 : 60 000 × 25 % = 15 000 €, et 60 % < 75 % rend la société non éligible.
  - P11 : 90 % × 83 600 = 75 240 € ; 90 % × 85 000 = 76 500 €.
  - P12 : 41 000 + 500 = 41 500 > 41 250.
  - P06 : les comptes 108, 1013 et 455 sont cohérents avec une EI et une SAS.
- Les valeurs de `parametres-de-test.ts` sont identiques à celles des fiches L09-T26 et L09-T27. Leur statut `valide` est limité au banc (spec §05), source et date du relevé (2026-11-06) sont citées.
- P09 n'attend aucun montant tant que l'expert n'a pas répondu, comme le prévoit le point d'attente. Le critère « 12 tests passent » reste faisable.

## Remarques (non bloquantes)
- Ligne 39 (P03, « ouverte en moins de 5 s ») et ligne 40 (P04, textes d'E45 et de « Mes déclarations ») : ces résultats relèvent de l'écran, alors que les fichiers autorisés se limitent au noyau. Il faudrait préciser que le banc vérifie seulement l'état (`saisie_personne`, `a_confirmer`, aucun montant de TVA) et que les textes d'écran sont hors de cette fiche.
- Ligne 41 (P05) : les deux dates (Kbis du 02/09/2026, Sirene du 06/11/2026) dépendent d'une règle d'ancienneté du Kbis qui n'est pas recopiée. L'auteur peut s'appuyer sur L09-T05, à citer.
