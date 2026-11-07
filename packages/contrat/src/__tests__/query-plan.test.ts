import { describe, expect, it } from 'vitest';
import { QueryPlan } from '../domaines/plan.js';

const ok = (q: Record<string, string>) => QueryPlan.safeParse(q).success;

describe('QueryPlan : bornes', () => {
  it('accepte les bornes limites', () => {
    expect(ok({ classe: '1' })).toBe(true);
    expect(ok({ classe: '7' })).toBe(true);
    expect(ok({ limite: '1' })).toBe(true);
    expect(ok({ limite: '100' })).toBe(true);
    expect(ok({ decalage: '0' })).toBe(true);
    expect(ok({ q: 'a'.repeat(50) })).toBe(true);
    expect(ok({})).toBe(true);
  });

  it('refuse juste au-delà des bornes', () => {
    expect(ok({ classe: '0' })).toBe(false);
    expect(ok({ classe: '8' })).toBe(false);
    expect(ok({ limite: '0' })).toBe(false);
    expect(ok({ limite: '101' })).toBe(false);
    expect(ok({ decalage: '-1' })).toBe(false);
    expect(ok({ q: 'a'.repeat(51) })).toBe(false);
  });

  it('refuse les décimaux, NaN et la valeur vide', () => {
    expect(ok({ limite: 'abc' })).toBe(false);
    expect(ok({ classe: 'NaN' })).toBe(false);
    expect(ok({ classe: '1.5' })).toBe(false);
    expect(ok({ limite: '1.5' })).toBe(false);
    expect(ok({ decalage: '1.5' })).toBe(false);
    expect(ok({ classe: '' })).toBe(false);
    expect(ok({ limite: '' })).toBe(false);
  });
});
