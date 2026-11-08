VERDICT: A CORRIGER
SHA relu: 31c14444194cd8eadfebe81b797f5786bb52506e
PR: #864, branche pilotage/L06-T04, fiche L06-T04

## Contrôles passés
- Un seul fichier modifié : `pilotage/fiches/L06-T04.md` (+27, -0), dans `fichiers_autorises`.
- Front matter inchangé : 15 champs, tableaux JSON valides, aucun guillemet double ajouté, aucun octet NUL.
- `garde:fiches` (887 fiches cohérentes), `garde:textes` et `garde:fictif` au vert sur la branche.
- Aucun mot interdit, aucun prix, aucun secret, aucune donnée réelle (aucun nom, e-mail, IBAN).
- Aucune valeur légale datée dans l'ajout. La date de recopie (08/11/2026) est cohérente.
- Table recopiée : 14 lignes × 6 colonnes = 84 cases ; colonne Axion à N partout sauf `lire` (lecture seule), ce qui cadre avec PLA-140/PLA-151.

## Défauts
1. `pilotage/fiches/L06-T04.md:27` : le test `demande5-faux-comptable-ferme` parle des « 6 cases marquées ». D'après le texte recopié, le bon nombre est 7. Le tableau marque D5 dans la colonne Exp aux lignes 2, 3, 4, 5, 6, 7 et 8, soit 7 cases, et la ligne 57 le confirme : « Cases Exp marquées D5 : 7 (lignes 2 à 8) ». Les lignes 1, 9, 12 et 14 n'ont pas de D5, et les lignes 10, 11 et 13 valent N. Laisser la fiche se contredire sur un test nommé fait courir le risque qu'un auteur écrive un test à 6 cases. Correction demandée : remplacer à la ligne 27 « les 6 cases marquées » par « les 7 cases marquées (lignes 2 à 8 de la colonne Exp) », puis remplacer à la ligne 57 la phrase « La fiche dit « les 6 cases marquées » … ne pas trancher ici » par une phrase qui dit que le nombre est 7.

## Remarques (non bloquantes)
- Lignes 47, 54 et 55 : les actions 6 (« Lever un cas Majeur »), 13 et 14 n'ont pas de clé entre accents graves, alors que les autres en ont une. L'auteur devra inventer ces trois clés de `Action`. Mieux vaut les écrire dans la fiche (par exemple `lever-majeur`, `proposer-automatique`, `assimiler-factures`).
- « D5 » veut dire ici « DEMANDE 5 », alors qu'ailleurs dans les fiches (L06-T30 à T33) D5 désigne une décision de style. Écrire « DEM5 » ou « DEMANDE 5 » éviterait la confusion.
- Ligne 60 : T-ROL-1 rejoue les cases « au serveur et par le chat ». Cette fiche ne couvre que le noyau, le serveur relève de T05 : à rappeler pour que l'auteur n'élargisse pas le périmètre.
- `ACTIONS_ECRITURE` n'est défini nulle part dans la fiche. La liste PLA-140 de la ligne 59 (`deposer`, `saisir`, `valider`, `lever-bloquant`, `cloturer`) peut servir : à le dire dans « À faire ».
- Les critères restent faisables avec le seul dépôt public, une fois le défaut 1 corrigé.
