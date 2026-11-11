// Tiroir T08 « Ce qui demande mon attention » (la cloche) : textes visibles. Vouvoiement.
export const t08 = {
  titre: 'Ce qui demande mon attention',
  fermer: 'Fermer',
  etats: { chargement: 'Chargement en cours…', erreur: 'Cette liste est indisponible pour le moment.' },
  alertes: {
    titre: 'Alertes',
    vide: 'Aucune alerte ouverte pour le moment.',
    sansTitre: 'Une alerte demande votre attention',
    titres: { 'ALR-01': 'Une déclaration demande votre attention', 'ALR-04': 'Une échéance approche', 'ALR-05': 'Votre mois demande une vérification', 'ALR-08': 'Votre activité mérite un coup d’œil', 'ALR-09': 'Votre banque demande une action' },
    gravites: { info: 'Information', a_faire: 'À faire', urgent: 'Urgent', bloquant: 'Bloquant' },
    echeance: 'À faire avant le', reporter: 'Reporter', ignorer: 'Ignorer', choixJours: 'Reporter de', jours: '{n} j', motif: 'Motif', confirmer: 'Confirmer', annuler: 'Annuler',
  },
  notifications: { titre: 'Notifications', vide: 'Aucune notification.', lue: 'Lue', nonLue: 'Non lue', toutLire: 'Tout lire' },
  messages: { reportee: 'Alerte reportée.', ignoree: 'Alerte ignorée.', annulee: 'Action annulée.', annuler: 'Annuler', conflit: 'Liste relue.', erreur: 'Cette action est impossible pour le moment.' },
} as const;
