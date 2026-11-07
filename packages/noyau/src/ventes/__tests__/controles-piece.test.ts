import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../../../../parametres/src/au-jour.js';
import { centimes, type Centimes } from '../../argent/index.js';
import { controleTotaux, controleTvaParTaux, tauxAttendusALaDate } from '../controles-piece.js';
import { ErreurVente } from '../types.js';

const c = centimes;
const param = (valeur: string, statut: ParametreLegal['statut'] = 'valide', debut = '2026-01-01', fin: string | null = null): ParametreLegal => ({
  cle: 'cle.inventee.taux', pays: 'FR', valeur, effet_debut: debut, effet_fin: fin, statut, source: 'Source inventée', date_releve: '2026-06-01',
});
const ligne = (tauxPdb: number, base: number, tva: number) => ({ tauxPdb, baseCentimes: c(base), tvaLueCentimes: c(tva) });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};

describe('contrôles arithmétiques d une facture lue', () => {
  it('totaux-justes', () => {
    expect(controleTotaux({ ht: c(100000), tva: c(19000), ttc: c(119000) })).toEqual({ ok: true, ecart: 0 });
  });
  it('totaux-ecart-un-centime-a1', () => {
    expect(controleTotaux({ ht: c(100000), tva: c(19000), ttc: c(119001) })).toEqual({ ok: false, ecart: 1, anomalie: 'A1' });
    expect(controleTotaux({ ht: c(100000), tva: c(19000), ttc: c(118999) })).toEqual({ ok: false, ecart: -1, anomalie: 'A1' });
  });
  it('v08-ecart-de-tva-a2-tva-lue-retenue', () => {
    const [r] = controleTvaParTaux([ligne(1900, 33333, 6400)], [1900]);
    expect(r).toMatchObject({ tauxPdb: 1900, tvaRetenue: 6400, tvaAttendue: 6333, ecart: 67, anomalie: 'A2' });
  });
  it('ecart-d-un-centime-sans-carte', () => {
    for (const lue of [6332, 6334]) {
      const [r] = controleTvaParTaux([ligne(1900, 33333, lue)], [1900]);
      expect(r?.anomalie).toBeUndefined();
      expect(r?.tvaRetenue).toBe(lue);
    }
    expect(controleTvaParTaux([ligne(1900, 33333, 6335)], [1900])[0]?.anomalie).toBe('A2');
    expect(controleTvaParTaux([ligne(1900, 33333, 6331)], [1900])[0]?.anomalie).toBe('A2');
  });
  it('taux-inconnu-a3', () => {
    const r = controleTvaParTaux([ligne(900, 1000, 90), ligne(1900, 1000, 190)], [1900]);
    expect(r.map((x) => [x.tauxPdb, x.anomalie])).toEqual([[900, 'A3'], [1900, undefined]]);
    expect(r[0]?.tvaRetenue).toBe(90);
    expect(controleTvaParTaux([ligne(1900, 1000, 190)], [])[0]?.anomalie).toBe('A3');
  });
  it('regroupe-par-taux-ordre-inverse', () => {
    const r = controleTvaParTaux([ligne(1900, 1000, 190), ligne(600, 1000, 60), ligne(1900, 2000, 380)], [600, 1900]);
    expect(r.map((x) => [x.tauxPdb, x.tvaRetenue, x.tvaAttendue])).toEqual([[600, 60, 60], [1900, 570, 570]]);
  });
  it('parametre-absent-a3-partout', () => {
    expect(tauxAttendusALaDate([param('600')], 'cle.inventee.taux', 'FR', '2025-12-31')).toEqual({ absent: true });
    expect(tauxAttendusALaDate([], 'cle.inventee.taux', 'FR', '2026-02-01')).toEqual({ absent: true });
  });
  it('parametre-a-verifier-marque', () => {
    expect(tauxAttendusALaDate([param('600|900|1900')], 'cle.inventee.taux', 'FR', '2026-02-01')).toEqual({ taux: [600, 900, 1900], aVerifier: false });
    expect(tauxAttendusALaDate([param('600', 'a_verifier')], 'cle.inventee.taux', 'FR', '2026-02-01')).toEqual({ taux: [600], aVerifier: true });
    expect(tauxAttendusALaDate([param('0')], 'cle.inventee.taux', 'FR', '2026-02-01')).toEqual({ taux: [0], aVerifier: false });
    const deux = [param('600', 'valide', '2026-01-01', '2026-06-01'), param('900', 'valide', '2026-06-01')];
    expect(tauxAttendusALaDate(deux, 'cle.inventee.taux', 'FR', '2026-06-01')).toEqual({ taux: [900], aVerifier: false });
  });
  it('parametre-ambigu-propage', () => {
    const l = [param('600'), param('900')];
    expect(() => tauxAttendusALaDate(l, 'cle.inventee.taux', 'FR', '2026-02-01')).toThrow(/parametre_ambigu/);
  });
  it('parametre-mal-forme', () => {
    for (const v of ['19.6', 'abc', '', '-1', '600|', '|600', '600||900', ' 600', '99999999999999999999']) {
      expect(code(() => tauxAttendusALaDate([param(v)], 'cle.inventee.taux', 'FR', '2026-02-01'))).toBe('parametre_mal_forme');
    }
  });
  it('entrees-invalides', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      const m = mauvais as Centimes;
      expect(code(() => controleTotaux({ ht: m, tva: c(0), ttc: c(0) }))).toBe('montant_invalide');
      expect(code(() => controleTotaux({ ht: c(0), tva: m, ttc: c(0) }))).toBe('montant_invalide');
      expect(code(() => controleTotaux({ ht: c(0), tva: c(0), ttc: m }))).toBe('montant_invalide');
      expect(code(() => controleTvaParTaux([{ tauxPdb: 600, baseCentimes: m, tvaLueCentimes: c(0) }], [600]))).toBe('montant_invalide');
      expect(code(() => controleTvaParTaux([{ tauxPdb: 600, baseCentimes: c(0), tvaLueCentimes: m }], [600]))).toBe('montant_invalide');
      expect(code(() => controleTvaParTaux([ligne(mauvais, 1, 0)], [600]))).toBe('taux_invalide');
    }
    expect(controleTvaParTaux([], [600])).toEqual([]);
  });
});
