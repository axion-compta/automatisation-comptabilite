// Fichiers attendus du banc 2, écrits à la main depuis les jeux (jamais copiés depuis la sortie du code).
const TAB = String.fromCharCode(9);
const CRLF = String.fromCharCode(13, 10);
export const ENTETE_2 = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'].join(TAB);
const assembler = (lignes: string[]): string => [ENTETE_2, ...lignes].join(CRLF);
const ligne = (v: string[]): string => v.join(TAB);
// Facture Alpha : client au débit, prestation au crédit.
const facture = (id: string, date: string, montant: string): string[] => [
  ligne(['VE', 'Ventes', `VE-${id.slice(-1)}`, date, '411000', 'Clients', 'CLI001', 'Client Alpha fictif', id, date, 'Facture Alpha', montant, '0,00', '', '', date, '', '']),
  ligne(['VE', 'Ventes', `VE-${id.slice(-1)}`, date, '706000', 'Prestations', '', '', id, date, 'Prestation', '0,00', montant, '', '', date, '', '']),
];
const reglement = (id: string, date: string, montant: string): string[] => [
  ligne(['BQ', 'Banque', `BQ-${id.slice(-1)}`, date, '512000', 'Banque', '', '', id, date, 'Reglement Alpha', montant, '0,00', '', '', date, '', '']),
  ligne(['BQ', 'Banque', `BQ-${id.slice(-1)}`, date, '411000', 'Clients', 'CLI001', 'Client Alpha fictif', id, date, 'Reglement Alpha', '0,00', montant, '', '', date, '', '']),
];
const achat = (date: string, montant: string, libelle: string): string[] => [
  ligne(['AC', 'Achats', 'AC-1', date, '607000', 'Achats', '', '', 'e-ac1', date, libelle, montant, '0,00', '', '', date, '', '']),
  ligne(['AC', 'Achats', 'AC-1', date, '401000', 'Fournisseurs', 'FOU001', 'Fournisseur Beta fictif', 'e-ac1', date, 'Facture Beta', '0,00', montant, '', '', date, '', '']),
];

export const ATTENDU_SIX_MOIS = assembler([...facture('e-ve1', '20251015', '1000,00'), ...reglement('e-bq1', '20260320', '600,00')]);
export const ATTENDU_DIX_HUIT_MOIS = assembler([...facture('e-ve1', '20250210', '240,00'), ...achat('20260505', '50,00', 'Achat fournitures')]);
export const ATTENDU_VINGT_QUATRE_MOIS = assembler([...facture('e-ve1', '20240910', '360,00'), ...reglement('e-bq1', '20260615', '360,00')]);
export const ATTENDU_SANS_MOUVEMENT = ENTETE_2;
// Tri : date d'écriture croissante ; les brouillons n'apparaissent pas.
export const ATTENDU_BROUILLONS_ABSENTS = assembler([
  ...facture('e-ve1', '20260110', '120,00'),
  ...reglement('e-bq1', '20260210', '50,00'),
  ...achat('20260212', '30,00', 'Achat fournitures'),
]);
