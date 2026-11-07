// Détail d'une vente (E24) : tous les textes visibles. Vouvoiement.
export const e24Vente = {
  sections: {
    facture: 'Facture',
    lignes: 'Lignes',
    controles: 'Contrôles',
    ecriture: 'Écriture',
    paiements: 'Paiements',
    avoirsLies: 'Avoirs liés',
  },
  prepareParIa: 'Préparé par IA, à valider',
  inconnue: "Cette vente n'existe pas ou n'est plus disponible.",
  retour: 'Retour aux ventes',
} as const;
