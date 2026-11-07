import { describe, expect, it } from 'vitest';
import { classer, type Imputation } from '../classificateur.js';
import { ErreurChat } from '../../chat/types.js';

const R = { seuilPointsDeBase: 8000, minimumHistorique: 3 };
const c = (compte: string, journal = 'JX'): Imputation => ({ compte, journal });
const fois = (n: number, i: Imputation): Imputation[] => Array.from({ length: n }, () => i);
const A = c('L01-T12-A', 'J1');
const B = c('L01-T12-B', 'J2');
const IA = c('L01-T12-IA', 'J3');

describe('classificateur', () => {
  it('regle-gagne', () => {
    const d = classer({ regle: A, historique: fois(10, B), propositionIaExemples: IA }, R);
    expect(d).toEqual({ ...A, source: 'regle_societe', confiance: 'sur' });
  });

  it('historique-concordant', () => {
    const d = classer({ historique: [...fois(9, A), B], propositionIaExemples: IA }, R);
    expect(d).toEqual({ ...A, source: 'historique', confiance: 'sur' });
  });

  it('historique-au-seuil-exact', () => {
    expect(classer({ historique: [...fois(4, A), B] }, R)).toEqual({ ...A, source: 'historique', confiance: 'sur' });
    expect(classer({ historique: [...fois(3, A), ...fois(2, B)] }, R).source).toBe('aucune');
  });

  it('historique-sous-le-seuil', () => {
    const d = classer({ historique: [...fois(3, A), B] }, R);
    expect(d.source).toBe('aucune');
    const e = classer({ historique: [...fois(3, A), B], propositionIaExemples: IA }, R);
    expect(e).toEqual({ ...IA, source: 'ia_exemples', confiance: 'a_verifier' });
  });

  it('historique-trop-court', () => {
    expect(classer({ historique: fois(2, A) }, R).source).toBe('aucune');
    expect(classer({ historique: fois(3, A) }, R).source).toBe('historique');
    expect(classer({ historique: [] }, { seuilPointsDeBase: 0, minimumHistorique: 0 }).source).toBe('aucune');
  });

  it('egalite-pas-concordante', () => {
    const large = { seuilPointsDeBase: 5000, minimumHistorique: 2 };
    const h = [...fois(2, A), ...fois(2, B)];
    expect(classer({ historique: h }, large).source).toBe('aucune');
    expect(classer({ historique: h, propositionIaExemples: A }, large).confiance).toBe('a_verifier');
  });

  it('ia-exemples', () => {
    const h = [...fois(2, A), B];
    expect(classer({ historique: h, propositionIaExemples: A }, R)).toEqual({ ...A, source: 'ia_exemples', confiance: 'sur' });
    expect(classer({ historique: h, propositionIaExemples: IA }, R).confiance).toBe('a_verifier');
    expect(classer({ historique: [], propositionIaExemples: IA }, R).confiance).toBe('a_verifier');
  });

  it('ia-seule-a-verifier', () => {
    const h = [...fois(2, A), B];
    expect(classer({ historique: h, propositionIaSeule: A }, R)).toEqual({ ...A, source: 'ia_seule', confiance: 'a_verifier' });
  });

  it('rien-douteux', () => {
    expect(classer({ historique: [] }, R)).toEqual({ source: 'aucune', confiance: 'douteux' });
  });

  it('reglages-invalides', () => {
    const code = (r: { seuilPointsDeBase: number; minimumHistorique: number }): string | undefined => {
      try {
        classer({ historique: [] }, r);
      } catch (e) {
        return e instanceof ErreurChat ? e.code : 'autre';
      }
      return undefined;
    };
    for (const s of [10_001, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code({ seuilPointsDeBase: s, minimumHistorique: 1 })).toBe('parametre_invalide');
    }
    for (const m of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code({ seuilPointsDeBase: 100, minimumHistorique: m })).toBe('parametre_invalide');
    }
    expect(code({ seuilPointsDeBase: 10_000, minimumHistorique: 0 })).toBeUndefined();
    expect(code({ seuilPointsDeBase: 0, minimumHistorique: 0 })).toBeUndefined();
  });
});
