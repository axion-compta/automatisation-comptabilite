VERDICT: OK
SHA relu : 6c98c0e9e5e6599b0cf713e1e1b0355a91310b74
PR : 879 (branche lot-11/L11-T28), fiche L11-T28, `pilotage/fiches/L11-T28.md` (+5 −5). Elle répond au défaut bloquant 1 de l'avis relec72-g01-877.

## Vérifications
- Diff contre `origin/main` : seul `pilotage/fiches/L11-T28.md` change. Une fiche par PR.
- Titre, critère, À faire 1 et 3 : 5 routes (créer, compléter, proposer, valider, rembourser). Cela correspond à L11-T26 (`creerFrais`, `completerFrais`) plus L11-T27 (`proposerFrais`, `validerFrais`, `preparerRemboursement`). Le Contexte (« routes de L11-T26 et L11-T27 ») reste juste.
- Scénario jouable sans route payeur : `creerFrais` avec `pieceId` et payeur déclaré, puis `completerFrais`, `proposerFrais`, `validerFrais`, `preparerRemboursement`. Le 409 « payé par la société » passe bien par `proposerFrais`. `FRAIS_PAYE_SOCIETE` figure dans les erreurs de L11-T27, et le noyau refuse ce cas (`packages/noyau/src/frais/ecriture-depense.ts:22`). Le jeu fictif fournit le cas avec FRA-001 (`payeur: societe`, `exclu_paye_societe`) dans `packages/donnees-fictives/src/frais.ts`. Le 409 « barème à vérifier » est disponible par le barème fictif 2026 `a_verifier`.
- Hors périmètre : payeur et véhicules sont renvoyés à « une fiche ultérieure du lot 11, à créer après L11-T38 à L11-T40 ». C'est la même formule que L11-T26 sur main. Aucun numéro n'est cité.
- Dépendances : `depend_de` [L11-T27, L11-T25] est inchangé. L11-T38 dépend de L11-T27 et L11-T28, et aucune de ses 8 tâches ne touche la route payeur. Le cycle relevé par relec72 est levé.
- `fichiers_autorises` et `taille_max_lignes` (280) sont inchangés. La taille est suffisante pour 5 handlers au lieu de 7.
- `garde:fiches` : 888 fiches cohérentes (avertissements REPRENDRE.md seulement). `garde:textes` et `garde:fictif` sont verts.
- Aucun mot interdit (conforme, sans erreur, garanti, juriste, PDP), aucun prix, aucune donnée réelle.

## Remarques
- La branche est en retard sur main (#880 fusionnée depuis). Il n'y a pas de conflit, car un autre fichier est concerné. Remettre à jour avant fusion si la CI l'exige.
- L11-T27 n'a aucun test nommé pour `FRAIS_PAYE_SOCIETE`, alors que la suite de L11-T28 s'appuie dessus. Ce n'est pas bloquant : la suite commune de L11-T28 le couvrira. On pourra l'ajouter à L11-T27 lors d'une prochaine retouche de cette fiche.
- `pilotage/fiches/L11-T24.md:29` attribue encore `POST /vehicules` à L11-T26. C'est périmé mais sans effet. À corriger avec la future fiche payeur et véhicules.
