// Carte « TVA perdue » : explique au client la part de TVA qui reste en charge. Vouvoiement, sans conseil.
// Paramètres de gabarit permis : {montant}, {motif}.
export const carteTvaPerdue: { titre: string; detail: string } = {
  titre: 'TVA perdue',
  detail: 'Une part de TVA de {montant} ne peut pas être récupérée ({motif}) : elle est ajoutée à la dépense dans l’écriture proposée.',
};

/** Produit la carte si une part est perdue, sinon rien. Montant déjà formaté, en texte. */
export function produireCarteTvaPerdue(montantPerdueCentimes: number, montant: string, motif: string): { titre: string; detail: string } | null {
  if (!Number.isSafeInteger(montantPerdueCentimes) || montantPerdueCentimes <= 0) return null;
  return { titre: carteTvaPerdue.titre, detail: carteTvaPerdue.detail.replace('{montant}', montant).replace('{motif}', motif) };
}
