import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import {
  conditionCapitalLibere,
  controlePartsCapital,
  ErreurCapital,
  liberationMinimale,
} from '../liberation.js';

const FRACTION = 2500; // valeur INVENTÉE pour les tests
const c = centimes;

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurCapital ? e.code : 'autre';
  }
  return undefined;
}

describe('capital : parts et libération', () => {
  it('parts-egales-capital', () => {
    const r = controlePartsCapital(
      [
        { id: 'a1', parts: 60 },
        { id: 'a2', parts: 40 },
      ],
      100,
    );
    expect(r).toEqual({ ok: true, ecart: 0 });
  });

  it('parts-ecart-detecte', () => {
    const moins = controlePartsCapital([{ id: 'a1', parts: 60 }, { id: 'a2', parts: 39 }], 100);
    expect(moins).toEqual({ ok: false, ecart: -1 });
    const plus = controlePartsCapital([{ id: 'a1', parts: 60 }, { id: 'a2', parts: 45 }], 100);
    expect(plus).toEqual({ ok: false, ecart: 5 });
    expect(controlePartsCapital([], 100)).toEqual({ ok: false, ecart: -100 });
  });

  it('liberation-au-minimum-acceptee', () => {
    const r = liberationMinimale({ apportsNumeraire: c(1000000), verse: c(250000) }, FRACTION);
    expect(r).toEqual({ suffisante: true, minimum: 250000, manque: 0, resteALiberer: 750000 });
  });

  it('liberation-un-centime-court', () => {
    const r = liberationMinimale({ apportsNumeraire: c(1000000), verse: c(249999) }, FRACTION);
    expect(r.suffisante).toBe(false);
    expect(r.manque).toBe(1);
    expect(r.minimum).toBe(250000);
    expect(r.resteALiberer).toBe(750001);
    const plus = liberationMinimale({ apportsNumeraire: c(1000000), verse: c(250001) }, FRACTION);
    expect(plus.suffisante).toBe(true);
    expect(plus.manque).toBe(0);
  });

  it('minimum-arrondi-vers-le-haut', () => {
    const r = liberationMinimale({ apportsNumeraire: c(1000), verse: c(0) }, 3333);
    expect(r.minimum).toBe(334);
    expect(r.manque).toBe(334);
    const nul = liberationMinimale({ apportsNumeraire: c(0), verse: c(0) }, FRACTION);
    expect(nul).toEqual({ suffisante: true, minimum: 0, manque: 0, resteALiberer: 0 });
  });

  it('verse-superieur-refuse', () => {
    expect(codeErreur(() => liberationMinimale({ apportsNumeraire: c(1000), verse: c(1001) }, FRACTION))).toBe(
      'verse_superieur',
    );
    expect(liberationMinimale({ apportsNumeraire: c(1000), verse: c(1000) }, FRACTION).resteALiberer).toBe(0);
  });

  it('capital-non-libere', () => {
    expect(conditionCapitalLibere({ capital: c(1000000), libere: c(600000) })).toEqual({
      remplie: false,
      code: 'capital_non_entierement_libere',
    });
    expect(conditionCapitalLibere({ capital: c(1000000), libere: c(999999) }).remplie).toBe(false);
    const ok = conditionCapitalLibere({ capital: c(1000000), libere: c(1000000) });
    expect(ok).toEqual({ remplie: true });
    expect('code' in ok).toBe(false);
    expect(codeErreur(() => conditionCapitalLibere({ capital: c(1000), libere: c(1001) }))).toBe('verse_superieur');
  });

  it('entrees-invalides', () => {
    for (const parts of [1.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(codeErreur(() => controlePartsCapital([{ id: 'a', parts }], 100))).toBe('entree_invalide');
    }
    for (const total of [1.5, Number.NaN, Number.POSITIVE_INFINITY, -1, 0]) {
      expect(codeErreur(() => controlePartsCapital([{ id: 'a', parts: 1 }], total))).toBe('entree_invalide');
    }
    const base = { apportsNumeraire: c(1000), verse: c(100) };
    for (const f of [-1, 10001, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(codeErreur(() => liberationMinimale(base, f))).toBe('entree_invalide');
    }
    expect(codeErreur(() => liberationMinimale(base, 0))).toBeUndefined();
    expect(codeErreur(() => liberationMinimale(base, 10000))).toBeUndefined();
    expect(codeErreur(() => liberationMinimale({ apportsNumeraire: c(-1), verse: c(0) }, FRACTION))).toBe(
      'entree_invalide',
    );
    expect(codeErreur(() => liberationMinimale({ apportsNumeraire: c(10), verse: c(-1) }, FRACTION))).toBe(
      'entree_invalide',
    );
    expect(codeErreur(() => conditionCapitalLibere({ capital: c(0), libere: c(0) }))).toBe('entree_invalide');
    expect(codeErreur(() => conditionCapitalLibere({ capital: c(10), libere: c(-1) }))).toBe('entree_invalide');
  });
});
