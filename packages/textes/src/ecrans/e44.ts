// Écran E44 « Mes clients et fournisseurs » : tous les textes visibles. Vouvoiement.
export const e44 = {
  titre: 'Mes clients et fournisseurs',
  onglets: { nom: 'Type de tiers', tous: 'Tous', clients: 'Clients', fournisseurs: 'Fournisseurs' },
  recherche: { nom: 'Rechercher par nom ou par code' },
  tableau: {
    legende: 'Liste de vos clients et fournisseurs',
    code: 'Code',
    nom: 'Nom',
    type: 'Type',
    email: 'E-mail',
    client: 'Client',
    fournisseur: 'Fournisseur',
  },
  pagination: { precedent: 'Page précédente', suivant: 'Page suivante', resume: '{debut} à {fin} sur {total}' },
  export: {
    bouton: 'Exporter',
    enCours: 'Export en cours…',
    choix: "Format de l'export",
    csv: 'CSV',
    xlsx: 'XLSX',
    erreurs: {
      trop_gros: 'Cet export est trop volumineux : affinez vos filtres.',
      au_dela_du_direct: "Cette liste dépasse la taille d'un export direct ; l'export en tâche arrive bientôt.",
      introuvable: "Cette liste n'est pas exportable.",
      autre: "Impossible d'exporter cette liste pour le moment.",
    },
  },
  etats: {
    chargement: 'Chargement de vos clients et fournisseurs…',
    vide: 'Aucun client ni fournisseur pour le moment.',
    videRecherche: 'Aucun résultat pour cette recherche.',
    videRechercheDetail: 'Essayez un autre nom ou un autre onglet.',
    erreur: 'Impossible de charger vos clients et fournisseurs.',
    acces: "Vous n'avez pas accès à cette liste.",
  },
} as const;
