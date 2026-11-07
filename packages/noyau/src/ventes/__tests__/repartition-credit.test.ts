import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { repartirCredit } from '../repartition-credit.js';

const c = (n: number): Centimes => n as Centimes;
const f = (id: string, resteDu: number, dateFacture: string) => ({ id, resteDu: c(resteDu), dateFacture });
const run = (credit: number, factures: ReturnType<typeof f>[], ordre?: string[]) =>
  repartirCredit(c(credit), factures, ordre);
const code = (g: () => unknown): string | undefined => {
  try {
    g();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const trois = [f('f3', 30000, '2026-03-01'), f('f1', 10000, '2026-01-01'), f('f2', 20000, '2026-02-01')];

describe('répartition d\'un crédit sur plusieurs factures', () => {
  it('plus-ancienne-d-abord', () => {
    const r = run(25000, trois);
    expect(r.affectations).toEqual([
      { factureId: 'f1', montant: 10000 },
      { factureId: 'f2', montant: 15000 },
    ]);
    expect(r.reste).toBe(0);
  });

  it('ordre-choisi', () => {
    const r = run(25000, trois, ['f3', 'f1']);
    expect(r.affectations).toEqual([
      { factureId: 'f3', montant: 25000 },
    ]);
    const r2 = run(35000, trois, ['f3', 'f1']);
    expect(r2.affectations).toEqual([
      { factureId: 'f3', montant: 30000 },
      { factureId: 'f1', montant: 5000 },
    ]);
    expect(r2.reste).toBe(0);
  });

  it('credit-insuffisant-derniere-partielle', () => {
    const r = run(10001, trois);
    expect(r.affectations).toEqual([
      { factureId: 'f1', montant: 10000 },
      { factureId: 'f2', montant: 1 },
    ]);
    expect(r.reste).toBe(0);
  });

  it('credit-excedent-reste', () => {
    const r = run(70000, trois);
    expect(r.affectations.map((a) => a.montant)).toEqual([10000, 20000, 30000]);
    expect(r.reste).toBe(10000);
    const nul = run(5000, [f('a', 0, '2026-01-01'), f('b', 2000, '2026-01-02')]);
    expect(nul.affectations).toEqual([{ factureId: 'b', montant: 2000 }]);
    expect(nul.reste).toBe(3000);
  });

  it('meme-date-trie-par-id', () => {
    const r = run(100, [f('b', 60, '2026-01-01'), f('a', 60, '2026-01-01'), f('c', 60, '2025-12-31')]);
    expect(r.affectations.map((a) => a.factureId)).toEqual(['c', 'a']);
    expect(r.affectations.map((a) => a.montant)).toEqual([60, 40]);
  });

  it('ordre-inconnu-ou-double-refuse', () => {
    expect(code(() => run(100, trois, ['f1', 'zz']))).toBe('ordre_invalide');
    expect(code(() => run(100, trois, ['f1', 'f1']))).toBe('ordre_invalide');
    expect(code(() => run(100, trois, ['f1']))).toBeUndefined();
    expect(run(100, trois, []).affectations).toEqual([]);
    expect(run(100, trois, []).reste).toBe(100);
  });

  it('montants-invalides', () => {
    for (const cr of [0, -1, 1.5, NaN, Infinity]) {
      expect(code(() => run(cr, trois))).toBe('credit_invalide');
    }
    for (const r of [-1, 1.5, NaN, Infinity]) {
      expect(code(() => run(100, [f('x', r, '2026-01-01')]))).toBe('reste_du_invalide');
    }
  });

  it('liste-vide-tout-en-reste', () => {
    const r = run(4200, []);
    expect(r.affectations).toEqual([]);
    expect(r.reste).toBe(4200);
  });
});
