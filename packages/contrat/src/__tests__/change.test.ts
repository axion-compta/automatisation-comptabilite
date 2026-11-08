import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../openapi.js';
import { ExplicationEcart, TauxSource } from '../domaines/change.js';

type Operations = Record<string, { operationId: string; responses: Record<string, unknown> }>;
const chemins = () => (genererOpenapi() as { paths: Record<string, Operations> }).paths;
const CHEMIN = '/ecarts-change/{id}/explication';

describe('contrat : explication d\'un écart de change', () => {
  it('route-explication-dans-openapi', () => {
    const get = chemins()[CHEMIN]?.['get'];
    expect(get?.operationId).toBe('expliquerEcartChange');
    expect(Object.keys(get?.responses ?? {})).toContain('404');
  });

  it('get-seulement', () => {
    expect(Object.keys(chemins()[CHEMIN] ?? {})).toEqual(['get']);
  });

  it('schema-sans-numero-de-compte', () => {
    const cles = [...Object.keys(ExplicationEcart.shape), ...Object.keys(TauxSource.shape)];
    expect(cles.filter((k) => /compte|confiance/i.test(k))).toEqual([]);
    const ok = { tauxE8: 92000000, source: 'taux de test, source fictive', date: '2026-10-07' };
    const base = { sens: 'perte', montantCentimes: 1800, devise: 'XXA', taux: [ok, ok], phrase: 'x' };
    expect(ExplicationEcart.safeParse(base).success).toBe(true);
    expect(ExplicationEcart.safeParse({ ...base, compte: '000000' }).success).toBe(false);
    expect(ExplicationEcart.safeParse({ ...base, montantCentimes: -1 }).success).toBe(false);
    expect(ExplicationEcart.safeParse({ ...base, montantCentimes: 1.5 }).success).toBe(false);
    expect(ExplicationEcart.safeParse({ ...base, taux: [{ ...ok, tauxE8: 0 }, ok] }).success).toBe(false);
  });
});
