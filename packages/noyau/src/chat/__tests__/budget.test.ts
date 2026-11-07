import { describe, expect, it } from 'vitest';
import { ajouterCoutReel, autoriserAppel, autoriserAppelEvenement, estimerCout } from '../budget.js';
import { ErreurChat, microCentimes } from '../types.js';

const base = { jetonsEntree: 1000, plafondJetonsSortie: 200, tarifEntree: 3, tarifSortie: 7 };
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChat ? e.code : 'autre';
  }
  return 'aucune';
};
const mc = microCentimes;

describe('budget', () => {
  it('estimation-exacte', () => {
    expect(estimerCout(base)).toBe(4400);
    expect(estimerCout({ ...base, tarifSortie: 0 })).toBe(3000);
    expect(estimerCout({ ...base, tarifEntree: 0 })).toBe(1400);
  });

  it('refus-au-dessus-du-plafond', () => {
    expect(autoriserAppel({ depense: mc(600), estimation: mc(401), plafond: mc(1000) })).toEqual({
      permis: false,
      code: 'budget_tour_atteint',
    });
  });

  it('egalite-permise', () => {
    expect(autoriserAppel({ depense: mc(600), estimation: mc(400), plafond: mc(1000) })).toEqual({ permis: true });
    expect(autoriserAppel({ depense: mc(0), estimation: mc(0), plafond: mc(0) })).toEqual({ permis: true });
  });

  it('plafond-absent-refuse', () => {
    expect(autoriserAppel({ depense: mc(0), estimation: mc(0), plafond: undefined })).toEqual({
      permis: false,
      code: 'budget_tour_atteint',
    });
  });

  it('arguments-invalides', () => {
    const mauvais = [Number.NaN, Infinity, -Infinity, -1, 1.5, '3'] as unknown as number[];
    for (const champ of ['jetonsEntree', 'plafondJetonsSortie', 'tarifEntree', 'tarifSortie'] as const) {
      for (const m of mauvais) {
        expect(code(() => estimerCout({ ...base, [champ]: m }))).toBe('parametre_invalide');
      }
    }
    expect(code(() => ajouterCoutReel(mc(1), -1 as number))).toBe('parametre_invalide');
    expect(code(() => ajouterCoutReel(mc(1), 1.5))).toBe('parametre_invalide');
    expect(code(() => autoriserAppelEvenement(1.5, 3))).toBe('parametre_invalide');
    expect(code(() => autoriserAppelEvenement(-1, 3))).toBe('parametre_invalide');
    expect(code(() => autoriserAppelEvenement(0, Number.NaN))).toBe('parametre_invalide');
  });

  it('depassement-entier-sur', () => {
    const max = Number.MAX_SAFE_INTEGER;
    expect(code(() => estimerCout({ ...base, jetonsEntree: max, tarifEntree: max }))).toBe('parametre_invalide');
    expect(code(() => estimerCout({ ...base, jetonsEntree: max, tarifEntree: 1, plafondJetonsSortie: 1, tarifSortie: 1 }))).toBe(
      'parametre_invalide',
    );
    expect(estimerCout({ jetonsEntree: max, tarifEntree: 1, plafondJetonsSortie: 0, tarifSortie: 0 })).toBe(max);
    expect(code(() => ajouterCoutReel(mc(max), 1))).toBe('parametre_invalide');
    expect(ajouterCoutReel(mc(max - 1), 1)).toBe(max);
  });

  it('cout-reel-ajoute', () => {
    expect(ajouterCoutReel(mc(0), 0)).toBe(0);
    expect(ajouterCoutReel(mc(600), 250)).toBe(850);
    expect(ajouterCoutReel(ajouterCoutReel(mc(10), 20), 30)).toBe(60);
  });

  it('appel-de-trop-incomplet', () => {
    expect(autoriserAppelEvenement(3, 4)).toEqual({ permis: true });
    expect(autoriserAppelEvenement(4, 4)).toEqual({ permis: false, rapport: 'incomplet' });
    expect(autoriserAppelEvenement(5, 4)).toEqual({ permis: false, rapport: 'incomplet' });
    expect(autoriserAppelEvenement(0, 0)).toEqual({ permis: false, rapport: 'incomplet' });
  });

  it('aucun-coefficient-de-remise', () => {
    const cas = [
      [1, 1, 1, 1],
      [10, 5, 2, 3],
      [1000, 200, 3, 7],
      [100000, 4000, 1, 9],
      [0, 50, 4, 6],
    ] as const;
    expect(cas.map(([a, b, c, d]) => estimerCout({ jetonsEntree: a, plafondJetonsSortie: b, tarifEntree: c, tarifSortie: d }))).toEqual([
      2, 35, 4400, 136000, 300,
    ]);
    // @ts-expect-error aucun champ de remise n'est accepté
    estimerCout({ ...base, remise: 1 });
    // @ts-expect-error aucun champ de remise n'est accepté
    estimerCout({ ...base, coefficientLot: 1 });
  });

  it('zero-jeton', () => {
    expect(estimerCout({ ...base, jetonsEntree: 0, plafondJetonsSortie: 0 })).toBe(0);
    expect(estimerCout({ ...base, jetonsEntree: 0 })).toBe(1400);
    expect(estimerCout({ ...base, plafondJetonsSortie: 0 })).toBe(3000);
  });
});
