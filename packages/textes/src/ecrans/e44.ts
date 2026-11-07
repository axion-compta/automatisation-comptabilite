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
  etats: {
    chargement: 'Chargement de vos clients et fournisseurs…',
    vide: 'Aucun client ni fournisseur pour le moment.',
    videRecherche: 'Aucun résultat pour cette recherche.',
    videRechercheDetail: 'Essayez un autre nom ou un autre onglet.',
    erreur: 'Impossible de charger vos clients et fournisseurs.',
    acces: "Vous n'avez pas accès à cette liste.",
  },
} as const;
