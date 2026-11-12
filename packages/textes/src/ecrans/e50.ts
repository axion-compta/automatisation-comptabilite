// Écran E50 « Mes données et mes droits » : tous les textes visibles. Vouvoiement, aucun prix, aucune durée chiffrée.
// Les jetons {date}, {empreinte}, {n} et {max} sont remplacés au moment de l'affichage.
export const e50 = {
  titre: 'Mes données et mes droits',
  etats: { chargement: 'Chargement de vos informations…', erreur: 'Impossible de charger vos informations.' },
  fin: {
    titre: 'Fin de contrat',
    demander: 'Demander la fin de mon contrat',
    contact: 'Contactez Axion',
    preavis: 'Votre contrat se termine le {date}. Téléchargez vos documents.',
    empreinte: 'Empreinte de vos documents : {empreinte}',
    voirEmpreinte: 'Afficher l’empreinte complète',
    masquerEmpreinte: 'Masquer l’empreinte complète',
    accuser: 'J’ai bien reçu mes documents',
    effacement: 'Effacement prévu le {date}',
    effacementSuspendu: 'Effacement suspendu par un gel',
    conservation: 'Vous devez conserver ces documents pendant la durée prévue par la loi de votre pays.',
  },
  confirmation: { titre: 'Confirmer la réception', texte: 'Vous confirmez avoir reçu vos documents.', confirmer: 'Confirmer', annuler: 'Annuler', envoi: 'Envoi en cours…' },
  gel: { titre: 'Gel de l’effacement', actif: 'Un gel est en place.', motif: 'Motif (obligatoire)', compteur: '{n} caractères sur {max}', poser: 'Poser un gel', lever: 'Lever le gel' },
  erreurs: { generique: 'L’action n’a pas pu aboutir. Vous pouvez réessayer.' },
} as const;
