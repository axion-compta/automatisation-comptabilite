import { describe, expect, it } from 'vitest';
import { analyserReleve } from '../analyse.js';
import type { ContexteAnalyse, EntreeReleve } from '../analyse.js';
import type { ProfilImport } from '../profil.js';
import type { ReglesPdf } from '../pdf-texte.js';

const PROFIL: ProfilImport = {
  colonnes: { date: 0, libelle: [1] }, signe: { type: 'signe', colonne: '2' }, format: { decimal: ',', milliers: '.' },
  formatDate: 'JJ/MM/AAAA', deviseParDefaut: 'EUR', ligneEntete: 0,
};
const REGLES: ReglesPdf = {
  ligne: String.raw`^(?<date>\d{2}/\d{2}/\d{4})\s+(?<libelle>.+?)\s+(?<montant>[+-]?[\d.]+,\d{2})$`,
  soldeOuverture: String.raw`^Ouverture\s+(?<solde>[\d.]+,\d{2})$`,
  soldeCloture: String.raw`^Cloture\s+(?<solde>[\d.]+,\d{2})$`,
  entetePeriode: String.raw`^Releve du (?<du>\d{2}/\d{2}/\d{4}) au (?<au>\d{2}/\d{2}/\d{4})$`,
  formatDate: 'JJ/MM/AAAA', format: { decimal: ',', milliers: '.' }, devise: 'EUR',
};
const CTX: ContexteAnalyse = {
  comptes: [{ id: 'A', ferme: false, ibanHache: 'h-a' }, { id: 'B', ferme: false, ibanHache: 'h-b' }],
  taillesApercu: 10, limitesXml: { profondeurMax: 20, noeudsMax: 500 },
};
const csv = (n: number): EntreeReleve => ({
  format: 'csv',
  texte: ['Date;Libelle;Montant', ...Array.from({ length: n }, (_, i) => `${String(i + 1).padStart(2, '0')}/10/2026;Achat ${i};-1,00`)].join('\n'),
});
const ofx = (...comptes: string[]): EntreeReleve => ({
  format: 'ofx2',
  texte: `<OFX>${comptes.map((c) => `<BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>EUR</CURDEF><BANKACCTFROM><ACCTID>${c}</ACCTID></BANKACCTFROM><BANKTRANLIST><DTSTART>20261001</DTSTART><DTEND>20261031</DTEND><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261005</DTPOSTED><TRNAMT>-5.00</TRNAMT><FITID>f-${c}</FITID><NAME>Achat</NAME></STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>95.00</BALAMT></LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1>`).join('')}</OFX>`,
});
const hache = (brut?: string): string | undefined => (brut === undefined ? undefined : `h-${brut.toLowerCase()}`);
const pdf = (cloture: string): EntreeReleve => ({
  format: 'pdf',
  pages: [{ numero: 1, lignes: ['Releve du 01/10/2026 au 31/10/2026', 'Ouverture 100,00', '05/10/2026 Achat -5,00', `Cloture ${cloture}`] }],
});

describe('analyse d’un relevé sans écriture', () => {
  it('csv-apercu-dix-lignes', () => {
    const r = analyserReleve(csv(12), { ...CTX, profil: PROFIL, compteChoisi: 'A' });
    expect(r.etat).toBe('apercu');
    expect(r.apercu).toHaveLength(10);
    expect(r.compteurs).toEqual({ lues: 12, importees: 12, rejetees: 0 });
    expect(analyserReleve(csv(12), { ...CTX, profil: PROFIL, compteChoisi: 'A', taillesApercu: 3 }).apercu).toHaveLength(3);
    for (const t of [0, Number.NaN, -1, 1.5, Infinity]) {
      expect(() => analyserReleve(csv(2), { ...CTX, profil: PROFIL, taillesApercu: t })).toThrow('taille_apercu_invalide');
    }
  });

  it('pdf-faux-refuse', () => {
    const r = analyserReleve(pdf('90,00'), { ...CTX, reglesPdf: REGLES, compteChoisi: 'A' });
    expect(r).toMatchObject({ etat: 'refuse', motifRefus: 'solde_pdf_faux' });
    expect(r.releves[0]?.controle.controle).toBe('ECART');
    expect(analyserReleve(pdf('95,00'), { ...CTX, reglesPdf: REGLES, compteChoisi: 'A' })).toMatchObject({ etat: 'apercu' });
    expect(analyserReleve(pdf('95,00'), CTX)).toMatchObject({ etat: 'refuse', motifRefus: 'format_inconnu' });
  });

  it('sans-profil-question', () => {
    for (const entree of [csv(2), { format: 'tableur', lignes: [['a', 'b', 'c']] } satisfies EntreeReleve]) {
      const r = analyserReleve(entree, { ...CTX, compteChoisi: 'A' });
      expect(r).toMatchObject({ etat: 'a_confirmer', releves: [], apercu: [] });
      expect(r.questions.map((q) => q.code)).toEqual(['profil_a_choisir']);
    }
  });

  it('mauvais-compte-a-confirmer', () => {
    const r = analyserReleve(ofx('B'), { ...CTX, ibanHache: hache, compteChoisi: 'A' });
    expect(r.etat).toBe('a_confirmer');
    expect(r.releves[0]?.rattachement).toEqual({ type: 'mauvais_compte', choisi: 'A', lu: 'B' });
    const q = analyserReleve(ofx('Z'), CTX);
    expect(q.etat).toBe('a_confirmer');
    expect(q.questions).toEqual([{ code: 'quel_compte', choix: ['A', 'B'] }]);
  });

  it('en-tete-seul-vide', () => {
    const r = analyserReleve({ format: 'csv', texte: 'Date;Libelle;Montant\n' }, { ...CTX, profil: PROFIL, compteChoisi: 'A' });
    expect(r).toMatchObject({ etat: 'vide', apercu: [], compteurs: { lues: 0, importees: 0, rejetees: 0 } });
    const egaux = { format: 'ofx2', texte: '<OFX><STMTRS><CURDEF>EUR</CURDEF><BANKTRANLIST><DTSTART>20261001</DTSTART></BANKTRANLIST><LEDGERBAL><BALAMT>0.00</BALAMT></LEDGERBAL></STMTRS></OFX>' } satisfies EntreeReleve;
    expect(analyserReleve(egaux, { ...CTX, compteChoisi: 'A' })).toMatchObject({ etat: 'vide' });
    const camt = { format: 'camt053', texte: '<Document><BkToCstmrStmt><Stmt><Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">10.00</Amt><CdtDbtInd>CRDT</CdtDbtInd></Bal><Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">10.00</Amt><CdtDbtInd>CRDT</CdtDbtInd></Bal></Stmt></BkToCstmrStmt></Document>' } satisfies EntreeReleve;
    const c = analyserReleve(camt, { ...CTX, compteChoisi: 'A' });
    expect(c).toMatchObject({ etat: 'vide' });
    expect(c.releves[0]?.controle.controle).toBe('OK');
  });

  it('ofx-deux-comptes-deux-rattachements', () => {
    const r = analyserReleve(ofx('A', 'B'), { ...CTX, ibanHache: hache });
    expect(r.etat).toBe('apercu');
    expect(r.releves.map((x) => x.rattachement)).toEqual([
      { type: 'compte', compteId: 'A', par: 'iban' }, { type: 'compte', compteId: 'B', par: 'iban' },
    ]);
  });

  it('xml-piege-refuse', () => {
    const piege: EntreeReleve = { format: 'camt053', texte: '<!DOCTYPE x [<!ENTITY e "x">]><Document/>' };
    expect(analyserReleve(piege, CTX)).toMatchObject({ etat: 'refuse', motifRefus: 'xml_refuse', releves: [], apercu: [] });
    expect(analyserReleve({ format: 'ofx2', texte: '<!DOCTYPE x><OFX/>' }, CTX).motifRefus).toBe('xml_refuse');
    expect(analyserReleve({ format: 'ofx2', texte: '<Autre/>' }, CTX).motifRefus).toBe('format_inconnu');
    expect(analyserReleve({ format: 'camt053', texte: '<Autre/>' }, CTX).motifRefus).toBe('format_inconnu');
  });

  it('compteurs-additionnes-sur-plusieurs-releves', () => {
    const r = analyserReleve(ofx('A', 'B'), { ...CTX, ibanHache: hache, taillesApercu: 1 });
    expect(r.compteurs).toEqual({ lues: 2, importees: 2, rejetees: 0 });
    expect(r.apercu).toHaveLength(1);
    const bons = Array.from({ length: 10 }, (_, i) => `0${i % 9 + 1}/10/2026;Achat;-1,00`);
    const texte = ['Date;Libelle;Montant', ...bons, 'JJ;Mauvaise;-1,00', '02/10/2026;Autre;-2,00;extra'].join('\n');
    const mauvais = analyserReleve({ format: 'csv', texte }, { ...CTX, profil: PROFIL, compteChoisi: 'A' });
    expect(mauvais.compteurs).toEqual({ lues: 12, importees: 10, rejetees: 2 });
  });
});
