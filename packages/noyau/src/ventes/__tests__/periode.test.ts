import { describe, expect, it } from 'vitest';
import { periodeDeTva, rangerFacture } from '../periode.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const ex2 = [
  { id: 'e1', debut: '2031-01-01', fin: '2031-12-31' },
  { id: 'e2', debut: '2032-01-01', fin: '2032-12-31' },
];
const mois = (a: number, de: number, a2: number): string[] => {
  const l: string[] = [];
  for (let m = de; m <= a2; m++) l.push(`${a}-${String(m).padStart(2, '0')}`);
  return l;
};
const base = { exercices: ex2, periodesVerrouillees: mois(2031, 1, 12) };

describe('periode ventes', () => {
  it('facture-dans-l-exercice', () => {
    expect(rangerFacture({ ...base, dateFacture: '2032-03-15' })).toEqual({ periode: '2032-03', cartes: [] });
    expect(rangerFacture({ ...base, dateFacture: '2032-12-31' })).toEqual({ periode: '2032-12', cartes: [] });
    expect(rangerFacture({ ...base, dateFacture: '2032-01-01', exercices: [...ex2].reverse() }).periode).toBe('2032-01');
  });

  it('annee-close-periode-ouverte-suivante', () => {
    expect(rangerFacture({ ...base, dateFacture: '2031-06-10' })).toEqual({ periode: '2032-01', cartes: ['annee_close'] });
    const r = rangerFacture({ ...base, periodesVerrouillees: [...base.periodesVerrouillees, '2032-01'], dateFacture: '2031-12-31', exercices: [...ex2].reverse() });
    expect(r).toEqual({ periode: '2032-02', cartes: ['annee_close'] });
    const e3 = [2033, 2032, 2031].map((a) => ({ id: `e${a}`, debut: `${a}-01-01`, fin: `${a}-12-31` }));
    expect(rangerFacture({ exercices: e3, periodesVerrouillees: ['2031-06'], dateFacture: '2031-06-10' })).toEqual({ periode: '2031-07', cartes: ['annee_close'] });
  });

  it('aucune-periode-ouverte-apres', () => {
    const r = rangerFacture({ exercices: [ex2[0] as (typeof ex2)[0]], periodesVerrouillees: mois(2031, 1, 12), dateFacture: '2031-05-05' });
    expect(r).toEqual({ periode: null, cartes: ['annee_close'] });
    expect(rangerFacture({ ...base, dateFacture: '2031-05-05', exercices: [{ id: 'x', debut: '2031-12-31', fin: '2031-01-01' }, ...ex2] }).periode).toBe('2032-01');
  });

  it('hors-exercice-a9', () => {
    expect(rangerFacture({ ...base, dateFacture: '2033-01-01' })).toEqual({ periode: null, cartes: ['A9'] });
    expect(rangerFacture({ ...base, dateFacture: '2030-12-31' })).toEqual({ periode: null, cartes: ['A9'] });
    expect(rangerFacture({ ...base, dateFacture: '2032-02-02', exercices: [] }).cartes).toEqual(['A9']);
  });

  it('avant-immatriculation-a11', () => {
    const r = rangerFacture({ ...base, dateFacture: '2032-02-01', dateImmatriculation: '2032-02-02' });
    expect(r).toEqual({ periode: '2032-02', cartes: ['A11'] });
    expect(rangerFacture({ ...base, dateFacture: '2032-02-02', dateImmatriculation: '2032-02-02' }).cartes).toEqual([]);
    expect(rangerFacture({ ...base, dateFacture: '2030-01-01', dateImmatriculation: '2031-01-01' }).cartes).toEqual(['A9', 'A11']);
    expect(rangerFacture({ ...base, dateFacture: '2031-02-01', dateImmatriculation: '2031-03-01' }).cartes).toEqual(['annee_close', 'A11']);
  });

  it('v28-octobre-ouvert', () => {
    expect(periodeDeTva({ dateExigibilite: '2032-10-31', periodesDeposees: ['2032-09'] })).toEqual({ periode: '2032-10', aDeclarerSurPeriodeOuverte: false });
    expect(periodeDeTva({ dateExigibilite: '2032-10-01', periodesDeposees: [] }).aDeclarerSurPeriodeOuverte).toBe(false);
  });

  it('v28-octobre-depose-carte', () => {
    expect(periodeDeTva({ dateExigibilite: '2032-10-15', periodesDeposees: ['2032-09', '2032-10'] })).toEqual({ periode: '2032-10', aDeclarerSurPeriodeOuverte: true });
    expect(periodeDeTva({ dateExigibilite: '2032-10-15', periodesDeposees: ['2031-10'] }).aDeclarerSurPeriodeOuverte).toBe(false);
  });

  it('entrees-invalides', () => {
    expect(code(() => periodeDeTva({ dateExigibilite: null, periodesDeposees: [] }))).toBe('exigibilite_inconnue');
    for (const d of ['2032-13-01', '2032-02-30', '', 'abc', '32-01-01', '2032-1-1']) {
      expect(code(() => periodeDeTva({ dateExigibilite: d, periodesDeposees: [] }))).toBe('date_invalide');
      expect(code(() => rangerFacture({ ...base, dateFacture: d }))).toBe('date_invalide');
    }
    expect(code(() => rangerFacture({ ...base, dateFacture: '2032-01-01', dateImmatriculation: '2032-00-01' }))).toBe('date_invalide');
    expect(code(() => rangerFacture({ ...base, dateFacture: '2032-01-01', exercices: [{ id: 'x', debut: 'zz', fin: '2032-12-31' }] }))).toBe('date_invalide');
    expect(code(() => rangerFacture({ ...base, dateFacture: '2032-01-01', exercices: [{ id: 'x', debut: '2032-01-01', fin: '2032-13-31' }] }))).toBe('date_invalide');
    expect(code(() => rangerFacture({ ...base, dateFacture: '2032-01-01', exercices: null as never }))).toBe('entree_invalide');
    expect(code(() => rangerFacture({ ...base, dateFacture: '2032-01-01', periodesVerrouillees: [1] as never }))).toBe('entree_invalide');
    expect(code(() => periodeDeTva({ dateExigibilite: '2032-01-01', periodesDeposees: null as never }))).toBe('entree_invalide');
    expect(code(() => rangerFacture({ ...base, dateFacture: Number.NaN as never }))).toBe('date_invalide');
  });
});
