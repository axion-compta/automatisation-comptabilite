import { describe, expect, it } from 'vitest';
import { nouvellesAlertes, seuilAtteint, type EntreeAlertes } from '../seuils.js';
import { ErreurAbonnement } from '../types.js';

const SEUILS = [7000, 10000];
const H = '2026-03-10T08:00:00Z';
const base: EntreeAlertes = {
  utilise: 0, compris: 100, seuilsBps: SEUILS, mois: '2026-03', dejaEmises: new Set(), horodatage: H, objet: 'volume',
};
const run = (o: Partial<EntreeAlertes>) => nouvellesAlertes({ ...base, ...o });
function code(f: () => unknown): string | undefined {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
}

describe('seuils', () => {
  it('soixante-neuf-zero-alerte', () => {
    expect(seuilAtteint(69, 100, 7000)).toBe(false);
    expect(run({ utilise: 69 }).alertes).toEqual([]);
  });
  it('soixante-dix-une-alerte', () => {
    expect(seuilAtteint(70, 100, 7000)).toBe(true);
    const r = run({ utilise: 70 });
    expect(r.alertes).toEqual([{ seuilBps: 7000, mois: '2026-03' }]);
    expect(r.evenements).toEqual([
      { type: 'abonnement.seuil_atteint', horodatage: H, donnees: { objet: 'volume', mois: '2026-03', seuilBps: 7000 } },
    ]);
  });
  it('soixante-et-onze-pas-de-seconde', () => {
    const dejaEmises: ReadonlySet<string> = new Set();
    const a = run({ utilise: 70, dejaEmises });
    expect(dejaEmises.size).toBe(0);
    const b = run({ utilise: 71, dejaEmises: a.dejaEmises });
    expect(b.alertes).toEqual([]);
    expect(b.evenements).toEqual([]);
  });
  it('deux-seuils-franchis-d-un-coup', () => {
    const r = run({ utilise: 120, seuilsBps: [10000, 7000] });
    expect(r.alertes.map((x) => x.seuilBps)).toEqual([7000, 10000]);
    expect(r.evenements).toHaveLength(2);
  });
  it('nouveau-mois-nouvelle-alerte', () => {
    const a = run({ utilise: 70 });
    expect(run({ utilise: 70, mois: '2026-04', dejaEmises: a.dejaEmises }).alertes).toHaveLength(1);
  });
  it('volume-et-budget-separes', () => {
    const a = run({ utilise: 70 });
    expect(run({ utilise: 70, objet: 'budget_ia', dejaEmises: a.dejaEmises }).alertes).toHaveLength(1);
    expect(a.dejaEmises.has('volume:2026-03:7000')).toBe(true);
  });
  it('seuils-desordre-et-doublons', () => {
    const r = run({ utilise: 100, seuilsBps: [10000, 7000, 10000, 7000] });
    expect(r.alertes.map((x) => x.seuilBps)).toEqual([7000, 10000]);
    expect(run({ utilise: 100, seuilsBps: [] }).alertes).toEqual([]);
  });
  it('entrees-invalides-refusees', () => {
    for (const c of [0, Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(code(() => seuilAtteint(1, c, 7000))).toBe('palier_invalide');
    }
    for (const s of [0, Number.NaN, 1.5, -1, Number.POSITIVE_INFINITY]) {
      expect(code(() => seuilAtteint(1, 100, s))).toBe('entier_invalide');
    }
    for (const u of [-1, Number.NaN, 0.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => seuilAtteint(u, 100, 7000))).toBe('entier_invalide');
    }
    expect(code(() => seuilAtteint(Number.MAX_SAFE_INTEGER, 100, 7000))).toBe('depassement_entier');
    expect(code(() => seuilAtteint(1, Number.MAX_SAFE_INTEGER, 7000))).toBe('depassement_entier');
    expect(code(() => run({ utilise: 70, seuilsBps: [0] }))).toBe('entier_invalide');
    expect(code(() => run({ horodatage: 'x' }))).toBe('horodatage_invalide');
  });
});
