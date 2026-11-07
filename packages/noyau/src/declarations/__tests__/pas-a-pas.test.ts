import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { CaseDeclaration } from '../cases.js';
import { ErreurPasAPas, pasAPas } from '../pas-a-pas.js';

const c = centimes;
const S1 = { ecritureId: 'e1', ligneIndex: 0 };
const S2 = { ecritureId: 'e2', ligneIndex: 1 };

function cas(code: string, montant: number, sources = [S1]): CaseDeclaration {
  return { code, montant: c(montant), sources, aCalculer: false };
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurPasAPas) return e.code;
    throw e;
  }
  return undefined;
}

describe('pasAPas', () => {
  it('ordre-du-millesime-respecte', () => {
    const r = pasAPas([cas('X01', 100), cas('X02', 200, [S1, S2]), cas('X03', 300)], ['X03', 'X01', 'X02']);
    expect(r.neant).toBe(false);
    expect(r.etapes).toEqual([
      { rang: 1, code: 'X03', montant: 300, sources: 1 },
      { rang: 2, code: 'X01', montant: 100, sources: 1 },
      { rang: 3, code: 'X02', montant: 200, sources: 2 },
    ]);
  });
  it('cases-nulles-omises', () => {
    const r = pasAPas([cas('X01', 0), cas('X02', 5), cas('X03', 0)], ['X01', 'X02', 'X03']);
    expect(r.etapes.map((e) => e.code)).toEqual(['X02']);
    expect(r.neant).toBe(false);
  });
  it('neant-si-tout-a-zero', () => {
    expect(pasAPas([cas('X01', 0), cas('X02', 0)], ['X01', 'X02'])).toEqual({ neant: true, etapes: [] });
    expect(pasAPas([], [])).toEqual({ neant: true, etapes: [] });
    expect(pasAPas([cas('X01', 0)], [])).toEqual({ neant: true, etapes: [] });
  });
  it('ligne-absente-refusee', () => {
    expect(code(() => pasAPas([cas('X01', 1)], ['X01', 'X09']))).toBe('ligne_absente');
  });
  it('montant-hors-ordre-refuse', () => {
    expect(code(() => pasAPas([cas('X01', 1), cas('X02', 2)], ['X01']))).toBe('case_hors_ordre');
    expect(code(() => pasAPas([cas('X01', 1)], []))).toBe('case_hors_ordre');
  });
  it('rangs-continus', () => {
    const r = pasAPas([cas('A', 1), cas('B', 0), cas('C', 3), cas('D', 0), cas('E', 5)], ['A', 'B', 'C', 'D', 'E']);
    expect(r.etapes.map((e) => e.rang)).toEqual([1, 2, 3]);
  });
  it('case-hors-ordre-nulle-acceptee', () => {
    expect(pasAPas([cas('X01', 1), cas('X02', 0)], ['X01']).etapes).toHaveLength(1);
  });
  it('code-en-double-refuse', () => {
    expect(code(() => pasAPas([cas('X01', 1)], ['X01', 'X01']))).toBe('ordre_en_double');
  });
  it('case-negative-refusee', () => {
    expect(code(() => pasAPas([cas('X01', -1)], ['X01']))).toBe('montant_invalide');
    expect(code(() => pasAPas([cas('X01', -1)], []))).toBe('montant_invalide');
  });
  it('montant-non-entier-refuse', () => {
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const brut = { code: 'X01', montant: m, sources: [S1], aCalculer: false } as unknown as CaseDeclaration;
      expect(code(() => pasAPas([brut], ['X01']))).toBe('montant_invalide');
      const avecBase = { ...cas('X01', 1), base: m } as unknown as CaseDeclaration;
      expect(code(() => pasAPas([avecBase], ['X01']))).toBe('montant_invalide');
    }
  });
  it('case-en-double-refusee', () => {
    expect(code(() => pasAPas([cas('X01', 500), cas('X01', 0)], ['X01']))).toBe('case_en_double');
    expect(code(() => pasAPas([cas('X01', 0), cas('X01', 500)], ['X01']))).toBe('case_en_double');
  });
  it('base-copiee-si-presente', () => {
    const avecBase = { ...cas('X01', 10), base: c(50) } as CaseDeclaration & { base: ReturnType<typeof c> };
    expect(pasAPas([avecBase], ['X01']).etapes[0]).toEqual({ rang: 1, code: 'X01', montant: 10, base: 50, sources: 1 });
  });
});
