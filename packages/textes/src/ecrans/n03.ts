// Textes de l'écran N03 « Mes années comptables ». Vouvoiement.
export const n03 = {
  titre: 'Mes années comptables',
  legende: 'Liste de vos années comptables',
  colonnes: { libelle: 'Année', du: 'Du', au: 'Au', etat: 'État' },
  etats: { ouvert: 'Ouverte', cloture: 'Clôturée' },
  chargement: 'Chargement de vos années comptables…',
  vide: 'Aucune année comptable pour le moment.',
  videDetail: 'Vos années comptables apparaîtront ici.',
  erreur: {
    acces: "Vous n'avez pas accès à vos années comptables.",
    reseau: 'Connexion impossible. Vérifiez votre réseau, puis réessayez.',
    autre: 'Vos années comptables ne peuvent pas être affichées pour le moment.',
  },
} as const;
