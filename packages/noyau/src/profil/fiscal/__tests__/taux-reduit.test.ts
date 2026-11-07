import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import { eligibiliteTauxReduit } from '../taux-reduit.js';

type Entree = Parameters<typeof eligibiliteTauxReduit>[0];
const c = (n: number): Centimes => centimes(n);
const SEUILS = { caMaxCentimes: c(1000000), detentionMinPdb: 7500 };
const OK: Entree = { caCentimes: c(500000), dureeMois: 12, capitalLibere: true, detentionPpPdb: 8000 };
const ev = (e: Partial<Entree>) => eligibiliteTauxReduit({ ...OK, ...e }, SEUILS);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

describe('eligibiliteTauxReduit', () => {
  it('eligible-tout-rempli', () => {
    expect(ev({})).toEqual({ statut: 'eligible', motifs: [] });
  });

  it('detention-insuffisante-p10', () => {
    expect(ev({ detentionPpPdb: 6000 })).toEqual({ statut: 'non_eligible', motifs: ['detention_insuffisante'] });
    expect(ev({ detentionPpPdb: 7500 }).statut).toBe('eligible');
    expect(ev({ detentionPpPdb: 7499 }).statut).toBe('non_eligible');
  });

  it('capital-non-libere', () => {
    expect(ev({ capitalLibere: false })).toEqual({ statut: 'non_eligible', motifs: ['capital_non_libere'] });
  });

  it('donnee-manquante-jamais-eligible', () => {
    expect(ev({ caCentimes: null })).toEqual({ statut: 'a_confirmer', motifs: ['ca_absent'] });
    expect(ev({ capitalLibere: null })).toEqual({ statut: 'a_confirmer', motifs: ['capital_libere_inconnu'] });
    expect(ev({ detentionPpPdb: null })).toEqual({ statut: 'a_confirmer', motifs: ['detention_inconnue'] });
  });

  it('ca-ramene-a-douze-mois', () => {
    expect(ev({ dureeMois: 6, caCentimes: c(500000) }).statut).toBe('eligible');
    expect(ev({ dureeMois: 6, caCentimes: c(500001) })).toEqual({ statut: 'non_eligible', motifs: ['ca_au_dessus'] });
  });

  it('ca-a-la-borne', () => {
    expect(ev({ caCentimes: c(1000000) }).statut).toBe('eligible');
    expect(ev({ caCentimes: c(1000001) }).statut).toBe('non_eligible');
  });

  it('exercice-long-a-verifier', () => {
    expect(ev({ dureeMois: 18, caCentimes: c(1) })).toEqual({ statut: 'a_confirmer', motifs: ['exercice_long_a_verifier'] });
    expect(ev({ dureeMois: 13 }).statut).toBe('a_confirmer');
  });

  it('non-l-emporte-sur-inconnu', () => {
    const r = ev({ caCentimes: null, capitalLibere: false, detentionPpPdb: null });
    expect(r.statut).toBe('non_eligible');
    expect(r.motifs).toEqual(expect.arrayContaining(['capital_non_libere', 'ca_absent', 'detention_inconnue']));
    expect(ev({ caCentimes: c(2000000), detentionPpPdb: null }).statut).toBe('non_eligible');
  });

  it('entrees-invalides', () => {
    const inv = (e: Partial<Entree>, s = SEUILS) => code(() => eligibiliteTauxReduit({ ...OK, ...e }, s));
    expect(inv({ caCentimes: -1 as Centimes })).toBe('entree_invalide');
    for (const d of [0, -1, 13.5, 1.5, Number.NaN, Infinity, -Infinity]) expect(inv({ dureeMois: d })).toBe('entree_invalide');
    expect(inv({ detentionPpPdb: Number.NaN })).toBe('entree_invalide');
    expect(inv({ detentionPpPdb: -1 })).toBe('entree_invalide');
    expect(inv({ caCentimes: 1.5 as Centimes })).toBe('entree_invalide');
    expect(inv({}, { ...SEUILS, caMaxCentimes: 1.5 as Centimes })).toBe('entree_invalide');
    expect(inv({}, { ...SEUILS, caMaxCentimes: -1 as Centimes })).toBe('entree_invalide');
    expect(inv({}, { ...SEUILS, detentionMinPdb: 0.5 })).toBe('entree_invalide');
    expect(inv({}, { ...SEUILS, detentionMinPdb: Infinity })).toBe('entree_invalide');
    expect(ev({ caCentimes: Number.MAX_SAFE_INTEGER as Centimes, dureeMois: 12 }).motifs).toContain('ca_au_dessus');
    const grand = { caMaxCentimes: Number.MAX_SAFE_INTEGER as Centimes, detentionMinPdb: 7500 };
    const e = eligibiliteTauxReduit({ ...OK, caCentimes: Number.MAX_SAFE_INTEGER as Centimes, dureeMois: 11 }, grand);
    expect(e).toEqual({ statut: 'non_eligible', motifs: ['ca_au_dessus'] });
  });
});
