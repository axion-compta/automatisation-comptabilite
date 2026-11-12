// Écran E44 « Fiche client » : tous les textes visibles. Vouvoiement.
export const e44Client = {
  titre: 'Fiche client',
  nature: { libelle: 'Nature', professionnel: 'Professionnel', particulier: 'Particulier' },
  siren: 'SIREN',
  tva: 'N° de TVA',
  absent: 'Non renseigné',
  vies: { libelle: 'Vérification VIES', verifie: 'Vérifié', non_verifie: 'Non vérifié', invalide: 'Invalide' },
  solde: 'Solde dû par ce client',
  factures: { titre: 'Factures ouvertes', aucune: 'Aucune facture ouverte', reste: 'reste dû' },
  delai: { libelle: 'Délai moyen de paiement', jours: '{n} jours', inconnu: 'Non connu' },
  habitude: {
    titre: 'Habitude apprise',
    phrase: 'Quand le client est {nom}, alors {compte} {nature}',
    service: 'Prestations',
    bien: 'Ventes de biens',
    aucune: 'Aucune habitude apprise',
  },
  etats: {
    chargement: 'Chargement de la fiche client…',
    erreur: 'Impossible de charger cette fiche pour le moment.',
    inconnu: "Ce client n'existe pas.",
  },
  retour: 'Retour à vos clients et fournisseurs',
};
