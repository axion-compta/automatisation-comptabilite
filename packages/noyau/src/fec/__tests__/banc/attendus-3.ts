// Fichiers attendus du banc 3, écrits à la main depuis les jeux (jamais copiés depuis la sortie du code).
const TAB = String.fromCharCode(9);
const CRLF = String.fromCharCode(13, 10);
const ENTETE = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'].join(TAB);
const assembler = (lignes: string[][]): string => [ENTETE, ...lignes.map((v) => v.join(TAB))].join(CRLF);
// Une ligne : la date sert d'écriture, de pièce et de validation ; `tiers` = [numéro, nom] ou vide.
const L = (j: string[], num: string, date: string, compte: string[], tiers: string[], id: string, lib: string, deb: string, cre: string): string[] =>
  [j[0] ?? '', j[1] ?? '', num, date, compte[0] ?? '', compte[1] ?? '', tiers[0] ?? '', tiers[1] ?? '', id, date, lib, deb, cre, '', '', date, '', ''];
const [AN, VE, AC, BQ1, OD] = [['AN', 'A nouveaux'], ['VE', 'Ventes'], ['AC', 'Achats'], ['BQ1', 'Banque principale'], ['OD', 'Operations diverses']];
const [BANQUE, CAPITAL, CLIENTS, FOURN, PREST, ACHATS] = [['512000', 'Banque'], ['101000', 'Capital'], ['411000', 'Clients'], ['401000', 'Fournisseurs'], ['706000', 'Prestations'], ['607000', 'Achats']];
const [ALPHA, GAMMA, DELTA, BETA] = [['CLI001', 'Client Alpha fictif'], ['CLI002', 'Client Gamma fictif'], ['CLI003', 'Client Delta fictif'], ['FOU001', 'Fournisseur Beta fictif']];
const AUCUN: string[] = [];

export const ATTENDU_PLUSIEURS_JOURNAUX = assembler([
  L(AN, 'AN-1', '20260101', BANQUE, AUCUN, 'e-an-1', 'Report banque', '1000,00', '0,00'),
  L(AN, 'AN-1', '20260101', CAPITAL, AUCUN, 'e-an-1', 'Report capital', '0,00', '1000,00'),
  L(VE, 'VE-1', '20260110', CLIENTS, ALPHA, 'e-ve-1', 'Facture Alpha', '120,00', '0,00'),
  L(VE, 'VE-1', '20260110', PREST, AUCUN, 'e-ve-1', 'Prestation', '0,00', '120,00'),
  L(AC, 'AC-1', '20260112', ACHATS, AUCUN, 'e-ac-1', 'Achat fournitures', '30,00', '0,00'),
  L(AC, 'AC-1', '20260112', FOURN, BETA, 'e-ac-1', 'Facture Beta', '0,00', '30,00'),
  L(BQ1, 'BQ1-1', '20260120', BANQUE, AUCUN, 'e-bq1-1', 'Reglement Alpha', '120,00', '0,00'),
  L(BQ1, 'BQ1-1', '20260120', CLIENTS, ALPHA, 'e-bq1-1', 'Reglement Alpha', '0,00', '120,00'),
  L(OD, 'OD-1', '20260131', ACHATS, AUCUN, 'e-od-1', 'Regularisation', '5,00', '0,00'),
  L(OD, 'OD-1', '20260131', FOURN, BETA, 'e-od-1', 'Regularisation', '0,00', '5,00'),
]);

export const ATTENDU_A_NOUVEAUX_PAR_TIERS = assembler([
  L(AN, 'AN-1', '20260101', CLIENTS, ALPHA, 'e-an-1', 'Report Alpha', '300,00', '0,00'),
  L(AN, 'AN-1', '20260101', CLIENTS, GAMMA, 'e-an-1', 'Report Gamma', '200,00', '0,00'),
  L(AN, 'AN-1', '20260101', CLIENTS, DELTA, 'e-an-1', 'Report Delta', '100,00', '0,00'),
  L(AN, 'AN-1', '20260101', CAPITAL, AUCUN, 'e-an-1', 'Report capital', '0,00', '600,00'),
  L(BQ1, 'BQ1-1', '20260205', BANQUE, AUCUN, 'e-bq1-1', 'Reglement Gamma', '120,00', '0,00'),
  L(BQ1, 'BQ1-1', '20260205', CLIENTS, GAMMA, 'e-bq1-1', 'Reglement Gamma', '0,00', '120,00'),
]);

export const ATTENDU_CHANGEMENT_DE_LOGICIEL = assembler([
  L(AN, 'AN-1', '20260301', CLIENTS, ALPHA, 'e-an-1', 'Reprise Alpha', '400,00', '0,00'),
  L(AN, 'AN-1', '20260301', BANQUE, AUCUN, 'e-an-1', 'Reprise banque', '250,00', '0,00'),
  L(AN, 'AN-1', '20260301', FOURN, BETA, 'e-an-1', 'Reprise Beta', '0,00', '150,00'),
  L(AN, 'AN-1', '20260301', CAPITAL, AUCUN, 'e-an-1', 'Reprise capital', '0,00', '500,00'),
  L(VE, 'VE-1', '20260310', CLIENTS, ALPHA, 'e-ve-1', 'Facture Alpha', '80,00', '0,00'),
  L(VE, 'VE-1', '20260310', PREST, AUCUN, 'e-ve-1', 'Prestation', '0,00', '80,00'),
  L(BQ1, 'BQ1-1', '20260315', BANQUE, AUCUN, 'e-bq1-1', 'Reglement Alpha', '200,00', '0,00'),
  L(BQ1, 'BQ1-1', '20260315', CLIENTS, ALPHA, 'e-bq1-1', 'Reglement Alpha', '0,00', '200,00'),
]);
