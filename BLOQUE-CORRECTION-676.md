# BLOQUE-CORRECTION-676

PR 676, fiche L15-T38, branche lot-15/L15-T38 : main fusionné (historique approfondi), une seule garde reste rouge.

- Garde : `garde:portes` (scripts/verifier.mjs --gardes).
- Message : lot back-end de l'écran n08 sans porte « maquette validée » sur origin/main (`pilotage/portes/n08.json`).
- Cause hors de la fiche : le fichier de porte n08 n'existe pas sur main ; il n'est pas dans les fichiers_autorises de L15-T38.
- Les autres gardes sont vertes ; diff de 4 fichiers de code et fiche/journal, bien sous la limite de 270 lignes.
- À faire : Will (valideur des portes) ajoute `pilotage/portes/n08.json` sur main, puis relancer cette correction.
- Rien n'a été poussé sur lot-15/L15-T38 (le merge reste local).
