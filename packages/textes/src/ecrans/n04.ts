// Textes de l'écran N04 « Mes comptes comptables ». Vouvoiement.
export const n04 = {
  titre: 'Mes comptes comptables',
  champs: {
    annee: 'Année',
    classe: 'Classe de comptes',
    recherche: 'Rechercher un compte',
  },
  toutesClasses: 'Toutes les classes',
  classe: 'Classe {numero}',
  rechercher: 'Rechercher',
  tableau: {
    legende: 'Plan comptable et solde de l’année',
    numero: 'Numéro',
    libelle: 'Libellé',
    solde: 'Solde',
    soldeNegatif: 'Solde négatif : {montant}',
  },
  pagination: {
    precedent: 'Précédent',
    suivant: 'Suivant',
    resume: '{debut} à {fin} sur {total}',
  },
  etats: {
    chargement: 'Chargement en cours…',
    videTitre: 'Aucun compte à afficher.',
    videDetail: 'Modifiez la classe ou la recherche pour élargir la liste.',
    aucuneAnnee: 'Aucune année comptable n’est encore ouverte.',
    reessayer: 'Réessayer',
    reseau: 'Connexion impossible. Vérifiez votre réseau.',
    acces: 'Vous n’avez pas accès à cette page.',
    introuvable: 'Cette année comptable n’existe pas.',
    generique: 'Une erreur s’est produite. Réessayez dans un instant.',
  },
} as const;
