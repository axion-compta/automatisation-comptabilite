// Écran E17 « Mes frais et trajets en voiture » : tous les textes visibles. Vouvoiement.
export const e17 = {
  titre: 'Mes frais et trajets en voiture',
  vide: "Aucun frais pour l'instant. Photographiez un ticket ou ajoutez un trajet.",
  boutons: { photographier: 'Photographier', dicter: 'Dicter', ajouterTrajet: 'Ajouter un trajet' },
  chargementLecture: 'Lecture du ticket…',
  erreurLecture: "Je n'arrive pas à lire ce ticket. Reprenez la photo ou saisissez le montant.",
  totaux: {
    aRembourser: 'À rembourser',
    enAttente: 'En attente',
    exclus: 'Exclus',
    kmSansMontant: '{km} km sans montant',
  },
  payeParEntreprise: "Payé par la carte de l'entreprise : rien à rembourser",
  statuts: {
    propose: 'Préparé par IA, à valider',
    valide: 'Validé',
    rembourse: 'Remboursé',
    enCompteCourant: 'En compte courant',
  },
  manques: {
    justificatif: 'Ajoutez le justificatif de ce frais.',
    motifPerte: 'Indiquez pourquoi le justificatif est perdu.',
    motifTrajet: 'Indiquez le motif de ce trajet.',
    departArrivee: "Indiquez le lieu de départ et le lieu d'arrivée.",
    vehicule: 'Choisissez le véhicule utilisé.',
    carteGrise: 'Ajoutez la carte grise du véhicule.',
    montantIllisible: 'Le montant est illisible : saisissez-le.',
    dateIllisible: 'La date est illisible : saisissez-la.',
  },
  payeur: {
    question: 'Qui a payé ce ticket de {montant} ?',
    societe: 'La société',
    moi: 'Moi, avec mon argent',
    paraitSociete: "Ce ticket semble payé par la carte de l'entreprise : il n'est pas à rembourser.",
    attenteReleve: 'Remboursable dès que le relevé de {mois} sera ajouté.',
    conflit:
      "La carte de l'entreprise a payé {montant} le {date} chez {commercant} : cette dépense n'est pas à rembourser. Si c'est une erreur, signalez-le.",
  },
  bareme:
    "Barème {annee} à confirmer : aucun taux n'est encore appliqué. Le montant sera calculé quand la source du barème sera confirmée.",
  periode: {
    du: 'Du',
    au: 'Au',
    ordre: 'La date de début doit précéder la date de fin.',
  },
  erreurs: {
    frais_paye_societe: "Ce frais a été payé par la carte de l'entreprise : il n'est pas à rembourser.",
    justificatif_manquant: 'Il manque le justificatif : ajoutez-le ou indiquez pourquoi il est perdu.',
    bareme_a_verifier: "Le barème de cette année est à confirmer : le montant n'est pas encore calculé.",
    vehicule_societe: "Ce véhicule appartient à l'entreprise : les indemnités kilométriques ne s'appliquent pas.",
    deux_roues_non_pris_en_charge: 'Les deux-roues ne sont pas encore pris en charge.',
    remboursement_superieur: 'Le remboursement ne peut pas dépasser le montant du frais.',
    compte_courant_reserve_associes: 'Le compte courant est réservé aux associés.',
    doublon_piece: 'Ce justificatif a déjà été utilisé pour un autre frais.',
  },
} as const;
