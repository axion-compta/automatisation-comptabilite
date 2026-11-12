VERDICT: A CORRIGER

PR #1126 (L16-T42), SHA de tête 6fc453ec217f5dce7ae1531cb9da41b997f0a1f9 (branche lot-16/L16-T42). Relecture du 12/11/2026, CI attendue jusqu'au bout : 9/9 verte sur ce SHA.

Ce qui est bon
- Périmètre : 4 fichiers, tous dans fichiers_autorises ; 121 lignes ajoutées (taille_max 200). Dépendances L12-T17 et L01-T19 « fait ».
- Les 5 tests nommés passent. `normaliser` importé de regimes-particuliers.ts (pas copié) ; CC-T10 non modifié ; mentions et natures en arguments ; TVA déductible obtenue par `effetTraitement` (code `MARGE`), sans recalcul. Gravité M, code `marge_a_tort_ou_oubliee`.
- Mutation rouge : retrait du filtre des mentions vides.
- Retrait de `bloque_par` : même levée que L16-T09 (#1112). Journal : 7 lignes, commence par « # Journal L16-T42 ». Aucun mot interdit, aucun prix, données fictives.

Défauts
1. packages/noyau/src/controles/regles/marge-occasion.ts:51 : la règle juge la TVA sur `piece.totaux.tva`, pas sur les lignes « occasion ». Une facture mixte sans mention (ligne `bien_occasion` 80 000 HT à 0 de TVA + ligne `bien_neuf` 10 000 HT et 2 000 de TVA) rend `OK` au lieu de la carte `marge_a_tort_ou_oubliee`. Reproduit sur ce SHA.
   Correction demandée : alerter dès qu'une ligne d'occasion est à 0 de TVA sans mention (TVA de la ligne, via `exigerCentimes(l.tva)`), avec un test sur une facture mixte, les lignes dans les deux ordres (même résultat).
2. marge-occasion.ts:50 : `some` -> `every` laisse les 5 tests verts (toutes les pièces de test n'ont qu'une ligne). Le test de la facture mixte du défaut 1 doit aussi tuer ce mutant.
3. marge-occasion.ts:40 : la normalisation des natures n'est pas testée (retrait de `.map(normaliser)` : 5 verts). Correction demandée : un test où la nature reçue diffère de la nature réglée par la casse ou les accents.
4. Cas limites absents (consigne du relecteur et règles du noyau du lot 12, dont dépend la fiche) : aucun montant NaN, Infinity ou non entier. Les mutations qui retirent `exigerCentimes` (lignes 29 et 51) laissent 5 tests verts. Liste de lignes vide non testée non plus.
   Correction demandée : `regle.evaluer` et `tvaDeductibleMarge` avec une TVA NaN, Infinity et 1.5 doivent lever (`entree_invalide`) ; une pièce sans ligne rend `NON_APPLICABLE`.

Remarques
- L'identifiant `CC-T10-OCCASION` n'est inscrit nulle part au catalogue : c'est hors périmètre (fiche), à prévoir lors de l'inscription.
- Fiche sensible : relecture Opus, fusion par Will seul.
