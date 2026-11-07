import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { CaseDeclaration } from '../cases.js';
import { ErreurReport, remboursementPropose, reporterCredit } from '../report.js';

const c = centimes;
const CODES = { ligneCredit: 'X22', ligneReport: 'X27' };
const SOURCES = [{ ecritureId: 'e1', ligneIndex: 0 }, { ecritureId: 'e2', ligneIndex: 1 }];
const PRECEDENTE: CaseDeclaration[] = [
  { code: 'X01', montant: c(999), sources: [], aCalculer: false },
  { code: 'X22', montant: c(60000), sources: SOURCES, aCalculer: false },
];
const SEUIL = c(76000);

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurReport) return e.code;
    throw e;
  }
  return undefined;
}

describe('reporterCredit', () => {
  it('credit-reporte', () => {
    const r = reporterCredit(PRECEDENTE, CODES);
    expect(r.code).toBe('X27');
    expect(r.montant).toBe(60000);
    expect(r.aCalculer).toBe(false);
  });
  it('aucune-precedente-zero', () => {
    const r = reporterCredit(null, CODES);
    expect(r).toEqual({ code: 'X27', montant: 0, sources: [], aCalculer: false });
  });
  it('precedente-sans-ligne-credit-bloque', () => {
    expect(code(() => reporterCredit([], CODES))).toBe('ligne_absente');
    expect(code(() => reporterCredit([PRECEDENTE[0]!], CODES))).toBe('ligne_absente');
  });
  it('sources-du-report', () => {
    const r = reporterCredit(PRECEDENTE, CODES);
    expect(r.sources).toEqual(SOURCES);
    expect(r.sources).not.toBe(SOURCES);
  });
  it('credit-negatif-refuse', () => {
    const neg: CaseDeclaration[] = [{ code: 'X22', montant: c(-1), sources: [], aCalculer: false }];
    expect(code(() => reporterCredit(neg, CODES))).toBe('montant_invalide');
  });
  it('codes-identiques-refuses', () => {
    expect(code(() => reporterCredit(PRECEDENTE, { ligneCredit: 'X22', ligneReport: 'X22' }))).toBe('codes_identiques');
    expect(code(() => reporterCredit(null, { ligneCredit: 'X22', ligneReport: 'X22' }))).toBe('codes_identiques');
  });
});

describe('remboursementPropose', () => {
  it('egal-au-seuil-pas-de-remboursement', () => {
    expect(remboursementPropose(SEUIL, SEUIL)).toBe(false);
    expect(remboursementPropose(c(60000), SEUIL)).toBe(false);
  });
  it('un-centime-au-dessus-propose', () => {
    expect(remboursementPropose(c(76001), SEUIL)).toBe(true);
  });
  it('seuil-invalide-refuse', () => {
    for (const s of [NaN, Infinity, -Infinity, 1.5, -1]) {
      expect(code(() => remboursementPropose(c(10), s as never))).toBe('seuil_invalide');
    }
    expect(remboursementPropose(c(1), c(0))).toBe(true);
    expect(remboursementPropose(c(0), c(0))).toBe(false);
  });
  it('credit-invalide-refuse', () => {
    for (const v of [NaN, Infinity, 2.5, -1]) {
      expect(code(() => remboursementPropose(v as never, SEUIL))).toBe('montant_invalide');
    }
  });
});
