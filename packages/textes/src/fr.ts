// Textes français de l'interface. Ton neutre, noms et e-mails fictifs seulement.
export const fr = {
  app: { nom: 'Comptabilité', slogan: 'Vos écritures, sous contrôle.' },
  actions: { enregistrer: 'Enregistrer', annuler: 'Annuler', valider: 'Valider', supprimer: 'Supprimer' },
  etats: { chargement: 'Chargement en cours…', vide: 'Aucun élément à afficher.' },
  erreurs: {
    generique: "Une erreur s'est produite. Réessayez dans un instant.",
    reseau: 'Connexion impossible. Vérifiez votre réseau.',
  },
  palette: {
    titre: 'Palette de commandes',
    champ: 'Commande',
    exemple: '/aller une page',
    aucune: 'Aucune page ne correspond.',
  },
} as const;

export type Textes = typeof fr;
