import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { chevauchements, ErreurCouverture, trousDeReleves } from '../couverture.js';
import type { ReleveResume } from '../types.js';

const c = (n: number): Centimes => n as Centimes;
const r = (id: string, d: string, f: string, o?: number, cl?: number, compteId = 'c1'): ReleveResume => ({
  id, compteId, periodeDebut: d, periodeFin: f,
  ...(o === undefined ? {} : { soldeOuverture: c(o) }), ...(cl === undefined ? {} : { soldeCloture: c(cl) }),
});
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurCouverture ? e.code : 'autre'; }
  return undefined;
};
const aout = r('a', '2026-08-01', '2026-08-31', 0, 1234567);
const octobre = r('o', '2026-10-01', '2026-10-31', 1100000, 0);

describe('couverture des relevés', () => {
  it('trou-de-septembre-les-deux', () => {
    expect(trousDeReleves([aout, octobre], [])).toEqual([
      { compteId: 'c1', debut: '2026-09-01', fin: '2026-09-30', preuve: 'les_deux', soldes: 'ECART', ecart: 134567 },
    ]);
  });
  it('soldes-egaux-trou-de-dates-seul', () => {
    const t = trousDeReleves([aout, { ...octobre, soldeOuverture: c(1234567) }], []);
    expect(t).toEqual([{ compteId: 'c1', debut: '2026-09-01', fin: '2026-09-30', preuve: 'dates', soldes: 'OK' }]);
    expect(t[0]).not.toHaveProperty('ecart');
  });
  it('soldes-seuls-releves-contigus', () => {
    const t = trousDeReleves([aout, r('s', '2026-09-01', '2026-09-30', 5)], []);
    expect(t).toEqual([{ compteId: 'c1', debut: '2026-09-01', fin: '2026-09-01', preuve: 'soldes', soldes: 'ECART', ecart: 1234562 }]);
  });
  it('week-end-et-jour-ferme-pas-un-trou', () => {
    expect(trousDeReleves([r('a', '2026-08-01', '2026-09-03', 1, 1), r('b', '2026-09-07', '2026-09-30', 1, 1)], [])).toEqual([]);
    const deux = [r('a', '2026-08-01', '2026-09-02', 1, 1), r('b', '2026-09-07', '2026-09-30', 1, 1)];
    expect(trousDeReleves(deux, [])).toHaveLength(1);
    expect(trousDeReleves(deux, ['2026-09-03'])).toEqual([]);
    expect(trousDeReleves(deux, ['2026-09-03', '2026-09-04'])).toEqual([]);
  });
  it('chevauchement-pas-un-trou', () => {
    const l = [r('a', '2026-08-01', '2026-08-20', 1, 2), r('b', '2026-08-15', '2026-08-31', 9, 9)];
    expect(trousDeReleves(l, [])).toEqual([]);
    expect(chevauchements(l)).toEqual([{ a: 'a', b: 'b', du: '2026-08-15', au: '2026-08-20' }]);
    const englobe = [r("a", "2026-08-01", "2026-08-31", 1, 2), r("b", "2026-08-05", "2026-08-10", 9, 9), r("c", "2026-09-01", "2026-09-30", 2, 3)];
    expect(trousDeReleves(englobe, [])).toEqual([]);
    expect(chevauchements([aout, octobre])).toEqual([]);
    expect(chevauchements([r('a', '2026-08-01', '2026-08-15'), r('b', '2026-08-15', '2026-08-31')])).toHaveLength(1);
  });
  it('sans-soldes-impossible', () => {
    expect(trousDeReleves([r('a', '2026-08-01', '2026-08-31'), r('b', '2026-10-01', '2026-10-31')], [])).toEqual([
      { compteId: 'c1', debut: '2026-09-01', fin: '2026-09-30', preuve: 'dates', soldes: 'IMPOSSIBLE' },
    ]);
    expect(trousDeReleves([r('a', '2026-08-01', '2026-08-31', 1), r('b', '2026-09-01', '2026-09-30', 1)], [])).toEqual([]);
  });
  it('sans-soldes-impossible-ouverture-absente', () => {
    const t = trousDeReleves([r('a', '2026-08-01', '2026-08-31', 0, 5), r('b', '2026-10-01', '2026-10-31', undefined, 0)], []);
    expect(t).toEqual([{ compteId: 'c1', debut: '2026-09-01', fin: '2026-09-30', preuve: 'dates', soldes: 'IMPOSSIBLE' }]);
    expect(t[0]).not.toHaveProperty('ecart');
  });
  it('ordre-des-releves-sans-effet', () => {
    const tous = [aout, octobre, r('x', '2026-11-01', '2026-11-30', 0, 0)];
    expect(trousDeReleves([...tous].reverse(), [])).toEqual(trousDeReleves(tous, []));
    expect(trousDeReleves(tous, [])).toHaveLength(1);
  });
  it('tri-par-compte-et-par-id', () => {
    const z2 = [r('z1', '2026-08-01', '2026-08-31', 0, 1, 'c2'), r('z2', '2026-10-01', '2026-10-31', 1, 0, 'c2')];
    const un = [r('a1', '2026-08-01', '2026-08-31', 0, 1), r('a2', '2026-10-01', '2026-10-31', 1, 0)];
    expect(trousDeReleves([...z2, ...un], []).map((t) => t.compteId)).toEqual(['c1', 'c2']);
    const m = r('m', '2026-08-01', '2026-08-31', 0, 5);
    const n = r('n', '2026-08-01', '2026-08-31', 0, 7);
    const p = r('p', '2026-09-01', '2026-09-30', 7, 0);
    expect(trousDeReleves([m, n, p], [])).toEqual([]);
    expect(trousDeReleves([n, m, p], [])).toEqual([]);
  });
  it('comptes-separes', () => {
    const autre = r('z', '2026-10-01', '2026-10-31', 1100000, 0, 'c2');
    expect(trousDeReleves([aout, autre], [])).toEqual([]);
    expect(trousDeReleves([autre, aout, octobre], []).map((t) => t.compteId)).toEqual(['c1']);
    expect(chevauchements([r('a', '2026-08-01', '2026-08-31'), r('b', '2026-08-01', '2026-08-31', undefined, undefined, 'c2')])).toEqual([]);
  });
  it('periode-inversee-refusee', () => {
    expect(code(() => trousDeReleves([r('a', '2026-08-31', '2026-08-01')], []))).toBe('periode_inversee');
    expect(code(() => chevauchements([r('a', '2026-08-31', '2026-08-01')]))).toBe('periode_inversee');
    expect(trousDeReleves([r('a', '2026-08-05', '2026-08-05')], [])).toEqual([]);
  });
  it('cas-limites', () => {
    expect(trousDeReleves([], [])).toEqual([]);
    expect(chevauchements([])).toEqual([]);
    expect(trousDeReleves([aout], [])).toEqual([]);
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(code(() => trousDeReleves([r('a', '2026-08-01', '2026-08-31', m)], []))).toBe('montant_invalide');
      expect(code(() => trousDeReleves([r('a', '2026-08-01', '2026-08-31', 0, m)], []))).toBe('montant_invalide');
    }
    expect(code(() => trousDeReleves([r('a', '2026-02-30', '2026-03-01')], []))).toBe('date_invalide');
    expect(code(() => trousDeReleves([r('a', '2026-02-01', '2026-02-30')], []))).toBe('date_invalide');
    expect(code(() => trousDeReleves([aout], ['2026-13-01']))).toBe('date_invalide');
    expect(code(() => trousDeReleves([r('a', '', '2026-03-01')], []))).toBe('date_invalide');
  });
});
