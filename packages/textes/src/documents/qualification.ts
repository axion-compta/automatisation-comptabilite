// Libellés du questionnaire de qualification du client. Mots simples, vouvoiement. Le texte de la clause n'est pas écrit ici.
export const qualification = {
  titre: 'Quelques questions avant de commencer',
  questions: {
    activite_professionnelle: 'Utilisez-vous ce service pour votre activité professionnelle ?',
    forme: 'Quelle est la forme de votre activité ?',
  },
  choix: {
    oui: 'Oui',
    non: 'Non',
    EI: 'Entreprise individuelle',
    SCI: 'Société civile immobilière',
    SARL: 'Société à responsabilité limitée',
    SAS: 'Société par actions simplifiée',
    autre: 'Autre forme',
  },
  documentJoint: 'Un document sur votre droit de rétractation vous est remis avec votre réponse.',
} as const;
