import { describe, expect, it } from 'vitest';
import { conventionDuPays, type ConventionPays } from '../conventions.js';
import { lireDate, lireMontant, resoudreConvention } from '../formats.js';

const FR: ConventionPays = { decimal: ',', ordreDate: 'JMA' };
const EN: ConventionPays = { decimal: '.', ordreDate: 'JMA' };
const US: ConventionPays = { decimal: '.', ordreDate: 'MJA' };
const montants = (conv: ConventionPays, cas: [string, number | string][]): unknown[] =>
  cas.map(([t]) => lireMontant(t, conv));
const attendu = (cas: [string, number | string][]): unknown[] =>
  cas.map(([, v]) => (typeof v === 'number' ? { centimes: v } : { erreur: v }));
const dates = (conv: ConventionPays, cas: [string, string][]): unknown[] => cas.map(([t]) => lireDate(t, conv));
const datesAttendues = (cas: [string, string][]): unknown[] =>
  cas.map(([, v]) => (/^[a-z_]+$/.test(v) ? { erreur: v } : { date: v }));

describe('lecture des formats', () => {
  it('montant-fr', () => {
    const cas: [string, number][] = [['1 234,56', 123456], ['1.234,56 €', 123456], ['1 234,5', 123450], ['12', 1200], ['12,', 1200], [',50', 50], ['EUR 0,05', 5], ['007,10', 710], ['0', 0], ['-0,00', 0], ['999.999.999,99', 99999999999]];
    expect(montants(FR, cas)).toEqual(attendu(cas));
    expect(lireMontant('12 345,67 eur', FR)).toEqual({ centimes: 1234567 });
  });
  it('montant-en', () => {
    const cas: [string, number][] = [['1,234.56', 123456], ['$1,234,567.8', 123456780], ['£ 12.00', 1200], ['12', 1200], ['0.05', 5], ['USD 5', 500], ['12.', 1200]];
    expect(montants(EN, cas)).toEqual(attendu(cas));
  });
  it('montant-negatif-et-parentheses-refusees', () => {
    expect(lireMontant('-120,00', FR)).toEqual({ centimes: -12000 });
    expect(lireMontant('120,00-', FR)).toEqual({ centimes: -12000 });
    expect(lireMontant('-120,00 €', FR)).toEqual({ centimes: -12000 });
    const cas: [string, string][] = [['(120.00)', 'illisible'], ['--5', 'illisible'], ['-5-', 'illisible'], ['+5', 'illisible']];
    expect(montants(EN, cas)).toEqual(attendu(cas));
  });
  it('milliers-ambigus', () => {
    expect(lireMontant('1.234', FR)).toEqual({ centimes: 123400 });
    expect(lireMontant('1.234', EN)).toEqual({ erreur: 'decimales_en_trop' });
    expect(lireMontant('1,234', EN)).toEqual({ centimes: 123400 });
    expect(lireMontant('1,234', FR)).toEqual({ erreur: 'decimales_en_trop' });
    const cas: [string, string][] = [['1.23', 'illisible'], ['1234.567', 'illisible'], ['.234', 'illisible']];
    expect(montants(FR, cas)).toEqual(attendu(cas));
    expect(lireMontant('12.345', FR)).toEqual({ centimes: 1234500 });
  });
  it('montant-illisible', () => {
    const cas: [string, string][] = [['', 'illisible'], ['  ', 'illisible'], ['abc', 'illisible'], ['1,2,3,4', 'illisible'], ['NaN', 'illisible'], ['Infinity', 'illisible'], ['€', 'illisible'], ['-', 'illisible'], ['.', 'illisible'], ['12a', 'illisible'], ['1,23,4', 'illisible']];
    expect(montants(FR, cas)).toEqual(attendu(cas));
    expect(montants(EN, cas)).toEqual(attendu(cas));
    expect(lireMontant('12,345,67', EN)).toEqual({ erreur: 'illisible' });
    expect(lireMontant('1.234,567', FR)).toEqual({ erreur: 'decimales_en_trop' });
  });
  it('montant-trop-grand', () => {
    expect(lireMontant('90.071.992.547.409,91', FR)).toEqual({ centimes: 9007199254740991 });
    expect(lireMontant('90.071.992.547.409,92', FR)).toEqual({ erreur: 'trop_grand' });
    expect(lireMontant('-90,071,992,547,409.92', EN)).toEqual({ erreur: 'trop_grand' });
    expect(lireMontant('-90,071,992,547,409.91', EN)).toEqual({ centimes: -9007199254740991 });
  });
  it('date-jma-et-mja', () => {
    expect(lireDate('03/04/2026', EN)).toEqual({ date: '2026-04-03' });
    expect(lireDate('03/04/2026', US)).toEqual({ date: '2026-03-04' });
    const cas: [string, string][] = [['3-4-2026', '2026-04-03'], ['03.04.2026', '2026-04-03'], ['2026-04-03', '2026-04-03'], [' 31/12/2026 ', '2026-12-31'], ['03/04/26', 'annee_sur_deux_chiffres'], ['03/04/202', 'illisible'], ['03/04/20260', 'illisible'], ['3/4', 'illisible'], ['', 'illisible'], ['x', 'illisible']];
    expect(dates(FR, cas)).toEqual(datesAttendues(cas));
    expect(lireDate('2026-04-03', US)).toEqual({ date: '2026-04-03' });
    expect(lireDate('13/01/2026', US)).toEqual({ erreur: 'date_impossible' });
  });
  it('date-en-lettres-fr-en', () => {
    const cas: [string, string][] = [['3 avril 2026', '2026-04-03'], ['3 April 2026', '2026-04-03'], ['April 3, 2026', '2026-04-03'], ['april 3 2026', '2026-04-03'], ['1 février 2026', '2026-02-01'], ['15 AOÛT 2026', '2026-08-15'], ['25 décembre 2026', '2026-12-25'], ['3 mars 2026', '2026-03-03'], ['12 January 2026', '2026-01-12'], ['1 mai 2026', '2026-05-01'], ['3 foo 2026', 'illisible'], ['constructor 3 2026', 'illisible'], ['3 avril', 'illisible']];
    expect(dates(FR, cas)).toEqual(datesAttendues(cas));
    const mois = 'janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre'.split(' ');
    expect(mois.map((m) => lireDate('1 ' + m + ' 2026', FR))).toEqual(mois.map((_, i) => ({ date: '2026-' + String(i + 1).padStart(2, '0') + '-01' })));
    const en = 'January February March April May June July August September October November December'.split(' ');
    expect(en.map((m) => lireDate(m + ' 1, 2026', EN))).toEqual(mois.map((_, i) => ({ date: '2026-' + String(i + 1).padStart(2, '0') + '-01' })));
  });
  it('date-impossible-et-bissextile', () => {
    const cas: [string, string][] = [['31/02/2026', 'date_impossible'], ['29/02/2026', 'date_impossible'], ['29/02/2028', '2028-02-29'], ['29/02/1900', 'date_impossible'], ['29/02/2000', '2000-02-29'], ['30/02/2028', 'date_impossible'], ['31/04/2026', 'date_impossible'], ['30/04/2026', '2026-04-30'], ['31/06/2026', 'date_impossible'], ['31/09/2026', 'date_impossible'], ['31/11/2026', 'date_impossible'], ['31/01/2026', '2026-01-31'], ['32/01/2026', 'date_impossible'], ['00/01/2026', 'date_impossible'], ['01/00/2026', 'date_impossible'], ['01/13/2026', 'date_impossible'], ['01/12/2026', '2026-12-01'], ['01/01/0000', 'date_impossible'], ['01/01/0001', '0001-01-01'], ['2026-02-30', 'date_impossible'], ['31 février 2026', 'date_impossible']];
    expect(dates(FR, cas)).toEqual(datesAttendues(cas));
  });
  it('pays-inconnu-null', () => {
    for (const code of ['FR', 'BE', 'LU', 'DE', 'AT', 'ES', 'IT', 'PT', 'NL', 'PL']) expect(conventionDuPays(code)).toEqual(FR);
    expect(conventionDuPays('GB')).toEqual(EN);
    expect(conventionDuPays('IE')).toEqual(EN);
    expect(conventionDuPays('US')).toEqual(US);
    for (const code of ['', 'XX', 'fr', 'toString', '__proto__', 'constructor']) expect(conventionDuPays(code)).toBeNull();
    expect(resoudreConvention('US', 'fr')).toEqual(US);
    expect(resoudreConvention('XX', 'fr')).toEqual(FR);
    expect(resoudreConvention('', 'fr')).toEqual(FR);
    expect(resoudreConvention('XX', 'en')).toBeNull();
    expect(resoudreConvention('', '')).toBeNull();
    const a = conventionDuPays('FR');
    if (a) a.decimal = '.';
    expect(conventionDuPays('FR')).toEqual(FR);
  });
});
