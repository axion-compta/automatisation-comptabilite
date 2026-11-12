// Écran E56 « Mon activité » : tous les textes visibles. Vouvoiement.
export const e56 = {
  titre: 'Mon activité',
  vues: { nom: 'Période affichée', mois: 'Mois', exercice: 'Année en cours', depuis_debut: 'Depuis le début' },
  chiffres: { ca: "Chiffre d'affaires", charges: 'Charges', resultat: 'Résultat provisoire avant impôt', tresorerie: 'Trésorerie' },
  periode: 'Période',
  comparaison: { titre: 'Année précédente', tronquee: 'Comparaison sur la même durée.' },
  vide: {
    pas_d_exercice_precedent: "Pas d'année précédente à comparer.",
    precedent_trop_court: "L'année précédente est trop courte pour la comparaison.",
  },
  tableau: { legende: 'Vos chiffres clés, période et année précédente', indicateur: 'Indicateur', periode: 'Période', precedent: 'Année précédente' },
  etats: {
    chargement: 'Chargement de votre activité…',
    erreur: 'Impossible de charger votre activité.',
    acces: "Vous n'avez pas accès à cet écran.",
    aucunExercice: "Aucune année n'est encore ouverte.",
  },
} as const;
