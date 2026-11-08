// Textes de l'écran T05 « Mes préférences ». Vouvoiement.
export const t05 = {
  titre: 'Mes préférences',
  affichage: {
    titre: 'Affichage',
    mode: 'Mode d’affichage',
    simple: 'Simple',
    comptable: 'Comptable',
    aide: 'Le mode change les mots, jamais la place des écrans ni vos données.',
    apercu: 'Aperçu du vocabulaire',
  },
  clavier: { titre: 'Clavier', raccourcis: 'Raccourcis d’une lettre actifs' },
  notifications: {
    titre: 'Notifications',
    categories: 'Catégories à recevoir',
    a_valider: 'Éléments à valider',
    echeance: 'Échéances',
    urgent: 'Alertes urgentes',
    cabinet: 'Messages du cabinet',
    resume: 'Résumé quotidien par e-mail',
    resumeAide: 'Le résumé sera envoyé quand un fournisseur d’envoi de l’Union européenne sera en place.',
    heure: 'Heure du résumé',
    heureInvalide: 'Saisissez une heure valide, par exemple 08:30.',
  },
  usage: {
    titre: 'Mesure d’usage',
    mesure: 'Mesurer l’usage de l’application',
    description: 'La mesure est pseudonymisée, jamais votre texte ni vos montants.',
  },
  etats: { chargement: 'Chargement en cours…', erreur: 'L’aperçu du vocabulaire est indisponible pour le moment.' },
} as const;
