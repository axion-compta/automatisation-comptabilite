// Écran E19 « Ma TVA » : tous les textes visibles. Vouvoiement.
export const e19 = {
  titre: 'Ma TVA',
  estimation: {
    titre: 'Estimation de votre TVA',
    collectee: 'TVA collectée',
    deductible: 'TVA déductible',
    regimeNonTraite: 'Votre régime de TVA n’est pas encore pris en charge : aucune estimation n’est affichée.',
    lienPieces: 'Voir les pièces à regarder',
    cheminPieces: '/documents',
  },
  periodes: {
    titre: 'Vos périodes de TVA',
    legende: 'Périodes de TVA de l’année',
    du: 'Du',
    au: 'Au',
    etat: 'État',
    vide: 'Aucune période de TVA pour cette année.',
    etats: { ouverte: 'En cours', validee: 'Validée', deposee_par_client: 'Déposée par vous' },
  },
  etats: {
    chargement: 'Chargement en cours…',
    aucuneAnnee: 'Aucune année comptable n’est encore créée.',
    acces: 'Vous n’avez pas accès à cette page.',
    erreur: 'Une erreur s’est produite. Réessayez dans un instant.',
  },
} as const;
