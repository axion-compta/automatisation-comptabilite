VERDICT: A CORRIGER

PR #1089, fiche L08-T41, relue au SHA de tête 51ae3a50b014642e61318bb73972e1ab75829498 (première relecture, relecteur Opus).

## Défauts

1. `pilotage/calibrage.csv:1` : l'en-tête commun `date;pr;fiche;decision;raisons;minutes_attente` est remplacé par `pr;fiche;lignes;minutes_ecriture;minutes_fusion`. Ce fichier est commun à tous les lots. Son en-tête suit le format de `ligneCalibrage` dans `scripts/pilotage/portier.mjs` : date, pr, fiche, décision, raisons, minutes. La PR #1092 (L11-T35) ajoute 40 lignes sous l'ancien en-tête. Les deux PR entrent donc en conflit, et la seconde fusionnée rendrait le fichier incohérent : deux schémas dans un même CSV.
   Correction demandée : remettre l'en-tête d'origine, sans le modifier, et écrire les 70 lignes dans les colonnes existantes : `date` (date de fusion), `pr`, `fiche`, `decision` = `fusion`, `raisons` = « lignes N, écriture M min, ouverture à fusion X min », `minutes_attente` vide si non mesuré. Si #1092 est fusionnée avant, faire `git merge origin/main` et ajouter les lignes du lot 08 à la suite.

## Vérifié et correct
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; diff de 117 lignes pour une limite de 120.
- Les 40 titres de test cités dans le tableau des cas existent sur main, dans les fichiers indiqués (vérifié un par un avec `git grep`). `outils/gardes/test/sous-traitants.test.mjs` existe.
- R15 et T-EXP-2, 3, 4 et 6 sont écrits « bloqué par », pas « couvert » : le piège est respecté.
- État des fiches lu sur main : 57 fiches, `a_faire` = T41, T53, T54 seulement. C'est exact.
- Mesures : médiane recalculée à 36,0 min sur 70 lignes ; échantillon #744 (354 lignes, 40,1 min) concordant avec l'API.
- Journal : 7 lignes, commence par `# Journal L08-T41`. Aucun prix, aucun mot interdit, aucun nom réel.

## Remarques (non bloquantes)
- La fiche demande « bloc du haut » ; la section est ajoutée en fin de fichier comme celles des autres lots. Acceptable.
- « réponse attendue le 21/11/2026 » (`REPRENDRE.md:183`) : date annoncée (D22). La même mention figure déjà ailleurs sur main ; mieux vaut écrire « réponse de la console attendue ».
- Les PR de statut et de création de fiche (#139, 1842 lignes) faussent les mesures de lignes. La limite est dite, c'est bien.
