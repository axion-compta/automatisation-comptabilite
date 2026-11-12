// Écran E53 « Mon abonnement » : tous les textes visibles. Vouvoiement, aucun prix, aucun montant.
// Le jeton {palier} est remplacé par le nom du palier au moment de l'affichage.
export const e53 = {
  titre: 'Mon abonnement',
  palier: 'Votre palier : {palier}',
  etats: {
    chargement: 'Chargement de votre abonnement…',
    erreur: 'Impossible de charger votre abonnement.',
  },
  choix: {
    intro: 'Vous avez atteint le volume de votre palier. Vos pièces continuent d’être traitées.',
    attendre: 'Attendre le mois suivant',
    demander: 'Demander le palier supérieur',
  },
  demande: {
    accord: "J'accepte qu'Axion passe mon abonnement au palier {palier}.",
    envoyer: 'Envoyer la demande',
    envoi: 'Envoi en cours…',
    succes: "Demande envoyée. Axion changera votre palier ; d'ici là, votre palier reste {palier}.",
    erreur: "La demande n'a pas pu être envoyée. Vous pouvez réessayer.",
  },
  lien: { contact: 'Contactez Axion' },
} as const;
