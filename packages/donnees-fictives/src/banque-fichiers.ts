// Dix fichiers de relevés fictifs de référence (V3-BAN-012, V3-DEM-004) : chaque fichier porte son profil, sans devinette.
// Lignes tirées du jeu à graine fixe de banque.ts ; IBAN à clé fausse seulement ; aucune banque réelle.
import type { ProfilImport } from '../../noyau/src/banque/import/profil.js';
import type { PagePdf, ReglesPdf } from '../../noyau/src/banque/import/pdf-texte.js';
import { genererBanque } from './banque.js';
import { GRAINE } from './generateur.js';

export type FormatReference = 'csv' | 'ofx1' | 'ofx2' | 'camt053' | 'pdf';
export type Attendu = { lignes: number; soldeOuverture?: number; soldeCloture?: number; controle: 'OK' | 'IMPOSSIBLE' };
export type FichierReference = {
  banque: string; format: FormatReference; texte?: string; pages?: PagePdf[]; profil?: ProfilImport; reglesPdf?: ReglesPdf; attendu: Attendu;
};

type L = { date: string; montant: number; libelle: string; ref: string; attente?: boolean };
const PAR_FICHIER = 6;
const SOLDE_BASE = 100000;
const PAS_SOLDE = 5000;
const pad = (n: number): string => String(n).padStart(2, '0');
const somme = (ls: L[]): number => ls.filter((l) => l.attente !== true).reduce((s, l) => s + l.montant, 0);
const jma = (d: string, sep: string): string => `${d.slice(8)}${sep}${d.slice(5, 7)}${sep}${d.slice(0, 4)}`;
const nu = (d: string): string => d.replaceAll('-', '');
const decimal = (c: number, dec: string, signe = 'avant'): string => {
  const a = Math.abs(c);
  const t = `${Math.trunc(a / 100)}${dec}${pad(a % 100)}`;
  return c < 0 ? (signe === 'avant' ? `-${t}` : `${t}-`) : t;
};
const sens = (c: number): 'CRDT' | 'DBIT' => (c < 0 ? 'DBIT' : 'CRDT');
const bornes = (ls: L[]): [string, string] => [ls[0]!.date, ls[ls.length - 1]!.date];
const rep = (n: number, f: (i: number) => string): string => Array.from({ length: n }, (_, i) => f(i)).join('\n');

const CSV_SIGNE = { type: 'signe', colonne: '2' } as const;
const profilCsv = (p: Partial<ProfilImport> & Pick<ProfilImport, 'formatDate' | 'format' | 'signe'>): ProfilImport =>
  ({ colonnes: { date: 0, libelle: [1] }, deviseParDefaut: 'EUR', ligneEntete: 0, ...p });

function csv(ls: L[], ouv: number, i: number): FichierReference {
  const banque = `Banque Exemple ${i + 1}`;
  const att = (a: Partial<Attendu> = {}): Attendu => ({ lignes: ls.length, controle: 'IMPOSSIBLE', ...a });
  let solde = ouv;
  const soldes = ls.map((l) => (solde += l.montant));
  if (i === 0) {
    const f = { decimal: ',', milliers: '' } as const;
    const corps = ls.map((l, k) => `${jma(l.date, '/')};${l.libelle};${decimal(l.montant, ',')};${decimal(soldes[k]!, ',')}`);
    const texte = ['Date;Libelle;Montant;Solde', ...corps, `Total;;${decimal(somme(ls), ',')};`].join('\n');
    return { banque, format: 'csv', texte, profil: profilCsv({ colonnes: { date: 0, libelle: [1], soldeCourant: 3 }, signe: CSV_SIGNE, format: f, formatDate: 'JJ/MM/AAAA' }), attendu: att({ soldeOuverture: ouv, soldeCloture: ouv + somme(ls), controle: 'OK' }) };
  }
  if (i === 1) {
    const texte = ['Date,Libelle,Montant', ...ls.map((l) => `${l.date},${l.libelle},${decimal(l.montant, '.')}`)].join('\n');
    return { banque, format: 'csv', texte, profil: profilCsv({ signe: CSV_SIGNE, format: { decimal: '.', milliers: '' }, formatDate: 'AAAA-MM-JJ' }), attendu: att() };
  }
  if (i === 2) {
    const corps = ls.map((l, k) => `${jma(l.date, '/')};${l.libelle};${l.montant < 0 ? decimal(-l.montant, ',') : ''};${l.montant > 0 ? decimal(l.montant, ',') : ''};${decimal(soldes[k]!, ',')}`);
    const signe = { type: 'debit_credit', debit: '2', credit: '3' } as const;
    return { banque, format: 'csv', texte: ['Date;Libelle;Debit;Credit;Solde', ...corps].join('\n'), profil: profilCsv({ colonnes: { date: 0, libelle: [1], soldeCourant: 4 }, signe, format: { decimal: ',', milliers: '' }, formatDate: 'JJ/MM/AAAA' }), attendu: att({ soldeOuverture: ouv, soldeCloture: ouv + somme(ls), controle: 'OK' }) };
  }
  const corps = ls.map((l) => `${jma(l.date, '-')};Règlement é ${l.libelle};${decimal(l.montant, ',', 'apres')}`);
  const signe = { type: 'suffixe_moins', colonne: '2' } as const;
  return { banque, format: 'csv', texte: ['Date;Libellé;Montant', ...corps].join('\n'), profil: profilCsv({ signe, format: { decimal: ',', milliers: '' }, formatDate: 'JJ-MM-AAAA' }), attendu: att() };
}

function ofx(ls: L[], ouv: number, i: number, iban: string, xml: boolean): FichierReference {
  const [debut, fin] = bornes(ls);
  const f = (n: string, v: string): string => (xml ? `<${n}>${v}</${n}>` : `<${n}>${v}`);
  const trn = rep(ls.length, (k) => {
    const l = ls[k]!;
    return `<STMTTRN>\n${f('TRNTYPE', l.montant < 0 ? 'DEBIT' : 'CREDIT')}\n${f('DTPOSTED', nu(l.date))}\n${f('TRNAMT', decimal(l.montant, '.'))}\n${f('FITID', `${l.ref}-${k}`)}\n${f('NAME', l.libelle)}\n</STMTTRN>`;
  });
  const entete = xml ? '<?xml version="1.0" encoding="UTF-8"?>\n' : 'OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n';
  const texte = `${entete}<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<STMTRS>\n${f('CURDEF', 'EUR')}\n<BANKACCTFROM>\n${f('ACCTID', iban)}\n</BANKACCTFROM>\n<BANKTRANLIST>\n${f('DTSTART', nu(debut))}\n${f('DTEND', nu(fin))}\n${trn}\n</BANKTRANLIST>\n<LEDGERBAL>\n${f('BALAMT', decimal(ouv + somme(ls), '.'))}\n</LEDGERBAL>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>\n`;
  return { banque: `Banque Exemple ${i + 1}`, format: xml ? 'ofx2' : 'ofx1', texte, attendu: { lignes: ls.length, soldeCloture: ouv + somme(ls), controle: 'IMPOSSIBLE' } };
}

const bal = (cd: string, c: number): string => `<Bal><Tp><CdOrPrtry><Cd>${cd}</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">${decimal(Math.abs(c), '.')}</Amt><CdtDbtInd>${sens(c)}</CdtDbtInd></Bal>`;
const entree = (l: L, k: number): string =>
  `<Ntry><Amt Ccy="EUR">${decimal(Math.abs(l.montant), '.')}</Amt><CdtDbtInd>${sens(l.montant)}</CdtDbtInd><Sts>${l.attente === true ? 'PDNG' : 'BOOK'}</Sts><BookgDt><Dt>${l.date}</Dt></BookgDt><NtryDtls><TxDtls><Refs><EndToEndId>${l.ref}-${k}</EndToEndId></Refs></TxDtls></NtryDtls><AddtlNtryInf>${l.libelle}</AddtlNtryInf></Ntry>`;
const stmt = (ls: L[], ouv: number, iban: string): string =>
  `<Stmt><Id>R${iban.slice(-4)}</Id><Acct><Id><IBAN>${iban}</IBAN></Id><Ccy>EUR</Ccy></Acct>${bal('OPBD', ouv)}${bal('CLBD', ouv + somme(ls))}${ls.map(entree).join('')}</Stmt>`;

function camt(groupes: L[][], ouv: number, i: number, ibans: string[]): FichierReference {
  const corps = groupes.map((g, k) => stmt(g, ouv, ibans[k]!)).join('');
  const texte = `<?xml version="1.0" encoding="UTF-8"?>\n<Document><BkToCstmrStmt><GrpHdr><MsgId>M${i}</MsgId></GrpHdr>${corps}</BkToCstmrStmt></Document>\n`;
  const premier = groupes[0]!;
  return { banque: `Banque Exemple ${i + 1}`, format: 'camt053', texte, attendu: { lignes: groupes.flat().length, soldeOuverture: ouv, soldeCloture: ouv + somme(premier), controle: 'OK' } };
}

const REGLES_PDF: ReglesPdf = {
  ligne: '^(?<date>\\d{2}/\\d{2}/\\d{4}) (?<libelle>.+?) (?<montant>-?\\d+,\\d{2})$',
  soldeOuverture: '^Solde precedent (?<solde>-?\\d+,\\d{2})$',
  soldeCloture: '^Solde final (?<solde>-?\\d+,\\d{2})$',
  entetePeriode: '^Releve du (?<du>\\d{2}/\\d{2}/\\d{4}) au (?<au>\\d{2}/\\d{2}/\\d{4})$',
  formatDate: 'JJ/MM/AAAA', format: { decimal: ',', milliers: ' ' }, devise: 'EUR',
};

function pdf(ls: L[], ouv: number, i: number): FichierReference {
  const [debut, fin] = bornes(ls);
  const lignes = [`Releve du ${jma(debut, '/')} au ${jma(fin, '/')}`, `Solde precedent ${decimal(ouv, ',')}`,
    ...ls.map((l) => `${jma(l.date, '/')} ${l.libelle} ${decimal(l.montant, ',')}`), `Solde final ${decimal(ouv + somme(ls), ',')}`];
  return { banque: `Banque Exemple ${i + 1}`, format: 'pdf', pages: [{ numero: 1, lignes }], reglesPdf: REGLES_PDF, attendu: { lignes: ls.length, soldeOuverture: ouv, soldeCloture: ouv + somme(ls), controle: 'OK' } };
}

export function fichiersDeReference(graine: number = GRAINE): FichierReference[] {
  const jeu = genererBanque(graine);
  const lots: L[][] = Array.from({ length: 10 }, (_, i) =>
    jeu.lignes.slice(i * PAR_FICHIER, (i + 1) * PAR_FICHIER).map((l) => ({ date: l.dateOperation, montant: l.montant, libelle: l.libelleBrut, ref: l.id }))
      .sort((a, b) => a.date.localeCompare(b.date)));
  const ouv = (i: number): number => SOLDE_BASE + i * PAS_SOLDE;
  const ibans = jeu.comptes.map((c) => c.ibanFaux);
  const enAttente = lots[7]!.map((l, k, t) => (k === t.length - 1 ? { ...l, attente: true } : l));
  const deux = [lots[8]!.slice(0, PAR_FICHIER / 2), lots[8]!.slice(PAR_FICHIER / 2)];
  return [
    csv(lots[0]!, ouv(0), 0), csv(lots[1]!, ouv(1), 1), csv(lots[2]!, ouv(2), 2), csv(lots[3]!, ouv(3), 3),
    ofx(lots[4]!, ouv(4), 4, ibans[0]!, false), ofx(lots[5]!, ouv(5), 5, ibans[1]!, false), ofx(lots[6]!, ouv(6), 6, ibans[2]!, true),
    camt([enAttente], ouv(7), 7, [ibans[0]!]), camt(deux, ouv(8), 8, [ibans[1]!, ibans[2]!]), pdf(lots[9]!, ouv(9), 9),
  ];
}
