import { describe, expect, it } from 'vitest';
import { ErreurMontant, lireMontant, montantSigne } from '../montants.js';
import type { CodeMontant, FormatMontant, ModeSigne } from '../montants.js';

const FR: FormatMontant = { decimal: ',', milliers: '.' };
const US: FormatMontant = { decimal: '.', milliers: ',' };
const SANS: FormatMontant = { decimal: ',', milliers: '' };
const ESP: FormatMontant = { decimal: ',', milliers: ' ' };

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurMontant ? e.code : 'autre';
  }
  return undefined;
};
const lire = (t: string, f: FormatMontant = FR): CodeMontant | number => code(() => lireMontant(t, f)) as CodeMontant | undefined ?? lireMontant(t, f);

describe('montants des relevés en centimes', () => {
  it.each<[string, FormatMontant, number]>([
    ['1.234,56', FR, 123456], ['12,5', FR, 1250], ['12', FR, 1200], ['0,05', FR, 5], ['+7,00', FR, 700], ['1.234.567,89', FR, 123456789],
    [' 12,00 ', FR, 1200], ['1 234,56', ESP, 123456], ['1 234,56', ESP, 123456], ['1 234,56', ESP, 123456], ["1'234,56", { decimal: ',', milliers: "'" }, 123456],
  ])('virgule-et-point-milliers %j', (t, f, n) => {
    expect(lire(t, f)).toBe(n);
  });

  it('point-decimal-et-virgule-milliers', () => {
    expect(lire('1,234.56', US)).toBe(123456);
    expect(lire('1234.5', US)).toBe(123450);
    expect(lire('-1,234.56', US)).toBe(-123456);
  });

  it('suffixe-moins', () => {
    expect(lire('1.234,56-')).toBe(-123456);
    expect(lire('0,01-')).toBe(-1);
    expect(montantSigne({ m: '1.234,56-' }, { type: 'suffixe_moins', colonne: 'm' }, FR)).toBe(-123456);
  });

  it('parentheses-negatif', () => {
    expect(lire('(12,00)')).toBe(-1200);
    expect(lire('-12,00')).toBe(-1200);
    expect(lire('(-12,00)')).toBe('non_numerique');
  });

  it('debit-credit', () => {
    const m: ModeSigne = { type: 'debit_credit', debit: 'D', credit: 'C' };
    expect(montantSigne({ D: '12,50', C: '' }, m, FR)).toBe(-1250);
    expect(montantSigne({ D: '', C: '12,50' }, m, FR)).toBe(1250);
    expect(montantSigne({ D: '-12,50' }, m, FR)).toBe(-1250);
    expect(Object.is(montantSigne({ D: '0,00' }, m, FR), 0)).toBe(true);
    expect(code(() => montantSigne({ D: '1', C: '2' }, m, FR))).toBe('deux_sens');
    expect(code(() => montantSigne({ D: ' ', C: '' }, m, FR))).toBe('aucun_montant');
    expect(code(() => montantSigne({}, m, FR))).toBe('aucun_montant');
  });

  it('sens-d-c', () => {
    const m: ModeSigne = { type: 'sens_dc', montant: 'M', sens: 'S', debit: 'D', credit: 'C' };
    expect(montantSigne({ M: '5,00', S: 'D' }, m, FR)).toBe(-500);
    expect(montantSigne({ M: '5,00', S: ' c ' }, m, FR)).toBe(500);
    expect(montantSigne({ M: '5,00-', S: 'C' }, m, FR)).toBe(500);
    expect(code(() => montantSigne({ M: '5,00', S: 'X' }, m, FR))).toBe('non_numerique');
    expect(code(() => montantSigne({ M: '5,00', S: '' }, { ...m, debit: '', credit: '' }, FR))).toBe('non_numerique');
    expect(code(() => montantSigne({ M: '', S: 'D' }, m, FR))).toBe('vide');
  });

  it.each<[string, string]>([['', 'vide'], ['   ', 'vide'], ['N/A', 'non_numerique'], ['-', 'non_numerique'], [',', 'non_numerique'], ['+', 'non_numerique'], ['()', 'non_numerique']])(
    'vide-et-na-refuses %j',
    (t, c) => expect(lire(t)).toBe(c),
  );

  it.each(['1e5', 'Infinity', 'NaN', '--1', '-1-', '+-1', '1 2', '1..2', '1,2,3', '.5.', '1.,2', '12a', '1.2.3,4.'])('non-numerique %j', (t) => {
    expect(lire(t)).toBe('non_numerique');
  });

  it('zero-jamais-moins-zero', () => {
    for (const t of ['0,00', '-0,00', '0,00-', '(0,00)', '-0']) expect(Object.is(lire(t), 0)).toBe(true);
  });

  it('trop-de-decimales-refuse', () => {
    expect(lire('1,234', SANS)).toBe('trop_de_decimales');
    expect(lire('1,230', SANS)).toBe('trop_de_decimales');
    expect(lire('1,23', SANS)).toBe(123);
    expect(lire('1.234,5678')).toBe('trop_de_decimales');
  });

  it('hors-limites-refuse', () => {
    expect(lire('99999999999999999,99')).toBe('hors_limites');
    expect(lire('90071992547409,91')).toBe(Number.MAX_SAFE_INTEGER);
    expect(lire('90071992547409,92')).toBe('hors_limites');
    expect(lire('-90071992547409,92')).toBe('hors_limites');
  });

  it('format-ambigu', () => {
    expect(lire('1,00', { decimal: ',', milliers: ',' })).toBe('format_ambigu');
    expect(lire('', { decimal: '.', milliers: '.' })).toBe('format_ambigu');
  });
});
