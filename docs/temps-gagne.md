# Temps gagné : trois tâches de référence

Exigence V3-QUA-024. Un robot chronomètre trois tâches sur un jeu fictif (60 pièces, 120 lignes, graine fixe), hors production. Aucun gain n'est promis ici.

## Les trois tâches proposées (à confirmer)

| Tâche | Début observable | Fin observable |
|---|---|---|
| `classer-valider` : classer et valider les pièces d'un mois | Ouverture de la liste des pièces du mois | Dernière pièce validée, liste vide |
| `rapprocher-releve` : rapprocher le relevé du mois | Ouverture de l'écran de rapprochement | Toutes les lignes du relevé rapprochées ou signalées |
| `preparer-tva` : préparer la TVA du mois | Ouverture de la déclaration du mois | Brouillon de déclaration affiché |

## Règle « NON MESURÉ »

- Une durée n'existe que si le robot l'a observée : début et fin ci-dessus, horloge injectée, durée en millisecondes entières.
- Tâche sans port, port en erreur ou durée invalide : la ligne du rapport porte « NON MESURÉ ». Zéro n'est jamais utilisé pour dire « inconnu ».
- Une estimation reste dans sa propre colonne, étiquetée « estimation, non mesurée ». Elle n'est jamais écrite dans la colonne des mesures.
- Les ports réels (écrans, serveur) et le tableau de bord client ne font pas partie de cet outil.
