// Écran E08 « Fiche d'une pièce » : tous les textes visibles. Vouvoiement, aucun prix, aucun taux légal.
// Le jeton {taux} est remplacé par le taux lu sur la pièce au moment de l'affichage.
export const e08 = {
  titre: 'Fiche de la pièce',
  retour: 'Retour à mes documents',
  etats: {
    chargement: 'Chargement de la pièce…',
    inconnue: 'Cette pièce est introuvable.',
    erreur: 'Impossible de charger la pièce.',
  },
  protegee: 'Pièce protégée : son contenu n’est pas affiché.',
  champs: {
    fournisseur_nom: 'Fournisseur',
    fournisseur_siren: 'Numéro SIREN du fournisseur',
    numero: 'Numéro de la pièce',
    date_piece: 'Date de la pièce',
    ttc: 'Montant toutes taxes comprises',
    autre: 'Autre information',
  },
  prefixes: {
    ht: 'Montant hors taxe au taux de {taux}',
    tva: 'Montant de TVA au taux de {taux}',
  },
  mots: { sur: 'Lu avec certitude', a_verifier: 'À vérifier', douteux: 'Douteux' },
  explication: 'Vérifiez ce champ avec votre pièce.',
  resume: { type: 'Type', etat: 'État', comptee: 'Prise en compte', motif: 'Motif' },
  types: { facture: 'Facture', ticket: 'Ticket', avoir: 'Avoir', recu: 'Reçu', facture_acompte: 'Facture d’acompte', reemise: 'Facture réémise', annulee: 'Facture annulée', non_piece: 'Document qui n’est pas une facture', plusieurs_factures: 'Plusieurs factures', releve_fournisseur: 'Relevé de fournisseur', montant_zero: 'Facture à zéro', facture_dans_corps: 'Facture dans un message', inconnu: 'Type inconnu', autre: 'Autre type' },
  etatsPiece: { recue: 'Reçue', quarantaine: 'En contrôle', preparee: 'Préparée', lue: 'Lue', prete: 'Prête', a_verifier: 'À vérifier', refusee: 'Refusée', en_erreur: 'En erreur', en_attente_quota: 'En attente', autre: 'En cours' },
  comptee: 'Comptée',
  nonComptee: 'Non comptée',
  motifs: { titre: 'Points à vérifier', plusieurs_factures: 'Ce fichier contient plusieurs factures.', champ_douteux: 'Un champ lu est douteux.', a_verifier: 'Cette pièce demande votre vérification.', annulee: 'La facture est annulée.', montant_zero: 'Le montant est à zéro.', releve: 'C’est un relevé de fournisseur, pas une facture.', commande: 'C’est un bon de commande, pas une facture.', inconnu: 'Le type de la pièce n’a pas été reconnu.', autre: 'Cette pièce demande votre vérification.' },
  originaux: 'Conservez vos justificatifs originaux : la photo sert à la saisie et au classement.',
  prepare: 'Préparé par IA, à valider',
} as const;
