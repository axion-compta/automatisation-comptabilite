import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { reconnaitreEcheance, ErreurEmprunt, type Echeance } from '../echeance.js';

const c = centimes;
const tableau: readonly Echeance[] = [
  { date: '2027-01-05', capital: c(80000), interets: c(15000), assurance: c(5000) },
  { date: '2027-02-05', capital: c(80500), interets: c(14000), assurance: c(5000) },
];
const ligne = (montant: number, dateOperation: string) => ({ dateOperation, montant: c(montant) });
const code = (fn: () => unknown): string => {
  try { fn(); } catch (e) { if (e instanceof ErreurEmprunt) return e.code; throw e; }
  return 'aucune';
};

describe('échéance d\'emprunt repérée sur le relevé', () => {
  it('echeance-reconnue-montant-et-date', () => {
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-05'), tableau)).toBe(tableau[0]);
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-08'), tableau)).toBe(tableau[0]); // frontière : 3 jours
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-02'), tableau)).toBe(tableau[0]); // frontière avant
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-09'), tableau)).toBeUndefined(); // 4 jours
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-01'), tableau)).toBeUndefined();
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-09'), tableau, 4)).toBe(tableau[0]); // fenêtre paramétrable
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-06'), tableau, 0)).toBeUndefined();
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-05'), tableau, 0)).toBe(tableau[0]);
    expect(reconnaitreEcheance(ligne(-100000, '2027-02-04'), tableau)).toBeUndefined(); // bon jour, mauvais montant
    expect(reconnaitreEcheance(ligne(-99500, '2027-02-04'), tableau)).toBe(tableau[1]);
  });

  it('montant-different-non-reconnu', () => {
    expect(reconnaitreEcheance(ligne(-100001, '2027-01-05'), tableau)).toBeUndefined();
    expect(reconnaitreEcheance(ligne(-99999, '2027-01-05'), tableau)).toBeUndefined();
    expect(reconnaitreEcheance(ligne(100000, '2027-01-05'), tableau)).toBeUndefined(); // un crédit n'est pas une échéance
    expect(reconnaitreEcheance(ligne(0, '2027-01-05'), tableau)).toBeUndefined();
    expect(reconnaitreEcheance(ligne(-100000, '2027-01-05'), [])).toBeUndefined();
  });

  it('refuse une fenêtre ou une date invalide', () => {
    for (const f of [-1, 1.5, Number.NaN, Infinity]) expect(code(() => reconnaitreEcheance(ligne(-100000, '2027-01-05'), tableau, f))).toBe('fenetre_invalide');
    expect(code(() => reconnaitreEcheance(ligne(-100000, '2027-13-45'), tableau))).toBe('date_invalide');
  });
});
