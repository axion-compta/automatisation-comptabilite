// Textes du panneau du chat et de l'omnibarre. Vouvoiement.
export const chat = {
  panneau: {
    nom: 'Conversation',
    etats: { reduit: 'Réduire', normal: 'Taille normale', elargi: 'Élargir', plein: 'Plein écran' },
    ouvrir: 'Ouvrir la conversation',
    poignee: 'Largeur de la conversation',
  },
  omnibarre: {
    etiquette: 'Chercher ou discuter',
    groupes: { recherche: 'Résultats', conversations: 'Conversations' },
    sourceEnPanne: 'Une source ne répond pas : {nom}. Les autres résultats sont affichés.',
    rien: 'Aucun résultat',
  },
} as const;
