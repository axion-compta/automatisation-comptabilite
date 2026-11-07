import { describe, expect, it } from 'vitest';
import { ErreurOfx, lireOfx1, lireOfx2 } from '../ofx.js';
import { lireXml } from '../xml.js';

type T = { amt?: string; date?: string; fitid?: string; name?: string; memo?: string };
type C = { acct: string; ops: T[]; solde?: string; tranlist?: boolean };

// Génère le même fichier en OFX 1 (feuilles non fermées) ou en OFX 2 (XML complet).
function ofx(comptes: C[], sgml: boolean): string {
  const f = (nom: string, v: string | undefined): string => (v === undefined ? '' : sgml ? `<${nom}>${v}\n` : `<${nom}>${v}</${nom}>`);
  const g = (nom: string, corps: string): string => `<${nom}>${sgml ? '\n' : ''}${corps}</${nom}>`;
  const op = (t: T): string => g('STMTTRN', f('TRNTYPE', 'DEBIT') + f('DTPOSTED', t.date ?? '20260302') + f('TRNAMT', t.amt ?? '-12.50') + f('FITID', t.fitid) + f('NAME', t.name) + f('MEMO', t.memo));
  const rs = (c: C): string => g('STMTRS', f('CURDEF', 'EUR') + g('BANKACCTFROM', f('ACCTID', c.acct)) +
    (c.tranlist === false ? '' : g('BANKTRANLIST', f('DTSTART', '20260301') + f('DTEND', '20260331') + c.ops.map(op).join(''))) +
    (c.solde === undefined ? '' : g('LEDGERBAL', f('BALAMT', c.solde) + f('DTASOF', '20260331'))));
  const corps = g('OFX', g('BANKMSGSRSV1', comptes.map((c) => g('STMTTRNRS', rs(c))).join('')));
  return sgml ? `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nENCODING:USASCII\n\n${corps}\n` : `<?xml version="1.0"?>\n<?OFX OFXHEADER="200" VERSION="220"?>\n${corps}`;
}
const lire2 = (x: string) => lireOfx2(lireXml(x, { profondeurMax: 64, noeudsMax: 20000 }));
const code = (action: () => unknown): ErreurOfx | undefined => {
  try {
    action();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurOfx);
    return e as ErreurOfx;
  }
  return undefined;
};

const TROIS: T[] = [{ amt: '-12.50', fitid: 'A1', name: 'Café Test', memo: 'Note' }, { amt: '1000.00', date: '20260305', fitid: 'A2', name: 'Virement' }, { amt: '-0.01', date: '20260306' }];
const ATTENDU = [[-1250, '2026-03-02', 'Café Test Note'], [100000, '2026-03-05', 'Virement'], [-1, '2026-03-06', '']];
const resume = (r: ReturnType<typeof lireOfx1>) => r[0]?.lignes.map((l) => [l.montant, l.dateOperation, l.libelleBrut]);

describe('relevé OFX', () => {
  it('ofx1-trois-operations', () => {
    const r = lireOfx1(ofx([{ acct: 'ACC-1', ops: TROIS }], true));
    expect(resume(r)).toEqual(ATTENDU);
    expect(r[0]).toMatchObject({ ibanBrut: 'ACC-1', devise: 'EUR', periodeDebut: '2026-03-01', periodeFin: '2026-03-31', rejets: [] });
    expect(r[0]?.lignes.map((l) => [l.rang, l.etatTechnique, l.devise])).toEqual([[1, 'completee', 'EUR'], [2, 'completee', 'EUR'], [3, 'completee', 'EUR']]);
    for (const amt of ['', 'NaN', '1e3', '12,50', '-', 'Infinity', '1.234']) {
      const e = code(() => lireOfx1(ofx([{ acct: 'ACC-1', ops: [TROIS[0] as T, { amt }] }], true)));
      expect([amt, e?.code, e?.rang, e?.message]).toEqual([amt, 'montant_illisible', 2, 'montant_illisible']);
    }
    expect(code(() => lireOfx1('texte sans balise'))?.code).toBe('pas_un_ofx');
    expect(code(() => lireOfx1('<OFX><X>1</X></OFX>'))?.code).toBe('pas_un_ofx');
    expect(code(() => lireOfx1('<OFX><A></B></OFX>'))?.code).toBe('pas_un_ofx');
  });

  it('ofx2-trois-operations', () => {
    const c = [{ acct: 'ACC-1', ops: TROIS }];
    expect(resume(lire2(ofx(c, false)))).toEqual(ATTENDU);
    expect(lire2(ofx(c, false))).toEqual(lireOfx1(ofx(c, true)));
    expect(code(() => lireOfx2({ nom: 'Autre', attributs: {}, enfants: [], texte: '' }))?.code).toBe('pas_un_ofx');
    expect(code(() => lire2('<OFX><BANKMSGSRSV1/></OFX>'))?.code).toBe('pas_un_ofx');
  });

  it('deux-comptes-deux-releves', () => {
    for (const sgml of [true, false]) {
      const x = ofx([{ acct: 'ACC-1', ops: TROIS }, { acct: 'ACC-2', ops: [] }, { acct: 'ACC-3', ops: [], tranlist: false }], sgml);
      const r = sgml ? lireOfx1(x) : lire2(x);
      expect(r.map((s) => [s.ibanBrut, s.lignes.length])).toEqual([['ACC-1', 3], ['ACC-2', 0], ['ACC-3', 0]]);
    }
  });

  it('solde-de-cloture-lu', () => {
    const [r] = lireOfx1(ofx([{ acct: 'ACC-1', ops: TROIS, solde: '-7654.33' }], true));
    expect(r?.soldeCloture).toBe(-765433);
    expect(r?.soldeOuverture).toBeUndefined();
    expect(lireOfx1(ofx([{ acct: 'ACC-1', ops: TROIS }], true))[0]?.soldeCloture).toBeUndefined();
    const e = code(() => lireOfx1(ofx([{ acct: 'ACC-1', ops: [], solde: '1e3' }], true)));
    expect([e?.code, e?.rang]).toEqual(['montant_illisible', 0]);
  });

  it('fitid-garde', () => {
    const [r] = lireOfx1(ofx([{ acct: 'ACC-1', ops: [{ fitid: 'F1' }, { fitid: 'F1' }, {}] }], true));
    expect(r?.lignes.map((l) => l.idExterne)).toEqual(['F1', 'F1', undefined]);
  });

  it('balise-non-fermee-sgml', () => {
    const brut = 'OFXHEADER:100\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>EUR<BANKACCTFROM><ACCTID>ACC-1</BANKACCTFROM>' +
      '<BANKTRANLIST><STMTTRN><DTPOSTED>20260302<TRNAMT>-12.50<FITID>X1<NAME>A &amp; B</STMTTRN><STMTTRN><DTPOSTED>20260303<TRNAMT></STMTTRN>' +
      '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
    expect(code(() => lireOfx1(brut))?.code).toBe('montant_illisible');
    const [r] = lireOfx1(brut.replace('<TRNAMT></STMTTRN>', '<TRNAMT>5.00</STMTTRN>'));
    expect(r?.lignes.map((l) => [l.montant, l.idExterne, l.libelleBrut])).toEqual([[-1250, 'X1', 'A & B'], [500, undefined, '']]);
  });

  it('t02-1-cinq-cents-operations', () => {
    const ops: T[] = Array.from({ length: 500 }, (_, i) => ({ amt: i === 0 ? '-2345.67' : '0.00', fitid: `N${i}` }));
    const [r] = lireOfx1(ofx([{ acct: 'ACC-1', ops, solde: '7654.33' }], true));
    expect(r?.lignes).toHaveLength(500);
    expect(r?.lignes.reduce((s, l) => s + l.montant, 0)).toBe(-234567);
    expect(1000000 + (r?.lignes.reduce((s, l) => s + l.montant, 0) ?? 0)).toBe(r?.soldeCloture);
    expect(r?.soldeCloture).toBe(765433);
    expect(r?.lignes[499]?.rang).toBe(500);
  });

  it('date-avec-fuseau-non-decalee', () => {
    const dates = ['20260302235900[-8:PST]', '20260302000000[+9:JST]', '20260302120000.000[0:GMT]', '20260302'];
    const [r] = lireOfx1(ofx([{ acct: 'ACC-1', ops: dates.map((date) => ({ date })) }], true));
    expect(r?.lignes.map((l) => l.dateOperation)).toEqual(['2026-03-02', '2026-03-02', '2026-03-02', '2026-03-02']);
    for (const date of ['', '2026-03-02', '20261301', '20260230', 'abc']) {
      const e = code(() => lireOfx1(ofx([{ acct: 'ACC-1', ops: [{}, { date }] }], true)));
      expect([date, e?.code, e?.rang]).toEqual([date, 'date_illisible', 2]);
    }
  });
});
