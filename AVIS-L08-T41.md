VERDICT: OK

PR #1089, fiche L08-T41, SHA de tête relu : 66d59acbc6e14317958c6ff630d222dfe2a8929e (deuxième relecture, après l'avis A CORRIGER au SHA 51ae3a50).

## Défaut de l'avis précédent : corrigé
1. `pilotage/calibrage.csv` : l'en-tête commun `date;pr;fiche;decision;raisons;minutes_attente` est conservé tel quel (le diff ne touche pas la ligne 1). Les 70 lignes ont 6 champs chacune, `decision` = `fusion`, `minutes_attente` vide, `raisons` = « lignes N, écriture M min, ouverture à fusion X min ». 70 numéros de PR distincts. Médiane recalculée depuis le fichier : 36,0 min. Trois lignes recoupées avec l'API (#139, #361, #582) : date de fusion, lignes (ajouts + retraits) et durée d'ouverture à fusion concordent.

## Remarque de l'avis précédent
- Date annoncée « réponse attendue le 21/11/2026 » : retirée de la section Lot 08.
- « Bloc du haut » : non traitée, cohérent avec les autres lots ; reste non bloquante.

## Vérifications
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 114 lignes ajoutées, 1 retirée (limite 120). Garde périmètre verte.
- Merge de main : la section Lot 04 est intacte ; la section Lot 08 est inchangée sur le fond depuis la première relecture (tableau R1 à R15 et T-EXP-1 à T-EXP-14 déjà vérifié titre par titre).
- CI au SHA de tête : 9 jobs verts. Aucun octet NUL, aucun prix, aucun mot interdit, aucun nom réel. Journal : 7 lignes, commence par « # Journal L08-T41 ».

## Remarque (non bloquante)
- La PR #1092 (L11-T35) ajoute aussi des lignes à `calibrage.csv` sous le même en-tête : la seconde fusionnée aura un conflit simple à résoudre (garder les deux blocs).
