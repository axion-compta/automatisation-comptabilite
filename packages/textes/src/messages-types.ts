// 20 messages types : phrases courtes, vouvoiement, sans emoji ni promesse chiffrée.
export const messagesTypes = {
  succesEnregistre: 'Votre écriture est enregistrée.',
  succesEnvoye: 'Votre document est envoyé.',
  succesImporte: 'Votre relevé est importé.',
  erreurFichier: 'Ce fichier est illisible. Essayez un autre fichier.',
  erreurReseau: 'La connexion est perdue. Réessayez dans un instant.',
  erreurChamp: 'Un champ est incomplet. Vérifiez-le puis recommencez.',
  erreurDroit: "Vous n'avez pas accès à cette page.",
  attenteLecture: 'Nous lisons votre pièce. Cela prend un instant.',
  attenteEnvoi: 'Envoi en cours. Merci de patienter.',
  attenteCalcul: 'Le calcul est en cours.',
  doutePiece: 'Nous hésitons sur cette pièce. Pouvez-vous la confirmer ?',
  douteMontant: 'Ce montant semble inhabituel. Vérifiez-le, s’il vous plaît.',
  douteDate: 'Cette date est loin des autres. Est-elle correcte ?',
  confirmationSuppression: 'Supprimer cette pièce ? Cette action est définitive.',
  confirmationEnvoi: 'Envoyer ce document maintenant ?',
  confirmationValidation: 'Valider ces écritures ? Vous pourrez les corriger ensuite.',
  videAucunePiece: "Vous n'avez encore aucune pièce.",
  videAucuneEcriture: "Il n'y a pas encore d'écriture à afficher.",
  aideDeposer: 'Déposez une photo ou un fichier pour commencer.',
  aideContact: 'Besoin d’aide ? Écrivez-nous depuis cette page.',
} as const;

export type MessagesTypes = typeof messagesTypes;
