import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../noyau/src/argent/index.js';
import { formaterDateAffiche, formaterMontantAffiche } from '../affichage.js';

const F = ' ';
const N = ' ';

describe('affichage', () => {
  it('montant-milliers-espace-fine', () => {
    expect(formaterMontantAffiche(centimes(123456))).toBe('1' + F + '234,56' + N + '€');
    expect(formaterMontantAffiche(centimes(99999))).toBe('999,99' + N + '€');
    expect(formaterMontantAffiche(centimes(100000))).toBe('1' + F + '000,00' + N + '€');
    expect(formaterMontantAffiche(centimes(12345600))).toBe('123' + F + '456,00' + N + '€');
  });

  it('montant-zero', () => {
    expect(formaterMontantAffiche(centimes(0))).toBe('0,00' + N + '€');
    expect(formaterMontantAffiche(centimes(5))).toBe('0,05' + N + '€');
  });

  it('montant-negatif-signe-moins', () => {
    const t = formaterMontantAffiche(centimes(-123456));
    expect(t).toBe('−' + '1' + F + '234,56' + N + '€');
    expect(t.includes('-')).toBe(false);
  });

  it('montant-grand', () => {
    expect(formaterMontantAffiche(centimes(123456789012))).toBe(
      '1' + F + '234' + F + '567' + F + '890,12' + N + '€',
    );
    expect(formaterMontantAffiche(centimes(-100000000000))).toBe(
      '−' + '1' + F + '000' + F + '000' + F + '000,00' + N + '€',
    );
  });

  it('date-francaise', () => {
    expect(formaterDateAffiche('2026-03-31')).toBe('31/03/2026');
    expect(formaterDateAffiche('2024-02-29')).toBe('29/02/2024');
    expect(formaterDateAffiche('2026-01-01')).toBe('01/01/2026');
  });

  it('date-invalide-refusee', () => {
    for (const d of ['', '2026-3-31', '31/03/2026', '2026-13-01', '2026-00-10', '2026-04-31', '2026-02-29', '1900-02-29', '2026-01-00', '2026-03-31x', ' 2026-03-31']) {
      expect(() => formaterDateAffiche(d), d).toThrow();
    }
    expect(formaterDateAffiche('2000-02-29')).toBe('29/02/2000');
  });
});
