// Mots-clés (minuscules, sans accents) qui confirment le type d'une pièce. Modifier la liste = changer la version.
export const MOTS_CLES_TYPES = {
  version: 1,
  avoir: ['avoir', 'credit note', 'credit memo', 'note de credit'],
  acompte: ['acompte', 'down payment', 'deposit invoice', 'advance payment'],
  releve: ['releve de compte', 'statement of account', 'account statement', 'releve fournisseur'],
  commande: ['bon de commande', 'purchase order'],
  devis: ['devis', 'quotation', 'proforma'],
  contrat: ['contrat de', 'contract of'],
  reservation: ['reservation', 'confirmation de reservation', 'booking confirmation'],
  rappel: ['lettre de relance', 'payment reminder', 'reminder letter'],
} as const;
