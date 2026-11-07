import { describe, expect, it } from 'vitest';
import { ErreurCamt, lireCamt053 } from '../camt.js';
import { lireXml } from '../xml.js';

const IBAN_A = 'FR0000000000000000000000X01';
const IBAN_B = 'FR0000000000000000000000X02';
const LIM = { profondeurMax: 64, noeudsMax: 5000 };

type E = { m?: string; s?: string; sts?: string; d?: string; v?: string; ref?: string; u?: string; info?: string; ccy?: string };
const entree = (e: E): string => {
  const ccy = e.ccy === undefined ? ' Ccy="EUR"' : e.ccy === '' ? '' : ` Ccy="${e.ccy}"`;
  const dt = e.d === '' ? '' : `<BookgDt><Dt>${e.d ?? '2026-03-02'}</Dt></BookgDt>`;
  return `<Ntry><Amt${ccy}>${e.m ?? '10.00'}</Amt><CdtDbtInd>${e.s ?? 'CRDT'}</CdtDbtInd><Sts>${e.sts ?? 'BOOK'}</Sts>${dt}` +
    (e.v ? `<ValDt><Dt>${e.v}</Dt></ValDt>` : '') +
    `<NtryDtls><TxDtls>${e.ref ? `<Refs><EndToEndId>${e.ref}</EndToEndId></Refs>` : ''}${e.u ? `<RmtInf><Ustrd>${e.u}</Ustrd></RmtInf>` : ''}</TxDtls></NtryDtls>` +
    (e.info ? `<AddtlNtryInf>${e.info}</AddtlNtryInf>` : '') + '</Ntry>';
};
const bal = (cd: string, m: string, s = 'CRDT'): string =>
  `<Bal><Tp><CdOrPrtry><Cd>${cd}</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">${m}</Amt><CdtDbtInd>${s}</CdtDbtInd></Bal>`;
const stmt = (iban: string, corps: string): string => `<Stmt><Acct><Id><IBAN>${iban}</IBAN></Id><Ccy>EUR</Ccy></Acct>${corps}</Stmt>`;
const doc = (...stmts: string[]): string =>
  `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt>${stmts.join('')}</BkToCstmrStmt></Document>`;
const lire = (xml: string) => lireCamt053(lireXml(xml, LIM));
const erreur = (xml: string): ErreurCamt | undefined => {
  try {
    lire(xml);
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurCamt);
    return e as ErreurCamt;
  }
  return undefined;
};

describe('relevé CAMT.053', () => {
  it('deux-operations-signees', () => {
    const [r] = lire(doc(stmt(IBAN_A, entree({ m: '12.50', s: 'DBIT' }) + entree({ m: '1234567.89', v: '2026-03-04' }))));
    expect(r?.lignes.map((l) => l.montant)).toEqual([-1250, 123456789]);
    expect(r?.lignes[1]).toMatchObject({ dateOperation: '2026-03-02', dateValeur: '2026-03-04', devise: 'EUR', etatTechnique: 'completee' });
    expect(r).toMatchObject({ ibanBrut: IBAN_A, devise: 'EUR', rejets: [] });
  });

  it('soldes-ouverture-et-cloture', () => {
    const [r] = lire(doc(stmt(IBAN_A, bal('OPBD', '100.00', 'DBIT') + bal('CLBD', '7654.33') + entree({}))));
    expect(r?.soldeOuverture).toBe(-10000);
    expect(r?.soldeCloture).toBe(765433);
    expect(lire(doc(stmt(IBAN_A, entree({}))))[0]?.soldeOuverture).toBeUndefined();
    expect(erreur(doc(stmt(IBAN_A, bal('CLBD', '1.00') + bal('CLBD', '2.00'))))?.code).toBe('solde_ambigu');
    expect(erreur(doc(stmt(IBAN_A, bal('OPBD', '1.00') + bal('OPBD', '2.00'))))?.code).toBe('solde_ambigu');
  });

  it('deux-comptes-deux-releves', () => {
    const r = lire(doc(stmt(IBAN_A, entree({ m: '1.00' })), stmt(IBAN_B, ''), stmt(IBAN_B, entree({ m: '2.00' }) + entree({ m: '3.00' }))));
    expect(r.map((x) => [x.ibanBrut, x.lignes.length])).toEqual([[IBAN_A, 1], [IBAN_B, 0], [IBAN_B, 2]]);
    expect(r[2]?.lignes.map((l) => l.rang)).toEqual([1, 2]);
  });

  it('en-attente-non-comptable', () => {
    const [r] = lire(doc(stmt(IBAN_A, entree({ sts: 'PDNG' }) + entree({ sts: 'RJCT' }) + entree({ sts: 'BOOK' }))));
    expect(r?.lignes.map((l) => l.etatTechnique)).toEqual(['en_attente', 'rejetee', 'completee']);
  });

  it('statut-inconnu-jamais-completee', () => {
    const [r] = lire(doc(stmt(IBAN_A, entree({ sts: 'XXXX' }) + entree({ sts: '' }) + entree({ sts: 'book' }))));
    expect(r?.lignes.map((l) => l.etatTechnique)).toEqual(['en_attente', 'en_attente', 'en_attente']);
  });

  it('reference-de-bout-en-bout', () => {
    const [r] = lire(doc(stmt(IBAN_A, entree({ ref: 'REF-001', u: 'Facture', info: 'Lot 7' }) + entree({ info: 'Seul' }) + entree({}))));
    expect(r?.lignes.map((l) => [l.reference, l.libelleBrut])).toEqual([['REF-001', 'Facture Lot 7'], [undefined, 'Seul'], [undefined, '']]);
  });

  it('rang-dans-l-ordre-du-fichier', () => {
    const [r] = lire(doc(stmt(IBAN_A, entree({ m: '3.00', d: '2026-03-09' }) + entree({ m: '1.00', d: '2026-03-01' }) + entree({ m: '2.00' }))));
    expect(r?.lignes.map((l) => [l.rang, l.montant])).toEqual([[1, 300], [2, 100], [3, 200]]);
  });

  it('montant-illisible-rang-cite', () => {
    for (const m of ['', 'NaN', '1e3', '1,50', '-5.00', '(5.00)', '5.001', 'Infinity']) {
      const e = erreur(doc(stmt(IBAN_A, entree({}) + entree({ m }))));
      expect([m, e?.code, e?.rang]).toEqual([m, 'montant_illisible', 2]);
      expect(e?.message).toBe('montant_illisible');
    }
    expect(erreur(doc(stmt(IBAN_A, entree({ s: 'XXXX' }))))?.code).toBe('montant_illisible');
    expect(erreur(doc(stmt(IBAN_A, entree({ ccy: '' }))))?.code).toBe('devise_absente');
    const sansDate = erreur(doc(stmt(IBAN_A, entree({ d: '' }))));
    expect([sansDate?.code, sansDate?.rang]).toEqual(['date_invalide', 1]);
    expect(erreur(doc(stmt(IBAN_A, entree({ d: '2026-02-30' }))))?.code).toBe('date_invalide');
    expect(erreur('<Document><Autre/></Document>')?.code).toBe('pas_un_camt053');
    expect(erreur(doc())?.code).toBe('pas_un_camt053');
    const surIban = erreur(doc(stmt(IBAN_A, entree({ m: 'x' }))));
    expect(JSON.stringify([surIban?.message, surIban?.code, surIban?.rang])).not.toContain(IBAN_A);
  });
});
