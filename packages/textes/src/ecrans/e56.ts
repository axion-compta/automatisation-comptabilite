// Écran E56 « Mon activité » : tous les textes visibles. Vouvoiement.
export const e56 = {
  titre: 'Mon activité',
  vues: { nom: 'Période affichée', mois: 'Mois', exercice: 'Exercice', depuis_debut: 'Depuis le début' },
  chiffres: { ca: "Chiffre d'affaires", charges: 'Charges', resultat: 'Résultat provisoire avant impôt', tresorerie: 'Trésorerie' },
  periode: 'Période',
  comparaison: { titre: 'Exercice précédent', tronquee: 'Comparaison sur la même durée.' },
  vide: {
    pas_d_exercice_precedent: "Pas d'exercice précédent à comparer.",
    precedent_trop_court: "L'exercice précédent est trop court pour la comparaison.",
  },
  tableau: { legende: 'Vos chiffres clés, période et exercice précédent', indicateur: 'Indicateur', periode: 'Période', precedent: 'Exercice précédent' },
  etats: {
    chargement: 'Chargement de votre activité…',
    erreur: 'Impossible de charger votre activité.',
    acces: "Vous n'avez pas accès à cet écran.",
    aucunExercice: "Aucun exercice n'est encore ouvert.",
  },
} as const;
