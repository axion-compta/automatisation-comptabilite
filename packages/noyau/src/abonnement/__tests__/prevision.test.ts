import { describe, expect, it } from 'vitest';
import { joursRestantsDuMois, prevoirFinDeMois } from '../prevision.js';
import { ErreurAbonnement } from '../types.js';

const FENETRE = 7;
const jours = (...e: [string, number][]): Map<string, number> => new Map(e);
const serie = (debut: number, fin: number, mois: string, n: number): [string, number][] => {
  const r: [string, number][] = [];
  for (let j = debut; j <= fin; j += 1) r.push([mois + '-' + String(j).padStart(2, '0'), n]);
  return r;
};
const refus = (f: () => unknown): boolean => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement;
  }
  return false;
};

describe('prévision de fin de mois (estimation)', () => {
  it('rythme-constant', () => {
    const m = jours(...serie(19, 25, '2030-03', 10));
    expect(joursRestantsDuMois('2030-03-26')).toBe(5);
    expect(prevoirFinDeMois({ utilise: 40, piecesParJour: m, aujourdhui: '2030-03-25', fenetreJours: FENETRE })).toBe(40 + 10 * 6);
    expect(prevoirFinDeMois({ utilise: 0, piecesParJour: jours(...serie(20, 26, '2030-03', 10)), aujourdhui: '2030-03-26', fenetreJours: FENETRE })).toBe(50);
  });

  it('dernier-jour-du-mois-sans-ajout', () => {
    expect(joursRestantsDuMois('2030-03-31')).toBe(0);
    const m = jours(...serie(25, 31, '2030-03', 10));
    expect(prevoirFinDeMois({ utilise: 77, piecesParJour: m, aujourdhui: '2030-03-31', fenetreJours: FENETRE })).toBe(77);
  });

  it('fevrier-bissextile', () => {
    expect(joursRestantsDuMois('2032-02-01')).toBe(28);
    expect(joursRestantsDuMois('2032-02-29')).toBe(0);
    expect(joursRestantsDuMois('2031-02-01')).toBe(27);
    expect(joursRestantsDuMois('2030-12-30')).toBe(1);
    const m = jours(['2032-02-01', 7]);
    expect(prevoirFinDeMois({ utilise: 0, piecesParJour: m, aujourdhui: '2032-02-01', fenetreJours: FENETRE })).toBe(28);
  });

  it('jours-absents-comptent-zero', () => {
    const m = jours(['2030-03-24', 14]);
    expect(prevoirFinDeMois({ utilise: 5, piecesParJour: m, aujourdhui: '2030-03-25', fenetreJours: FENETRE })).toBe(5 + 2 * 6);
    expect(prevoirFinDeMois({ utilise: 5, piecesParJour: jours(), aujourdhui: '2030-03-25', fenetreJours: FENETRE })).toBe(5);
  });

  it('fenetre-a-cheval-sur-deux-mois', () => {
    const m = jours(['2030-02-27', 7], ['2030-02-28', 7], ['2030-03-01', 7], ['2030-03-02', 7]);
    expect(prevoirFinDeMois({ utilise: 10, piecesParJour: m, aujourdhui: '2030-03-02', fenetreJours: FENETRE })).toBe(10 + 4 * 29);
    const hors = jours(['2030-02-22', 700], ['2030-02-23', 700]);
    expect(prevoirFinDeMois({ utilise: 10, piecesParJour: hors, aujourdhui: '2030-03-02', fenetreJours: FENETRE })).toBe(10);
  });

  it('arrondi-inferieur', () => {
    const m = jours(['2030-03-28', 10]);
    expect(joursRestantsDuMois('2030-03-28')).toBe(3);
    expect(prevoirFinDeMois({ utilise: 0, piecesParJour: m, aujourdhui: '2030-03-28', fenetreJours: FENETRE })).toBe(4);
  });

  it('jour-futur-ignore', () => {
    const m = jours(['2030-03-10', 7], ['2030-03-11', 1000]);
    expect(prevoirFinDeMois({ utilise: 0, piecesParJour: m, aujourdhui: '2030-03-10', fenetreJours: FENETRE })).toBe(21);
  });

  it('entrees-invalides-refusees', () => {
    const base = { utilise: 1, piecesParJour: jours(['2030-03-10', 1]), aujourdhui: '2030-03-10', fenetreJours: FENETRE };
    for (const fenetreJours of [0, Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(refus(() => prevoirFinDeMois({ ...base, fenetreJours }))).toBe(true);
    }
    for (const utilise of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(refus(() => prevoirFinDeMois({ ...base, utilise }))).toBe(true);
    }
    for (const v of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(refus(() => prevoirFinDeMois({ ...base, piecesParJour: jours(['2030-03-10', v]) }))).toBe(true);
    }
    expect(refus(() => prevoirFinDeMois({ ...base, piecesParJour: jours(['2030-02-30', 1]) }))).toBe(true);
    expect(refus(() => prevoirFinDeMois({ ...base, aujourdhui: '2030-13-01' }))).toBe(true);
    expect(refus(() => joursRestantsDuMois('pas-une-date'))).toBe(true);
  });
});
