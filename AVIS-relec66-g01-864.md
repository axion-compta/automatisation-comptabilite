VERDICT: OK
SHA relu: 03901d0ad8bf9916e19d4c87b60dc2115cba4898
PR: #864, branche pilotage/L06-T04, fiche L06-T04 (seconde relecture, après l'avis relec64-g01-864 à A CORRIGER)

## Suivi de l'avis précédent
- Défaut 1 (6 cases au lieu de 7) : corrigé. Ligne 27, le test `demande5-faux-comptable-ferme` parle maintenant des « 7 cases marquées (lignes 2 à 8 de la colonne Exp) ». La phrase « ne pas trancher ici » est retirée. La ligne de comptage dit : « Le nombre exact est 7 ». J'ai recompté le tableau : DEM5 figure dans la colonne Exp aux lignes 2, 3, 4, 5, 6, 7 et 8, soit 7 cases, et dans aucune autre colonne.
- Remarque « clés manquantes » : traitée. Les lignes 6, 13 et 14 ont maintenant les clés `lever-majeur`, `proposer-automatique` et `assimiler-factures`. Les 14 clés sont distinctes.
- Remarque « D5 ambigu » : traitée. Le tableau écrit DEM5 partout, et la légende explique pourquoi.
- Remarque « ACTIONS_ECRITURE » : traitée. La liste est donnée à la ligne 27 (`deposer`, `saisir`, `valider`, `lever-bloquant`, `cloturer`). Elle est identique à la liste PLA-140 recopiée plus bas.
- Remarque « périmètre T05 » : traitée. Le rejeu au serveur et par le chat est renvoyé à T05.

## Contrôles passés
- Un seul fichier modifié (`git diff origin/main...`) : `pilotage/fiches/L06-T04.md`, +28 / -1. Il est dans `fichiers_autorises` et sous `taille_max_lignes` (250).
- Le front matter et les critères n'ont pas changé. Aucun test nommé n'est retiré : les 7 tests sont toujours là.
- `garde:fiches` (887 fiches cohérentes), `garde:textes` et `garde:fictif` passent au vert sur 03901d0.
- Aucun octet NUL, aucun mot interdit, aucun prix, aucun secret, aucune donnée réelle.
- Aucune contradiction nouvelle : le tableau, le comptage, le test nommé et PLA-140 concordent.

## Remarques (non bloquantes)
- Ligne 27 : les parenthèses sont imbriquées (« les 7 cases marquées (lignes 2 à 8 de la colonne Exp) passent à N », dans une parenthèse). La phrase reste lisible. À simplifier à l'occasion.
- La fiche ne contient pas de code. Je n'ai donc lancé ni vitest ni mutation : ils seront à faire sur la PR de code.
