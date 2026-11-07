import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { balanceAgee } from '../balance-agee.js';

const c = (n: number): Centimes => n as Centimes;
const REF = '2026-11-30';
const BORNES = [30, 60, 90];
type Creance = Parameters<typeof balanceAgee>[0]['creances'][number];
const cr = (factureId: string, resteDu: number, echeance?: string, dateFacture = '2026-01-05'): Creance =>
  ({ factureId, clientId: 'client-a', resteDu: c(resteDu), echeance, dateFacture }) as Creance;
const run = (creances: Creance[], solde411 = 0, bornesJours: number[] = BORNES) =>
  balanceAgee({ creances, dateReference: REF, bornesJours, solde411: c(solde411) });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('balance âgée des clients', () => {
  it('v24-deux-tranches', () => {
    const r = run([cr('f1', 220000, '2026-11-20'), cr('f2', 120000, '2026-10-16')], 340000);
    expect(r.tranches.map((t) => t.total)).toEqual([220000, 120000, 0, 0]);
    expect(r.tranches.map((t) => [t.de, t.a])).toEqual([[1, 30], [31, 60], [61, 90], [91, null]]);
    expect(r.tranches[0]?.factureIds).toEqual(['f1']);
    expect(r.tranches[1]?.factureIds).toEqual(['f2']);
    expect(r.total).toBe(340000);
    expect(r.ecart).toBe(0);
    expect(r.nonEchue.total).toBe(0);
  });

  it('limite-30-et-31-jours', () => {
    const dates: [string, string][] = [['a', '2026-10-31'], ['b', '2026-10-30'], ['c', '2026-10-01'], ['d', '2026-09-30'], ['e', '2026-09-01'], ['f', '2026-08-31']];
    const r = run(dates.map(([id, d]) => cr(id, 1, d)));
    expect(r.tranches.map((t) => t.factureIds)).toEqual([['a'], ['b', 'c'], ['d', 'e'], ['f']]);
  });

  it('sans-echeance-date-de-facture', () => {
    const r = run([cr('a', 500, undefined, '2026-10-31'), cr('b', 700, undefined, '2026-10-30')]);
    expect(r.tranches.map((t) => t.total)).toEqual([500, 700, 0, 0]);
  });

  it('non-echue-a-part', () => {
    const r = run([cr('a', 100, '2026-11-30'), cr('b', 200, '2026-12-15'), cr('c', 400, '2026-11-29')], 700);
    expect(r.nonEchue.total).toBe(300);
    expect(r.nonEchue.factureIds).toEqual(['a', 'b']);
    expect(r.tranches[0]?.total).toBe(400);
    expect(r.total).toBe(700);
  });

  it('ecart-un-centime-alerte-a19', () => {
    const r = run([cr('a', 1000, '2026-11-20')], 1001);
    expect(r.ecart).toBe(-1);
    expect(r.alerte).toBe('A19');
    expect(run([cr('a', 1000, '2026-11-20')], 999)).toMatchObject({ ecart: 1, alerte: 'A19' });
  });

  it('total-egal-solde-sans-alerte', () => {
    const r = run([cr('a', 1000, '2026-11-20'), cr('b', 500, '2026-12-20'), cr('z', 0, '2026-01-01')], 1500);
    expect(r.ecart).toBe(0);
    expect('alerte' in r).toBe(false);
    expect(r.tranches.every((t) => !t.factureIds.includes('z'))).toBe(true);
    expect(r.nonEchue.factureIds).toEqual(['b']);
  });

  it('bornes-invalides', () => {
    for (const b of [[], [60, 30], [30, 30], [0], [1.5], [NaN], [-5], [Infinity], [30, NaN]]) {
      expect(code(() => run([], 0, b))).toBe('bornes_invalides');
    }
    expect(code(() => run([], 0, [1]))).toBeUndefined();
    expect(code(() => run([cr('a', 1.5, '2026-11-20')]))).toBe('reste_du_invalide');
    expect(code(() => run([cr('a', NaN, '2026-11-20')]))).toBe('reste_du_invalide');
    expect(code(() => run([cr('a', 1, 'nimporte')]))).toBe('date_invalide');
  });

  it('ordre-d-entree-indifferent', () => {
    const l = [cr('a', 100, '2026-11-20'), cr('b', 200, '2026-10-16'), cr('c', 300, '2026-12-31'), cr('d', 400, '2026-08-01')];
    const r = run(l, 1000);
    expect(run([...l].reverse(), 1000)).toEqual(r);
    expect(r.tranches[3]?.total).toBe(400);
  });

  it('liste-vide-total-zero', () => {
    const r = run([]);
    expect(r.total).toBe(0);
    expect(r.ecart).toBe(0);
    expect(r.tranches).toHaveLength(4);
    expect(r.nonEchue).toEqual({ de: 0, a: 0, total: 0, factureIds: [] });
    expect('alerte' in r).toBe(false);
    expect(run([], 5)).toMatchObject({ ecart: -5, alerte: 'A19' });
  });
});
