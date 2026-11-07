import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import { confirmationDemandee, evaluerMicroComptable, type TailleExercice } from '../micro-comptable.js';

const c = (n: number): Centimes => centimes(n);
const S = { bilanMax: c(400000), caMax: c(800000), effectifMax: 10, criteresRequis: 2 };
const T: TailleExercice = { totalBilanCentimes: c(100000), caNetCentimes: c(500000), effectifMoyen: 3, source: 'exercice_clos' };
const ev = (t: Partial<TailleExercice>, s = S) => evaluerMicroComptable({ ...T, ...t }, s);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

describe('evaluerMicroComptable', () => {
  it('deux-sur-trois-micro-p18', () => {
    const r = ev({ caNetCentimes: c(900000) });
    expect(r).toMatchObject({ microComptable: true, nonDepasses: 2, inconnus: 0, dispensesProposees: true, regleDureeAVerifier: true });
  });

  it('un-sur-trois-non-micro', () => {
    const r = ev({ caNetCentimes: c(900000), effectifMoyen: 11 });
    expect(r).toMatchObject({ microComptable: false, nonDepasses: 1, dispensesProposees: false });
  });

  it('trois-sur-trois', () => {
    expect(ev({})).toMatchObject({ microComptable: true, nonDepasses: 3, dispensesProposees: true });
    expect(ev({}, { ...S, criteresRequis: 3 }).microComptable).toBe(true);
    expect(ev({ effectifMoyen: 11 }, { ...S, criteresRequis: 3 }).microComptable).toBe(false);
  });

  it('egal-au-seuil-non-depasse', () => {
    const r = ev({ totalBilanCentimes: c(400000), caNetCentimes: c(800000), effectifMoyen: 10 });
    expect(r.criteres).toEqual([true, true, true]);
    const d = ev({ totalBilanCentimes: c(400001), caNetCentimes: c(800001), effectifMoyen: 11 });
    expect(d.criteres).toEqual([false, false, false]);
  });

  it('inconnu-qui-change-la-conclusion-null', () => {
    const r = ev({ caNetCentimes: c(900000), effectifMoyen: null });
    expect(r).toMatchObject({ microComptable: null, nonDepasses: 1, inconnus: 1, dispensesProposees: false });
    expect(ev({ source: 'je_ne_sais_pas' })).toMatchObject({ microComptable: null, nonDepasses: 0, inconnus: 3 });
  });

  it('inconnu-sans-effet-conclu', () => {
    expect(ev({ effectifMoyen: null })).toMatchObject({ microComptable: true, nonDepasses: 2, inconnus: 1 });
    const r = ev({ caNetCentimes: c(900000), effectifMoyen: 11, totalBilanCentimes: null });
    expect(r).toMatchObject({ microComptable: false, nonDepasses: 0, inconnus: 1 });
  });

  it('critere-qui-change-demande-confirmation', () => {
    const avant = ev({});
    expect(confirmationDemandee(avant, ev({}))).toBe(false);
    expect(confirmationDemandee(avant, ev({ caNetCentimes: c(900000) }))).toBe(true);
    expect(confirmationDemandee(ev({ caNetCentimes: c(900000) }), ev({ caNetCentimes: c(100) }))).toBe(true);
    expect(confirmationDemandee(avant, ev({ caNetCentimes: c(900000), effectifMoyen: 11 }))).toBe(true);
    expect(confirmationDemandee(avant, ev({ effectifMoyen: null }))).toBe(false);
    expect(confirmationDemandee(avant, ev({ source: 'je_ne_sais_pas' }))).toBe(true);
  });

  it('entrees-invalides', () => {
    const t = (e: Partial<TailleExercice>, s = S) => code(() => ev(e, s));
    for (const v of [-1, 1.5, Number.NaN, Infinity]) {
      expect(t({ totalBilanCentimes: v as Centimes })).toBe('entree_invalide');
      expect(t({ caNetCentimes: v as Centimes })).toBe('entree_invalide');
      expect(t({ effectifMoyen: v })).toBe('entree_invalide');
      expect(t({}, { ...S, bilanMax: v as Centimes })).toBe('entree_invalide');
      expect(t({}, { ...S, caMax: v as Centimes })).toBe('entree_invalide');
      expect(t({}, { ...S, effectifMax: v })).toBe('entree_invalide');
    }
    for (const k of [0, 4, -1, 1.5, Number.NaN, Infinity]) expect(t({}, { ...S, criteresRequis: k })).toBe('entree_invalide');
    expect(t({ source: 'autre' as TailleExercice['source'] })).toBe('entree_invalide');
    expect(t({}, { ...S, criteresRequis: 1 })).toBeUndefined();
    expect(t({}, { ...S, criteresRequis: 3 })).toBeUndefined();
    const max = Number.MAX_SAFE_INTEGER as Centimes;
    expect(ev({ caNetCentimes: max }).criteres[1]).toBe(false);
    expect(ev({ caNetCentimes: max }, { ...S, caMax: max }).criteres[1]).toBe(true);
  });
});
