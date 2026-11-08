// Textes des pages publiques « Informations » (sans connexion). Vouvoiement. Aucun nom de fournisseur.
export const pagesPubliques = {
  titre: 'Informations',
  sections: {
    confidentialite: {
      ancre: 'confidentialite',
      titre: 'Confidentialité',
      texte:
        "Cette page explique quelles informations sont traitées, pourquoi et pendant combien de temps. Elle ne contient aucune donnée de votre société.",
    },
    mentions: {
      ancre: 'mentions',
      titre: 'Mentions',
      texte: "Le référent chargé de la protection des données répond aux demandes reçues par le formulaire ci-dessous.",
    },
    sousTraitants: {
      ancre: 'sous-traitants',
      titre: 'Sous-traitants',
      texte: 'Voici, rôle par rôle, les prestataires qui interviennent et si leur traitement a lieu dans l\'Union.',
    },
    droits: {
      ancre: 'droits',
      titre: 'Vos droits',
      texte: 'Vous pouvez demander l\'accès à vos données, leur correction ou leur effacement, entre autres. Écrivez-nous ici.',
    },
  },
  colonnes: { role: 'Rôle', nom: 'Nom', dansUnion: 'Traitement dans l\'Union', etat: 'État' },
  legendeTableau: 'Liste des sous-traitants',
  oui: 'Oui',
  non: 'Non',
  etats: { actif: 'Actif', prevu: 'Prévu' },
  formulaire: {
    type: 'Type de demande',
    email: 'Votre adresse e-mail',
    message: 'Votre message',
    envoyer: 'Envoyer la demande',
    contactIndisponible: 'Contact indisponible pour le moment.',
    envoye: 'Votre demande est enregistrée. Référence : {reference}.',
    erreurs: {
      email: 'Cette adresse e-mail semble incomplète.',
      message: 'Veuillez écrire votre message.',
      envoi: "La demande n'a pas pu être envoyée. Votre saisie est conservée, vous pouvez réessayer.",
    },
  },
  droitsLibelles: {
    acces: 'Accès à mes données',
    rectification: 'Rectification',
    effacement: 'Effacement',
    limitation: 'Limitation du traitement',
    portabilite: 'Portabilité',
    opposition: 'Opposition',
  },
  piedCourriel:
    'Vos informations personnelles sont traitées pour vous fournir ce service. Pour en savoir plus : {lien}/informations#confidentialite. Pour exercer vos droits : {lien}/informations#droits.',
} as const;
