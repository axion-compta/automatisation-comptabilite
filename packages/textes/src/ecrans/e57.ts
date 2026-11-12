// Écran E57 « Ce que le logiciel a vérifié » : tous les textes visibles. Vouvoiement.
export const e57 = {
  titre: 'Ce que le logiciel a vérifié',
  filtre: { nom: 'Résultat affiché', tous: 'Tous' },
  resultats: { OK: 'Réussi', ALERTE: 'Alerte', IMPOSSIBLE: 'Impossible à vérifier', NON_APPLICABLE: 'Non applicable', ECARTE: 'Écarté' },
  resume: { reussis: 'réussis', alertes: 'alertes', impossibles: 'impossibles' },
  tableau: { legende: 'Contrôles tracés sur votre année', controle: 'Contrôle', resultat: 'Résultat', valeur: 'Valeur', ecart: 'Écart', date: 'Date' },
  valeurAbsente: { tiret: '–', libelle: 'Valeur non disponible' },
  etats: {
    chargement: 'Chargement des contrôles…',
    erreur: 'Impossible de charger les contrôles.',
    acces: "Vous n'avez pas accès à cet écran.",
    aucunExercice: "Aucune année n'est encore ouverte.",
    vide: 'Aucun contrôle à afficher',
    videDetail: "Les contrôles apparaîtront ici dès qu'ils auront été faits.",
  },
} as const;
