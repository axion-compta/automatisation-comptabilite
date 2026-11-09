// Écran E12 « Ma banque » : tous les textes visibles. Vouvoiement.
export const e12 = {
  titre: 'Ma banque',
  comptes: { liste: 'Vos comptes bancaires', solde: 'Solde au {date}', soldeNegatif: 'Solde négatif : {montant}' },
  filtres: { etat: 'État des lignes', compte: 'Compte', tous: 'Tous', sansPiece: 'Sans pièce' },
  tableau: {
    legende: 'Lignes de vos comptes bancaires',
    date: 'Date',
    libelle: 'Libellé',
    montant: 'Montant',
    etat: 'État',
    montantNegatif: 'Montant négatif : {montant}',
  },
  pagination: { precedent: 'Page précédente', suivant: 'Page suivante', resume: '{debut} à {fin} sur {total}' },
  etats: {
    chargement: 'Chargement de votre banque…',
    erreur: 'Impossible de charger votre banque.',
    acces: "Vous n'avez pas accès à cet écran.",
    videComptes: "Aucun compte bancaire n'est encore relié.",
    videLignes: 'Aucune ligne ne correspond à ce filtre.',
  },
} as const;
