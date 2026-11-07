// Fichiers attendus, écrits à la main depuis les jeux (jamais copiés depuis la sortie du code).
const TAB = String.fromCharCode(9);
const CRLF = String.fromCharCode(13, 10);
const ENTETE = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'].join(TAB);
const assembler = (lignes: string[]): string => [ENTETE, ...lignes].join(CRLF);

export const ATTENDU_FEC_A = assembler([
  ['AN', 'A nouveaux', 'AN-1', '20250401', '512000', 'Banque', '', '', 'e-an1', '20250401', 'Report banque', '5000,00', '0,00', '', '', '20250401', '', ''].join(TAB),
  ['AN', 'A nouveaux', 'AN-1', '20250401', '101000', 'Capital', '', '', 'e-an1', '20250401', 'Report capital', '0,00', '5000,00', '', '', '20250401', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20250510', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-ve1', '20250510', 'Facture Alpha', '12000,00', '0,00', '', '', '20250510', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20250510', '706000', 'Prestations', '', '', 'e-ve1', '20250510', 'Prestation', '0,00', '10000,00', '', '', '20250510', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20250510', '445710', 'TVA collectee', '', '', 'e-ve1', '20250510', 'TVA', '0,00', '2000,00', '', '', '20250510', '', ''].join(TAB),
  ['AC', 'Achats', 'AC-1', '20250520', '607000', 'Achats', '', '', 'e-ac1', '20250520', 'Achat fournitures', '1600,00', '0,00', '', '', '20250520', '', ''].join(TAB),
  ['AC', 'Achats', 'AC-1', '20250520', '445660', 'TVA deductible', '', '', 'e-ac1', '20250520', 'TVA', '400,00', '0,00', '', '', '20250520', '', ''].join(TAB),
  ['AC', 'Achats', 'AC-1', '20250520', '401000', 'Fournisseurs', 'FOU001', 'Fournisseur Beta fictif', 'e-ac1', '20250520', 'Facture Beta', '0,00', '2000,00', '', '', '20250520', '', ''].join(TAB),
]);

export const ATTENDU_DECALE = assembler([
  ['AN', 'A nouveaux', 'AN-1', '20250701', '512000', 'Banque', '', '', 'e-an1', '20250701', 'Report banque', '1000,00', '0,00', '', '', '20250701', '', ''].join(TAB),
  ['AN', 'A nouveaux', 'AN-1', '20250701', '101000', 'Capital', '', '', 'e-an1', '20250701', 'Report capital', '0,00', '1000,00', '', '', '20250701', '', ''].join(TAB),
  ['AC', 'Achats', 'AC-9', '20250715', '607000', 'Achats', '', '', 'e-ac1', '20250715', 'Achat', '30,00', '0,00', '', '', '20250715', '', ''].join(TAB),
  ['AC', 'Achats', 'AC-9', '20250715', '401000', 'Fournisseurs', 'FOU001', 'Fournisseur Beta fictif', 'e-ac1', '20250715', 'Facture Beta', '0,00', '30,00', '', '', '20250715', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20260630', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-ve1', '20260630', 'Facture Alpha', '120,00', '0,00', '', '', '20260630', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20260630', '706000', 'Prestations', '', '', 'e-ve1', '20260630', 'Prestation', '0,00', '120,00', '', '', '20260630', '', ''].join(TAB),
]);

export const ATTENDU_CONTRE_PASSATION = assembler([
  ['VE', 'Ventes', 'VE-1', '20260110', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-ve1', '20260110', 'Facture Alpha', '100,00', '0,00', '', '', '20260110', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20260110', '706000', 'Prestations', '', '', 'e-ve1', '20260110', 'Prestation', '0,00', '100,00', '', '', '20260110', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-2', '20260112', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-ve2', '20260112', 'Contre-passation VE-1', '0,00', '100,00', '', '', '20260112', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-2', '20260112', '706000', 'Prestations', '', '', 'e-ve2', '20260112', 'Contre-passation VE-1', '100,00', '0,00', '', '', '20260112', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-3', '20260112', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-ve3', '20260112', 'Facture Alpha corrigee', '80,00', '0,00', '', '', '20260112', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-3', '20260112', '706000', 'Prestations', '', '', 'e-ve3', '20260112', 'Prestation', '0,00', '80,00', '', '', '20260112', '', ''].join(TAB),
]);

export const ATTENDU_LETTRAGE_PARTIEL = assembler([
  ['VE', 'Ventes', 'VE-1', '20260110', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-ve1', '20260110', 'Facture Alpha', '1200,00', '0,00', 'AA', '20260210', '20260110', '', ''].join(TAB),
  ['VE', 'Ventes', 'VE-1', '20260110', '706000', 'Prestations', '', '', 'e-ve1', '20260110', 'Prestation', '0,00', '1200,00', '', '', '20260110', '', ''].join(TAB),
  ['BQ', 'Banque', 'BQ-1', '20260210', '512000', 'Banque', '', '', 'e-bq1', '20260210', 'Reglement Alpha', '1000,00', '0,00', '', '', '20260210', '', ''].join(TAB),
  ['BQ', 'Banque', 'BQ-1', '20260210', '411000', 'Clients', 'CLI001', 'Client Alpha fictif', 'e-bq1', '20260210', 'Reglement Alpha', '0,00', '1000,00', 'AA', '20260210', '20260210', '', ''].join(TAB),
]);
