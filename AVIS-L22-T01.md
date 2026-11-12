VERDICT: A CORRIGER

PR #1139 (conception MVP, fiches L22-T01 à L22-T35), tête relue : 79b487f21e01e25d6de3a2df9ef6e1df65f64c25
Relecteur Opus, consigne LOT5 section R. Lot de bonne qualité : 2 fiches font doublon avec une autre PR ouverte et sont à retirer. Les 33 autres peuvent partir telles quelles.

## Contrôles passés
- Forme : les 35 fiches ont les mêmes clés, dans le même ordre, et les mêmes 4 sections que `pilotage/fiches/L04-T56.md`. Toutes sont `a_faire`, sans `bloque_par`. `taille_max_lignes` va de 150 à 300.
- `node outils/gardes/fiches.mjs` sur la tête : 1098 fiches cohérentes, aucun avertissement de plus que sur main. CI verte.
- Chaque `depend_de` existe et les chaînes internes sont en place (`tva.ts` et `controles.csv`, puis `tva-micro.ts`, `is-societes.ts`, `parcours.e2e.ts`). La migration `172-lien-piece-ecriture.sql` est libre (main s'arrête à 164, la PR #1136 prend 170). `garde:portes` : seule L22-T17 vise un écran, `e08`, dont la porte existe.
- Aucune exigence n'est déjà citée par une fiche de main ni par une autre PR de conception ouverte.
- Aucun recoupement avec une fiche de main non faite, ni avec le diff d'une PR de code ouverte (#1105, #1128, #1129, #1131).
- Aucun mot interdit. Aucun texte privé : ni décision, ni adresse, ni nom, ni chiffre commercial. Les énoncés ATK et les 2 conditions d'ouverture non publiées sont marqués « à décrire » ou « a_preciser », sans rien inventer. Aucune valeur légale en dur : seuils, dates et comptes sont des paramètres datés ou des arguments.

## Défauts (retirer ces fiches de la PR)
1. L22-T20 fait doublon avec L24-T22 (PR #1135). Les deux créent `packages/noyau/src/cloture/a-nouveaux.ts` et son test avec une fonction `genererANouveaux`, mais leurs signatures sont incompatibles : `({ ecrituresValidees, exerciceSuivant, comptesBilan, comptesTiers, journalAN })` d'un côté, `(balanceDeCloture)` de l'autre. Correction : retirer L22-T20 de cette PR. Will choisit ensuite une seule fiche pour les à-nouveaux : soit le détail par facture de L22-T20 est ajouté à L24-T22, soit la partie à-nouveaux est retirée de L24-T22 et L22-T20 revient seule.
2. L22-T19 et L24-T20 (PR #1135) ajoutent chacune un champ `devise` sur `LigneEcriture` (`packages/noyau/src/ecritures/modele.ts`), avec des formes incompatibles : `{ code, montant, origineTaux }` contre `{ code, montantOrigine, taux, dateTaux, source }`. Correction : retirer L22-T19 de cette PR. Elle reviendra après la fusion de #1135 avec `depend_de: L24-T20`, et ne modifiera plus `modele.ts` : elle lira le bloc `devise` de L24-T20, en ajoutant au plus l'origine du taux.

## Remarques (non bloquantes, pour Will à la fusion)
- Recoupements avec les autres PR de conception ouvertes. Lots différents, simple avertissement, à chaîner par la PR fusionnée en second :
  - `textes/documents/declarations.ts` et son test : L23-T06 (#1137) ;
  - `noyau/ecritures/etats.ts` et son test : L24-T02 (#1135), avec des fonctions distinctes ;
  - registres `lot-03` du contrat, du serveur et du faux serveur : L23-T20 (#1137), L20-T08 et L20-T12 (#1133) ;
  - `ecrans/e08/Ecran.tsx` et `textes/ecrans/e08.ts` : L19-T10 (#1134) et L20-T15 (#1133) ;
  - `docs/controles.csv` : L26-T31 (#1138).
- Les critères « les N tests nommés de la fiche passent » ne donnent pas le fichier de test (T01, T02, T16, T21, T22, T23, T25, T28). Ils restent mesurables, puisque les tests sont nommés dans la fiche, mais il vaut mieux citer le fichier comme dans les autres fiches.
- Constat de l'auteur à suivre : les textes CC-T13 à CC-T19 de `packages/textes/src/controles/tva.ts` semblent décalés. Seul CC-T17 est corrigé (L22-T07), les autres demandent une fiche.
- Aucune mutation possible ni aucun test vitest ciblé : la PR ne contient que des fiches. La vérification a porté sur les gardes `fiches` et `portes` et sur des recoupements scriptés.
