VERDICT: A CORRIGER

PR #1135 « MVP conception : fiches L24-T01 à L24-T36 », relue au SHA de tête c28460adbc5fbf209e31948460a87bc0f07449d0 (branche pilotage/fiches-MVP-24, à jour de main). Relecture Opus du 12/11/2026, consigne LOT5 section R.

Le lot est bon dans l'ensemble. Il y a 3 fiches à retirer ou à amputer, 1 fiche à amender et 1 dépendance à reporter. Les 31 autres fiches peuvent rester telles quelles.

## Contrôles passés
- Forme identique à pilotage/fiches/L04-T56.md : mêmes clés, dans le même ordre, et 4 sections, pour les 36 fiches.
- taille_max_lignes compris entre 150 et 300. statut a_faire. Aucune ligne bloque_par.
- depend_de : toutes les dépendances existent, aucune n'est bloquée. garde:fiches donne « 1099 fiches cohérentes ».
- garde:textes et garde:fictif sont vertes. Aucun mot interdit : « pôle juridique » n'est pas un mot interdit. Aucun prix : « 5,00 € » n'est qu'un écart de test fictif dans L24-T25.
- Aucun texte privé recopié. Aucune exigence n'est déjà portée par une fiche de main.
- Aucun recoupement avec une fiche non faite de main, hors dépendances déclarées.
- Les CI de la tête sont toutes vertes.
- Aucune PR de code ouverte ne touche ces chemins.

## Défauts
1. pilotage/fiches/L24-T01.md : doublon de L21-T25 (PR ouverte #1132). Les deux fiches couvrent le même premier exercice de 6 à 24 mois, avec des bornes datées en paramètre, et le même fichier packages/noyau/src/exercices/premier-exercice.ts. L24-T01 appelle sa fonction creerExerciceSelonRang, L21-T25 l'appelle creerPremierExercice. Le catalogue diffère aussi : exercices.ts d'un côté, premier-exercice.ts de l'autre.
   Correction demandée : retirer L24-T01. Le reste (exercices suivants de 12 mois, plusieurs exercices ouverts, test TVA d'un exercice décalé) pourra revenir après la fusion de #1132, dans une fiche qui dépend de L21-T25.
2. pilotage/fiches/L24-T20.md : conflit de modèle avec L22-T19 (PR ouverte #1139). Les deux fiches ajoutent un champ `devise` à `LigneEcriture` dans packages/noyau/src/ecritures/modele.ts, avec deux formes incompatibles :
   - L24-T20 : `{ code, montantOrigine, taux, dateTaux, source }` ;
   - L22-T19 : `{ code, montant, origineTaux }`.
   Correction demandée : retirer L24-T20. Le besoin (taux et date du taux sur la ligne) devra prolonger la forme de L22-T19, une fois celle-ci fusionnée.
3. pilotage/fiches/L24-T21.md:11 : la fiche dépend de L24-T20. Si L24-T20 est retirée, ôter cette dépendance. latent.ts reçoit déjà les créances et les dettes en argument. Corriger aussi la phrase du Contexte « porté par la ligne (L24-T20) ».
4. pilotage/fiches/L24-T22.md : doublon partiel de L22-T20 (#1139). Les deux fiches créent `genererANouveaux` dans packages/noyau/src/cloture/a-nouveaux.ts, avec des signatures et des règles différentes : L22-T20 fait une ligne par facture non lettrée, L24-T22 garde le résultat en 120 ou 129.
   Correction demandée : retirer de L24-T22 a-nouveaux.ts, son test et les 3 tests nommés a-nouveaux-*. L'étape « à-nouveaux » de l'assistant renverra à L22-T20. Si ce n'est pas possible, retirer la fiche entière. Dans ce cas, L24-T23, qui dépend de L24-T22, doit perdre cette dépendance.
5. pilotage/fiches/L24-T02.md : contradiction avec L22-T15 (#1139). Les deux fiches modifient packages/noyau/src/ecritures/etats.ts et __tests__/etats.test.ts. L22-T15 exige que « `valider` reste inchangé », alors que L24-T02 change `valider` pour refuser un validant vide.
   Correction demandée : retirer etats.ts et etats.test.ts des fichiers_autorises de L24-T02, avec les 2 tests validant-*. Le refus d'un validant vide reste à placer dans piste.ts, ou dans une fiche qui dépend de L22-T15 une fois celle-ci fusionnée. Sinon, retirer la fiche.

## Remarques (non bloquantes)
- Recoupements de fichiers pivots avec d'autres PR de conception ouvertes, sans doublon :
  - L24-T05 et L24-T06 avec L25-T14 (#1136), sur les registres du lot 13 et openapi/lot-13 ;
  - L24-T07 avec L23-T02 (#1137), sur packages/contrat/src/domaines/plan.ts et son test ;
  - packages/contrat/openapi.json, partagé avec L19-T04, T07, T28 (#1134), L23-T02 et T20 (#1137), L26-T15, T24 et T25 (#1138) ;
  - L24-T02, sur modele.ts, avec L22-T19 (#1139).
  Règle à appliquer : la PR fusionnée en second ajoute les depend_de vers les fiches déjà fusionnées qui partagent ses fichiers.
- La PR fait 1155 lignes, ce qu'impose une PR de conception unique. C'est noté.
