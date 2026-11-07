import { describe, expect, it } from 'vitest';
import { type Centimes, centimes } from '../../argent/index.js';
import {
  type CumulMois,
  ErreurPeriodicite,
  periodiciteSelonChiffreAffaires,
  periodiciteSelonTvaAnnuelle,
} from '../periodicite.js';

const c = (n: number): Centimes => centimes(n);
const seuils = { seuilN1: c(70000000), seuilN: c(77000000) };
const cumul = (mois: string, n: number): CumulMois => ({ mois, cumul: c(n) });
const entree = (ca: number, acq: number, cumulsN: CumulMois[] = []) => ({
  chiffreAffairesN1: c(ca),
  acquisitionsN1: c(acq),
  cumulsN,
});
function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurPeriodicite ? e.code : 'autre';
  }
  return undefined;
}

describe('périodicité de la TVA', () => {
  it('egal-aux-seuils-trimestrielle', () => {
    const r = periodiciteSelonChiffreAffaires(entree(50000000, 20000000, [cumul('2026-01', 77000000)]), seuils);
    expect(r).toEqual({ periodicite: 'trimestrielle' });
    expect(periodiciteSelonChiffreAffaires(entree(0, 0), seuils)).toEqual({ periodicite: 'trimestrielle' });
  });

  it('un-centime-de-plus-n1-mensuelle', () => {
    expect(periodiciteSelonChiffreAffaires(entree(70000001, 0), seuils)).toEqual({ periodicite: 'mensuelle' });
    expect(periodiciteSelonChiffreAffaires(entree(70000000, 1, [cumul('2026-01', 1)]), seuils)).toEqual({
      periodicite: 'mensuelle',
    });
  });

  it('acquisitions-comptees', () => {
    expect(periodiciteSelonChiffreAffaires(entree(60000000, 0), seuils).periodicite).toBe('trimestrielle');
    expect(periodiciteSelonChiffreAffaires(entree(60000000, 10000001), seuils).periodicite).toBe('mensuelle');
  });

  it('depassement-en-mars-reprend-janvier', () => {
    const cumuls = [cumul('2026-01', 1000), cumul('2026-02', 77000000), cumul('2026-03', 77000001), cumul('2026-04', 80000000)];
    expect(periodiciteSelonChiffreAffaires(entree(1, 0, cumuls), seuils)).toEqual({
      periodicite: 'mensuelle',
      moisBascule: '2026-03',
      repriseDepuis: '2026-01',
    });
  });

  it('depassement-en-mai-reprend-avril', () => {
    const r = periodiciteSelonChiffreAffaires(entree(1, 0, [cumul('2026-04', 5), cumul('2026-05', 77000001)]), seuils);
    expect(r).toEqual({ periodicite: 'mensuelle', moisBascule: '2026-05', repriseDepuis: '2026-04' });
    const dec = periodiciteSelonChiffreAffaires(entree(1, 0, [cumul('2026-12', 77000001)]), seuils);
    expect(dec.repriseDepuis).toBe('2026-10');
    const juil = periodiciteSelonChiffreAffaires(entree(1, 0, [cumul('2026-07', 77000001)]), seuils);
    expect(juil.repriseDepuis).toBe('2026-07');
  });

  it('aucun-trimestre-propose-en-plus', () => {
    const t = periodiciteSelonChiffreAffaires(entree(1, 0, [cumul('2026-01', 5)]), seuils);
    expect(Object.keys(t)).toEqual(['periodicite']);
    const m = periodiciteSelonChiffreAffaires(entree(70000001, 0, [cumul('2026-03', 99000000)]), seuils);
    expect(Object.keys(m)).toEqual(['periodicite']);
  });

  it('tva-annuelle-strictement-inferieure', () => {
    expect(periodiciteSelonTvaAnnuelle(c(299999), c(300000))).toBe('trimestrielle');
    expect(periodiciteSelonTvaAnnuelle(c(300000), c(300000))).toBe('mensuelle');
    expect(periodiciteSelonTvaAnnuelle(c(300001), c(300000))).toBe('mensuelle');
    expect(code(() => periodiciteSelonTvaAnnuelle(c(-1), c(300000)))).toBe('montant_invalide');
    expect(code(() => periodiciteSelonTvaAnnuelle(c(1), Number.NaN as Centimes))).toBe('seuil_invalide');
    expect(code(() => periodiciteSelonTvaAnnuelle(c(1), 1.5 as Centimes))).toBe('seuil_invalide');
  });

  it('cumuls-non-tries-refuses', () => {
    const appel = (cumuls: CumulMois[]) => () => periodiciteSelonChiffreAffaires(entree(1, 0, cumuls), seuils);
    expect(code(appel([cumul('2026-03', 1), cumul('2026-02', 2)]))).toBe('ordre_invalide');
    expect(code(appel([cumul('2026-02', 1), cumul('2026-02', 2)]))).toBe('mois_en_double');
    expect(code(appel([cumul('2026-13', 1)]))).toBe('mois_invalide');
    expect(code(appel([cumul('2026-1', 1)]))).toBe('mois_invalide');
    expect(code(appel([cumul('2026-02', -1)]))).toBe('montant_invalide');
    const seuilsKo = (s: Partial<typeof seuils>) => () => periodiciteSelonChiffreAffaires(entree(1, 0), { ...seuils, ...s });
    expect(code(seuilsKo({ seuilN: Number.NaN as Centimes }))).toBe('seuil_invalide');
    expect(code(seuilsKo({ seuilN1: Number.POSITIVE_INFINITY as Centimes }))).toBe('seuil_invalide');
    expect(code(seuilsKo({ seuilN1: 0.5 as Centimes }))).toBe('seuil_invalide');
    expect(code(() => periodiciteSelonChiffreAffaires(entree(-1, 0), seuils))).toBe('montant_invalide');
    expect(code(() => periodiciteSelonChiffreAffaires(entree(1, -1), seuils))).toBe('montant_invalide');
  });
});
