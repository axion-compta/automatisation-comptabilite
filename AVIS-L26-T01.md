VERDICT: A CORRIGER

PR #1138 (conception MVP, fiches L26-T01 à L26-T36), tête relue : b751026123ddcfee7ad64962a00931f300bca712
Relecteur Opus, consigne LOT5 section R. Le lot reste bon dans l'ensemble : 6 fiches à corriger ou à retirer, les 30 autres peuvent partir telles quelles.

## Contrôles passés
- Forme : les 36 fiches ont les mêmes clés, dans le même ordre, et les mêmes 4 sections que `pilotage/fiches/L04-T56.md`. Toutes sont `a_faire`, sans `bloque_par`. `taille_max_lignes` va de 120 à 300.
- `node outils/gardes/fiches.mjs` sur la tête : 1099 fiches cohérentes. Aucune erreur, 9 avertissements de plus que sur main (lots différents). CI verte (verifier, gardes, tests, e2e…).
- Chaque `depend_de` existe, sur main ou dans la plage. Les fichiers déjà présents sur main existent bien. Les nouveaux sont dans des dossiers existants ou dans des dossiers neufs annoncés (`apps/web/e2e-demo/`, `apps/web/src/demo/`, `outils/captures/`, `ecrans/n01`, `ecrans/n02`).
- Aucune exigence n'est déjà citée par une fiche de main ni par une autre PR de conception ouverte (#1102, #1132 à #1137, #1139).
- Aucun mot interdit. Aucun texte privé : ni décision, ni adresse, ni nom réel, ni chiffre commercial. Le lien de rendez-vous passe par une variable de build.
- Critères mesurables : tests nommés et commandes exécutables (`build:demo` et `playwright.demo.config.ts` sont créés par L26-T01).

## Défauts (à corriger dans la PR, ou retirer la fiche)
1. L26-T15, À faire 2 : `mode: 'autonome' | 'saisie_seule' | 'accompagne'`. La valeur `accompagne` n'existe nulle part. Main a `ModeTravail = 'autonome' | 'assiste' | 'saisie_seule'` (`packages/noyau/src/documents/mention.ts:3`). L23-T01 (PR #1137) passe à `autonome | saisie_seule | expert_complet`. Correction : ne pas recopier de liste. Réutiliser la liste des modes de main (ou `MODES_TRAVAIL` de L23-T02 si #1137 est fusionnée avant). Adapter le test `mode-hors-liste-refuse`.
2. L26-T18 et L26-T26 seront rouges sur `garde:portes`. Elles touchent `apps/serveur/`, et des fiches qui en dépendent visent des écrans sans porte « maquette validée » : `n01` (L26-T27, L26-T28) et `n02` (L26-T29). Aucun `pilotage/portes/n01.json` ni `n02.json` sur main. Test fait avec `ecransDeLaFiche` de `outils/gardes/portes.mjs` sur la tête de la PR. Correction : retirer L26-T27, L26-T28 et L26-T29. Retirer aussi de L26-T13 `un-probleme.e2e.ts` et la dépendance à L26-T27. Ces fiches reviendront quand Will aura posé les portes n01 et n02. C'est la règle déjà suivie pour E09 dans la PR #1139.
3. L26-T10 gèle `packages/ui/src/jetons.css` dès le départ. Or L19-T09 (PR #1134, MVP) et L16-T02 (main, `a_faire`) doivent modifier ce fichier, et `gel.json` n'est pas dans leurs `fichiers_autorises` : elles seraient rouges sans pouvoir corriger. Correction : `gel.json` vide au départ, et adapter le test `empreintes-identiques-vert` à un fichier temporaire. Les chemins s'ajoutent par une PR sensible quand la porte est validée.
4. L26-T04, À faire 2 : la fiche impose `mode` (`autonome`, `saisie_seule`) sur les profils fictifs. Or ni `packages/donnees-fictives/src/profil.ts` ni le contrat n'ont ce champ. C'est L23-T02 (PR #1137) qui l'ajoute, et elle modifie aussi `donnees-fictives/src/compta.ts`. Correction : retirer la partie mode de L26-T04 (test `modes-autonome-et-saisie-seule` compris), ou la reprendre après la fusion de #1137 avec `depend_de: L23-T02`.

## Remarques (non bloquantes, pour Will à la fusion)
- Recoupements avec les autres PR de conception ouvertes. Lots différents, simple avertissement de la garde, mais à chaîner par la PR fusionnée en second :
  - `main.tsx` : L19-T23 et L19-T34 (#1134) ;
  - `Coque.tsx` : L19-T13 à L19-T16 (#1134) ;
  - `e01/Ecran.tsx` et `textes/ecrans/e01.ts` : L19-T06, L19-T26 (#1134) et L25-T17 (#1136) ;
  - `chat/Discussion.tsx` et `textes/ecrans/e25.ts` : L20-T32 (#1133) et L25-T12 (#1136) ;
  - `openapi.json` : L19-T04, T07, T28, L23-T02, T20 et L24-T07 ;
  - `noyau/documents/mention.ts` et son test : L23-T01 (#1137), fichier sensible ;
  - `donnees-fictives/compta.ts` : L23-T02 ;
  - `contrat/chat/outils.json` : L23-T28 ;
  - `faux-serveur/registres/lot-15.ts` : L19-T05 ;
  - `textes/ecrans/e57.ts` : L20-T27 ;
  - `docs/controles.csv` : L22-T04 à T06 et T08 (#1139).
- L16-T01, L16-T05 et L16-T55 (V1, bloquées) doivent recevoir `depend_de` vers L26-T01, L26-T19 et L26-T33. La fiche le dit, mais rien ne l'impose : à faire par Will.
- Aucune mutation possible ni aucun test vitest ciblé : la PR ne contient que des fiches et un journal. La vérification a porté sur les gardes `fiches` et `portes` et sur des recoupements scriptés.
