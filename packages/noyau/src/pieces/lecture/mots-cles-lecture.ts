// Mots-clés du lecteur B : minuscules, sans accents.
export const MOTS_CLES_LECTURE = {
  version: 1,
  ttc: ['total ttc', 'net a payer', 'total a payer', 'montant ttc', 'amount due', 'total due', 'grand total'],
  ht: ['total ht', 'montant ht', 'base ht', 'ht', 'subtotal', 'net amount', 'total excl vat'],
  tva: ['tva', 'vat'],
  numero: ['facture n', 'facture no', 'invoice no', 'invoice number', 'invoice n'],
  date: ['date de facture', 'invoice date', 'date'],
} as const;
