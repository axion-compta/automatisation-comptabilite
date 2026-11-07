import { describe, expect, it } from 'vitest';
import { ErreurDate, choisirFormat, lireDate, type FormatDate } from '../dates.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurDate ? e.code : 'autre';
  }
  return undefined;
}

const JM: FormatDate[] = ['JJ/MM/AAAA', 'MM/JJ/AAAA'];

describe('dates des relevés', () => {
  it('jour-en-premier-deduit', () => {
    const textes = ['03/04/2026', '25/02/2026'];
    expect(choisirFormat(textes, JM)).toEqual({ type: 'unique', format: 'JJ/MM/AAAA' });
    expect(choisirFormat([...textes].reverse(), JM)).toEqual({ type: 'unique', format: 'JJ/MM/AAAA' });
    expect(choisirFormat(['02/25/2026', '03/04/2026'], JM)).toEqual({ type: 'unique', format: 'MM/JJ/AAAA' });
    expect(lireDate('03/04/2026', 'MM/JJ/AAAA')).toBe('2026-03-04');
    expect(lireDate(' 3/4/2026 ', 'JJ/MM/AAAA')).toBe('2026-04-03');
  });

  it('question-si-tout-ambigu', () => {
    const textes = ['01/02/2026', '05/02/2026', '12/02/2026', '', '  '];
    expect(choisirFormat(textes, JM)).toEqual({ type: 'question', formats: ['JJ/MM/AAAA', 'MM/JJ/AAAA'] });
    expect(choisirFormat([...textes].reverse(), ['MM/JJ/AAAA', 'JJ/MM/AAAA'])).toEqual({
      type: 'question',
      formats: ['MM/JJ/AAAA', 'JJ/MM/AAAA'],
    });
    expect(choisirFormat(textes, ['JJ/MM/AAAA', 'MM/JJ/AAAA', 'JJ/MM/AAAA'])).toEqual({
      type: 'question',
      formats: ['JJ/MM/AAAA', 'MM/JJ/AAAA'],
    });
  });

  it('aucun-format', () => {
    const aucun = { type: 'aucun' };
    expect(choisirFormat([], JM)).toEqual(aucun);
    expect(choisirFormat(['', '   '], JM)).toEqual(aucun);
    expect(choisirFormat(['01/02/2026'], [])).toEqual(aucun);
    expect(choisirFormat(['NaN'], JM)).toEqual(aucun);
    expect(choisirFormat(['01/02/2026', 'Infinity'], JM)).toEqual(aucun);
    expect(choisirFormat(['13/13/2026'], JM)).toEqual(aucun);
    expect(choisirFormat(['01/02/26'], JM)).toEqual(aucun);
    expect(choisirFormat(['01/02/26'], ['JJ/MM/AA'])).toEqual(aucun);
    expect(choisirFormat(['20261005'], ['AAAAMMJJ', 'serie'])).toEqual({ type: 'unique', format: 'AAAAMMJJ' });
    expect(choisirFormat(['20261005'], ['AAAAMMJJ', 'serie'], { origineSerie: '1899-12-30' })).toEqual({
      type: 'unique',
      format: 'AAAAMMJJ',
    });
    expect(choisirFormat(['01/02/2026', '2026-02-01'], [...JM, 'AAAA-MM-JJ'])).toEqual(aucun);
    const trois: FormatDate[] = ['JJ/MM/AAAA', 'MM/JJ/AAAA', 'AAAA-MM-JJ'];
    expect(choisirFormat(['2026-02-01'], trois)).toEqual({ type: 'unique', format: 'AAAA-MM-JJ' });
  });

  it('ofx-avec-heure', () => {
    expect(lireDate('20261005120000[+1:CET]', 'AAAAMMJJHHMMSS')).toBe('2026-10-05');
    expect(lireDate('20261005235959', 'AAAAMMJJHHMMSS')).toBe('2026-10-05');
    expect(lireDate('20261005000000.000[-5:EST]', 'AAAAMMJJHHMMSS')).toBe('2026-10-05');
    expect(lireDate('20261005', 'AAAAMMJJ')).toBe('2026-10-05');
    expect(code(() => lireDate('2026100512', 'AAAAMMJJHHMMSS'))).toBe('date_invalide');
    expect(code(() => lireDate('20261005120000[', 'AAAAMMJJHHMMSS'))).toBe('date_invalide');
    expect(code(() => lireDate('20261005120000', 'AAAAMMJJ'))).toBe('date_invalide');
    expect(code(() => lireDate('20261305120000', 'AAAAMMJJHHMMSS'))).toBe('date_invalide');
  });

  it('bissextile', () => {
    expect(lireDate('29/02/2028', 'JJ/MM/AAAA')).toBe('2028-02-29');
    expect(code(() => lireDate('29/02/2026', 'JJ/MM/AAAA'))).toBe('date_invalide');
    expect(code(() => lireDate('29/02/2100', 'JJ/MM/AAAA'))).toBe('date_invalide');
    expect(lireDate('29/02/2000', 'JJ/MM/AAAA')).toBe('2000-02-29');
    for (const t of ['00/05/2026', '32/05/2026', '15/13/2026', '15/00/2026', '31/04/2026', '', 'NaN', '1/1/999'])
      expect(code(() => lireDate(t, 'JJ/MM/AAAA'))).toBe('date_invalide');
  });

  it('annee-deux-chiffres-siecle-en-argument', () => {
    expect(lireDate('05/03/26', 'JJ/MM/AA', { siecle: 2000 })).toBe('2026-03-05');
    expect(lireDate('05/03/26', 'JJ/MM/AA', { siecle: 1900 })).toBe('1926-03-05');
    expect(lireDate('29/02/28', 'JJ/MM/AA', { siecle: 2000 })).toBe('2028-02-29');
    expect(code(() => lireDate('05/03/26', 'JJ/MM/AA'))).toBe('siecle_absent');
    for (const siecle of [Number.NaN, Infinity, 2050, 20.5, -2000, 0])
      expect(code(() => lireDate('05/03/26', 'JJ/MM/AA', { siecle }))).toBe('siecle_absent');
    expect(code(() => lireDate('05/03/2026', 'JJ/MM/AA', { siecle: 2000 }))).toBe('date_invalide');
    expect(code(() => lireDate('05/03/2026', 'JJ/MM/XX' as FormatDate))).toBe('format_inconnu');
  });

  it('numero-de-serie', () => {
    const o = { origineSerie: '1899-12-30' };
    expect(lireDate('46000', 'serie', o)).toBe('2025-12-09');
    expect(lireDate('0', 'serie', o)).toBe('1899-12-30');
    expect(lireDate('1', 'serie', { origineSerie: '1904-01-01' })).toBe('1904-01-02');
    expect(code(() => lireDate('46000', 'serie'))).toBe('format_inconnu');
    expect(code(() => lireDate('46000', 'serie', { origineSerie: 'abc' }))).toBe('date_invalide');
    for (const t of ['46000.5', '-1', 'NaN', 'Infinity', '', '1e3', '99999999999999999999'])
      expect(code(() => lireDate(t, 'serie', o))).toBe('date_invalide');
    expect(choisirFormat(['46000', '46001'], ['serie'], o)).toEqual({ type: 'unique', format: 'serie' });
    expect(choisirFormat(['46000'], ['serie'])).toEqual({ type: 'aucun' });
  });

  it('iso-garde', () => {
    expect(lireDate('2026-10-05', 'AAAA-MM-JJ')).toBe('2026-10-05');
    expect(lireDate('2026-10-05T23:30:00Z', 'AAAA-MM-JJ')).toBe('2026-10-05');
    expect(lireDate('05.10.2026', 'JJ.MM.AAAA')).toBe('2026-10-05');
    expect(lireDate('05-10-2026', 'JJ-MM-AAAA')).toBe('2026-10-05');
    expect(code(() => lireDate('2026-02-30', 'AAAA-MM-JJ'))).toBe('date_invalide');
    expect(code(() => lireDate('2026-10-05X', 'AAAA-MM-JJ'))).toBe('date_invalide');
    expect(code(() => lireDate('05/10/2026', 'JJ.MM.AAAA'))).toBe('date_invalide');
    expect(code(() => lireDate('05.10.2026', 'JJ-MM-AAAA'))).toBe('date_invalide');
    expect(code(() => lireDate('05-10-2026', 'AAAA-MM-JJ'))).toBe('date_invalide');
  });
});
