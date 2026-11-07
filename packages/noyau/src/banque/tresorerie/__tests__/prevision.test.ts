import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import * as module from '../prevision.js';
import { ErreurPrevision, prevoirTresorerie } from '../prevision.js';

const e = (euros: number) => centimes(euros * 100);
const flux = (id: string, date: string, euros: number, origine: string, rapproche = false) => ({
  id,
  date,
  montant: e(euros),
  origine,
  certitude: 'certain',
  rapproche,
});
const soldes = [
  { compteId: 'c1', solde: e(12_000), date: '2026-11-03' },
  { compteId: 'c2', solde: e(6_400), date: '2026-11-04' },
];
const fluxT11 = [
  flux('f1', '2026-11-20', 6_000, 'facture_client'),
  flux('f2', '2026-11-15', -4_200, 'facture_fournisseur'),
  flux('f3', '2026-11-25', -1_500, 'echeance_fiscale'),
  flux('f4', '2026-12-05', -2_300, 'emprunt'),
];
const base = {
  soldes,
  flux: fluxT11,
  aujourdhui: '2026-11-04',
  horizonJours: 60,
  scenario: 'central' as const,
  seuilBas: e(0),
  ancienneteMaxJours: 7,
};
const fin = (r: ReturnType<typeof prevoirTresorerie>): number => r.points.at(-1)?.solde ?? Number.NaN;

describe('prévision de trésorerie', () => {
  it('t11-1-centrale-seize-mille-quatre-cents', () => {
    const r = prevoirTresorerie(base);
    expect(r.soldeDepart).toBe(e(18_400));
    expect(fin(r)).toBe(e(16_400));
    expect(r.points.map((p) => [p.date, p.solde / 100])).toEqual([
      ['2026-11-04', 18_400],
      ['2026-11-15', 14_200],
      ['2026-11-20', 20_200],
      ['2026-11-25', 18_700],
      ['2026-12-05', 16_400],
      ['2027-01-03', 16_400],
    ]);
    expect(r.points[1]?.fluxIds).toEqual(['f2']);
  });

  it('t11-2-prudente-dix-mille-quatre-cents', () => {
    const r = prevoirTresorerie({ ...base, scenario: 'prudent' });
    expect(fin(r)).toBe(e(10_400));
    expect(r.points.flatMap((p) => p.fluxIds)).not.toContain('f1');
  });

  it('t11-3-alerte-sous-le-seuil', () => {
    expect(prevoirTresorerie({ ...base, seuilBas: e(12_000) }).alerte).toBe(true);
    expect(prevoirTresorerie({ ...base, scenario: 'prudent', seuilBas: e(12_000) }).alerte).toBe(true);
  });

  it('t11-3-pas-d-alerte', () => {
    expect(prevoirTresorerie({ ...base, seuilBas: e(10_000) }).alerte).toBe(false);
    expect(prevoirTresorerie({ ...base, seuilBas: e(10_400) }).alerte).toBe(false);
    expect(prevoirTresorerie({ ...base, seuilBas: e(10_401) }).alerte).toBe(true);
  });

  it('t11-4-rapprochee-sortie', () => {
    const f = fluxT11.map((x) => (x.id === 'f2' ? { ...x, rapproche: true } : x));
    const r = prevoirTresorerie({ ...base, flux: f });
    expect(fin(r)).toBe(e(20_600));
    expect(r.points.flatMap((p) => p.fluxIds)).not.toContain('f2');
  });

  it('t11-6-estimation-et-hypotheses', () => {
    const r = prevoirTresorerie(base);
    expect(r.estimation).toBe(true);
    expect(r.hypotheses).toEqual([
      'elements_dates_seulement',
      'echeance_client_sans_retard',
      'tva_estimee',
    ]);
    const vide = prevoirTresorerie({ ...base, flux: [], soldes: [], scenario: 'prudent' });
    expect(vide.estimation).toBe(true);
    expect(vide.hypotheses).toEqual(['elements_dates_seulement', 'aucun_solde']);
  });

  it('solde-ancien-avertissement', () => {
    const r = prevoirTresorerie({ ...base, ancienneteMaxJours: 0 });
    expect(r.avertissements).toEqual([{ compteId: 'c1', dateSolde: '2026-11-03' }]);
    expect(prevoirTresorerie({ ...base, ancienneteMaxJours: 1 }).avertissements).toEqual([]);
  });

  it('flux-en-retard-au-premier-jour', () => {
    const f = [flux('r1', '2026-10-01', -500, 'facture_fournisseur'), flux('r2', '2026-11-04', -100, 'emprunt')];
    const r = prevoirTresorerie({ ...base, flux: f, horizonJours: 3 });
    expect(r.points[0]).toEqual({ date: '2026-11-04', solde: e(17_800), fluxIds: ['r1', 'r2'] });
    expect(r.points).toHaveLength(2);
    expect(r.points[1]?.date).toBe('2026-11-07');
  });

  it('points-tries-par-date', () => {
    const r = prevoirTresorerie({ ...base, flux: [...fluxT11].reverse() });
    const dates = r.points.map((p) => p.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('cas limites : horizon, hors horizon, même jour, aucun compte', () => {
    const zero = prevoirTresorerie({ ...base, horizonJours: 0, flux: [flux('z', '2026-11-05', -1, 'emprunt')] });
    expect(zero.points).toEqual([{ date: '2026-11-04', solde: e(18_400), fluxIds: [] }]);
    const jour = [flux('b', '2026-11-10', -100, 'emprunt'), flux('a', '2026-11-10', -200, 'emprunt')];
    const m = prevoirTresorerie({ ...base, flux: jour, horizonJours: 6 });
    expect(m.points.map((p) => p.date)).toEqual(['2026-11-04', '2026-11-10']);
    expect(m.points[1]).toEqual({ date: '2026-11-10', solde: e(18_100), fluxIds: ['a', 'b'] });
    const droite = prevoirTresorerie({ ...base, flux: [] });
    expect(droite.points.map((p) => p.solde)).toEqual([e(18_400), e(18_400)]);
    const sans = prevoirTresorerie({ ...base, soldes: [], flux: [] });
    expect(sans.soldeDepart).toBe(0);
    expect(sans.hypotheses).toContain('aucun_solde');
    expect(prevoirTresorerie({ ...base, horizonJours: 61 }).points.at(-1)?.date).toBe('2027-01-04');
  });

  it('refuse les entrées invalides', () => {
    const mauvais = [
      { horizonJours: Number.NaN },
      { horizonJours: -1 },
      { horizonJours: 1.5 },
      { ancienneteMaxJours: Number.NaN },
      { ancienneteMaxJours: -1 },
      { ancienneteMaxJours: 0.5 },
      { seuilBas: Number.NaN as never },
      { seuilBas: 1.5 as never },
      { aujourdhui: '2026-02-30' },
      { scenario: 'autre' as never },
      { flux: [{ ...fluxT11[0]!, montant: Number.NaN as never }] },
      { flux: [{ ...fluxT11[0]!, montant: 1.5 as never }] },
      { flux: [{ ...fluxT11[0]!, date: 'hier' }] },
      { soldes: [{ ...soldes[0]!, solde: Number.NaN as never }] },
      { soldes: [{ ...soldes[0]!, date: 'x' }] },
    ];
    for (const m of mauvais) expect(() => prevoirTresorerie({ ...base, ...m })).toThrow(ErreurPrevision);
  });

  it('n’exporte aucune fonction nommée tresorerie', () => {
    expect(Object.keys(module)).not.toContain('tresorerie');
  });
});
