import { describe, expect, it } from 'vitest';
import { centimes, type Arrondi, type Centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import { calculerIs } from '../calcul-is.js';

const c = (n: number): Centimes => centimes(n);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const P = { tauxReduitPdb: 1500, tauxNormalPdb: 2500, plafondCentimes: c(4000000), arrondi: 'demi-superieur' as Arrondi };
const E = { beneficeCentimes: c(10000000), dureeMois: 12, eligibilite: 'eligible' as const };

describe('calculerIs', () => {
  it('eligible-douze-mois', () => {
    const r = calculerIs({ ...E, beneficeCentimes: c(10000001) }, P);
    expect(r.statut).toBe('calcule');
    expect(r.partReduite).toBe(c(600000));
    expect(r.partNormale).toBe(c(1500000));
    expect(r.impotCentimes).toBe(c(2100000));
    expect((r.partReduite as number) + (r.partNormale as number)).toBe(r.impotCentimes);
  });

  it('benefice-sous-plafond', () => {
    const r = calculerIs({ ...E, beneficeCentimes: c(2000000) }, P);
    expect(r).toMatchObject({ statut: 'calcule', partReduite: c(300000), partNormale: c(0), impotCentimes: c(300000) });
  });

  it('benefice-egal-plafond', () => {
    const r = calculerIs({ ...E, beneficeCentimes: P.plafondCentimes }, P);
    expect(r).toMatchObject({ partReduite: c(600000), partNormale: c(0), impotCentimes: c(600000) });
  });

  it('non-eligible-tout-au-taux-normal', () => {
    const r = calculerIs({ ...E, eligibilite: 'non_eligible' }, P);
    expect(r).toMatchObject({ statut: 'calcule', partReduite: c(0), partNormale: c(2500000), impotCentimes: c(2500000) });
  });

  it('exercice-long-jamais-proratise', () => {
    for (const d of [13, 18, 24]) {
      const r = calculerIs({ ...E, dureeMois: d }, P);
      expect(r).toMatchObject({ statut: 'a_verifier', impotCentimes: null, motif: 'exercice_long_a_verifier' });
      expect(r.partReduite).toBe(c(0));
      expect(r.partNormale).toBe(c(0));
    }
    const sortie = JSON.stringify(calculerIs({ ...E, dureeMois: 18 }, { ...P, plafondCentimes: c(7777700) }));
    expect(sortie).not.toContain('11666550');
    expect(sortie).not.toContain('7777700');
  });

  it('exercice-court-a-verifier', () => {
    for (const d of [1, 6, 11]) {
      const r = calculerIs({ ...E, dureeMois: d }, P);
      expect(r).toMatchObject({ statut: 'a_verifier', impotCentimes: null, motif: 'exercice_court_a_verifier' });
    }
  });

  it('taux-reduit-a-confirmer-a-verifier', () => {
    const r = calculerIs({ ...E, eligibilite: 'a_confirmer' }, P);
    expect(r).toMatchObject({ statut: 'a_verifier', motif: 'taux_reduit_a_confirmer', impotCentimes: c(2500000), partReduite: c(0), partNormale: c(2500000) });
  });

  it('benefice-negatif-zero', () => {
    for (const b of [0, -1, -5000000]) {
      const r = calculerIs({ ...E, beneficeCentimes: c(b) }, P);
      expect(r).toMatchObject({ statut: 'calcule', impotCentimes: c(0), partReduite: c(0), partNormale: c(0) });
    }
  });

  it('entrees-invalides', () => {
    const bad = [Number.NaN, Number.POSITIVE_INFINITY, 1.5];
    for (const b of bad) expect(code(() => calculerIs({ ...E, beneficeCentimes: b as Centimes }, P))).toBe('entree_invalide');
    for (const d of [...bad, 0, -12]) expect(code(() => calculerIs({ ...E, dureeMois: d }, P))).toBe('entree_invalide');
    for (const t of [...bad, -1, 10001]) {
      expect(code(() => calculerIs(E, { ...P, tauxReduitPdb: t }))).toBe('entree_invalide');
      expect(code(() => calculerIs(E, { ...P, tauxNormalPdb: t }))).toBe('entree_invalide');
    }
    for (const p of [...bad, -1]) expect(code(() => calculerIs(E, { ...P, plafondCentimes: p as Centimes }))).toBe('entree_invalide');
    expect(code(() => calculerIs({ ...E, eligibilite: 'peut-etre' as never }, P))).toBe('entree_invalide');
    expect(code(() => calculerIs(E, { ...P, tauxReduitPdb: 0, tauxNormalPdb: 10000 }))).toBeUndefined();
  });
});
