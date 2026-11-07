import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { ErreurDevise, ecartDeChange, tauxAuJour } from '../devises.js';

const c = (n: number): Centimes => n as Centimes;
const ligne = (date: string, taux: bigint, devise = 'XXA', source = 'source-test') => ({ date, devise, taux, source });
const table = [ligne('2026-10-08', 91_000_000n), ligne('2026-10-09', 92_000_000n, 'XXA', 'source-vendredi'), ligne('2026-10-12', 95_000_000n)];
const comptes = { gain: 'cpt-gain', perte: 'cpt-perte', frais: 'cpt-frais' };
const base = { sens: 'achat' as 'achat' | 'vente', montantOrigine: c(100_000), devise: 'XXA', datePiece: '2026-10-09', eurBanque: c(92_840), fraisEur: c(300) };
const ecart = (o: Partial<typeof base> = {}, t = table) => ecartDeChange({ ...base, ...o }, t, comptes, 'demi-pair');
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurDevise ? e.code : 'autre';
  }
  return undefined;
};

describe('devises', () => {
  it('t09-1-perte-cinq-quarante', () => {
    expect(ecart()).toEqual({
      etat: 'propose', eurPiece: 92_000, frais: 300, ecart: 540, nature: 'perte', comptePropose: 'cpt-perte',
      tauxUtilise: { taux: 92_000_000n, dateTaux: '2026-10-09', source: 'source-vendredi' },
    });
  });
  it('vente-gain', () => {
    const r = ecart({ sens: 'vente', eurBanque: c(92_540), fraisEur: c(300) });
    expect(r).toMatchObject({ eurPiece: 92_000, ecart: 840, nature: 'gain', comptePropose: 'cpt-gain', etat: 'propose' });
    expect(ecart({ sens: 'vente', eurBanque: c(91_000), fraisEur: c(0) })).toMatchObject({ nature: 'perte', ecart: 1000 });
    expect(ecart({ eurBanque: c(91_000), fraisEur: c(0) })).toMatchObject({ nature: 'gain', ecart: 1000 });
  });
  it('aucun-ecart', () => {
    const r = ecart({ eurBanque: c(92_300) });
    expect(r).toMatchObject({ nature: 'aucun', ecart: 0, frais: 300 });
    expect('comptePropose' in r).toBe(false);
  });
  it('t09-6-samedi-vendredi', () => {
    expect(tauxAuJour(table, 'XXA', '2026-10-10')).toEqual({ taux: 92_000_000n, dateTaux: '2026-10-09', source: 'source-vendredi' });
    expect(tauxAuJour(table, 'XXA', '2026-10-11').dateTaux).toBe('2026-10-09');
    expect(tauxAuJour([...table].reverse(), 'XXA', '2026-10-12').dateTaux).toBe('2026-10-12');
    expect(ecart({ datePiece: '2026-10-10' }).tauxUtilise.dateTaux).toBe('2026-10-09');
  });
  it('taux-absent-erreur', () => {
    expect(code(() => tauxAuJour([], 'XXA', '2026-10-09'))).toBe('taux_absent');
    expect(code(() => tauxAuJour(table, 'XXB', '2026-10-09'))).toBe('taux_absent');
    expect(code(() => tauxAuJour(table, 'XXA', '2026-10-07'))).toBe('taux_absent');
    expect(code(() => ecart({ devise: 'XXB' }))).toBe('taux_absent');
  });
  it('taux-ambigu-erreur', () => {
    const t = [...table, ligne('2026-10-09', 93_000_000n)];
    expect(code(() => tauxAuJour(t, 'XXA', '2026-10-10'))).toBe('taux_ambigu');
    expect(code(() => tauxAuJour([...table, ligne('2026-10-08', 1n)], 'XXA', '2026-10-10'))).toBeUndefined();
    expect(code(() => tauxAuJour([...table, ligne('2026-10-09', 9n, 'XXB')], 'XXA', '2026-10-10'))).toBeUndefined();
  });
  it('taux-futur-ignore', () => {
    expect(tauxAuJour(table, 'XXA', '2026-10-11').taux).toBe(92_000_000n);
    expect(code(() => tauxAuJour([ligne('2026-10-12', 95_000_000n)], 'XXA', '2026-10-11'))).toBe('taux_absent');
  });
  it('source-et-date-rendues', () => {
    const r = tauxAuJour([ligne('2026-10-09', 92_000_000n, 'XXA', 'source-a'), ligne('2026-10-08', 1n, 'XXA', 'source-b')], 'XXA', '2026-10-10');
    expect(r).toEqual({ taux: 92_000_000n, dateTaux: '2026-10-09', source: 'source-a' });
  });
  it('entrees-invalides', () => {
    for (const d of ['', '2026-13-01', '2026-02-30', '09/10/2026', 'abc']) {
      expect(code(() => tauxAuJour(table, 'XXA', d))).toBe('date_invalide');
      expect(code(() => ecart({ datePiece: d }))).toBe('date_invalide');
    }
    for (const m of [Number.NaN, Infinity, -1, 1.5]) {
      for (const k of ['eurBanque', 'fraisEur', 'montantOrigine'] as const) {
        expect(code(() => ecart({ [k]: m as Centimes }))).toBe('montant_invalide');
      }
    }
    expect(code(() => ecart({ eurBanque: c(200), fraisEur: c(300) }))).toBe('frais_incoherents');
    expect(ecart({ sens: 'vente', eurBanque: c(200), fraisEur: c(300) })).toMatchObject({ nature: 'perte' });
  });
});
