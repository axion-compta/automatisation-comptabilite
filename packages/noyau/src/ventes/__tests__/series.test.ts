import { describe, expect, it } from 'vitest';
import { analyserSeries, decouperNumero } from '../series.js';
import type { PieceSerie } from '../series.js';
import type { Centimes } from '../../argent/index.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const MAX = 10;
const p = (id: string, numero: string, dateFacture = '2026-01-10', ttc = 1200): PieceSerie => ({ id, numero, dateFacture, ttc: ttc as Centimes });
const an = (pieces: PieceSerie[], maxTrous = MAX): ReturnType<typeof analyserSeries> => analyserSeries(pieces, { maxTrous });
const premiere = (pieces: PieceSerie[], maxTrous = MAX): NonNullable<ReturnType<typeof analyserSeries>[number]> => an(pieces, maxTrous)[0] as never;

describe('series', () => {
  it('v18-trou-0042', () => {
    const r = premiere([p('a', 'F-2026-0041'), p('c', 'F-2026-0043')]);
    expect(r).toEqual({ serie: 'F-2026-', dernierOrdreVu: 43, trous: [42], tropDeTrous: false, doublons: [], datesQuiReculent: [], illisibles: [] });
  });

  it('v18-trou-comble-apres-depot', () => {
    const r = premiere([p('a', 'F-2026-0041'), p('c', 'F-2026-0043'), p('b', 'F-2026-0042')]);
    expect(r.trous).toEqual([]);
    expect(r.dernierOrdreVu).toBe(43);
  });

  it('v19-meme-numero-montants-differents', () => {
    const r = premiere([p('b', 'F-0005', '2026-01-10', 2400), p('a', 'F-0005', '2026-01-10', 1200), p('c', 'F-0006')]);
    expect(r.doublons).toEqual([{ ordre: 5, ids: ['a', 'b'] }]);
    expect(r.trous).toEqual([]);
  });

  it('meme-numero-meme-montant-pas-a5', () => {
    expect(premiere([p('a', 'F-0005'), p('b', 'F-0005')]).doublons).toEqual([]);
    expect(premiere([p('a', 'F-0005'), p('b', 'F-0005'), p('c', 'F-0005', '2026-01-10', 1)]).doublons).toEqual([{ ordre: 5, ids: ['a', 'b', 'c'] }]);
  });

  it('v21-date-qui-recule', () => {
    const r = premiere([p('a', 'F-0001', '2026-03-10'), p('b', 'F-0002', '2026-03-09'), p('c', 'F-0003', '2026-03-09'), p('d', 'F-0004', '2026-03-11')]);
    expect(r.datesQuiReculent).toEqual([{ avant: 'a', apres: 'b' }]);
    expect(premiere([p('a', 'F-0001', '2026-03-10'), p('b', 'F-0002', '2026-03-10')]).datesQuiReculent).toEqual([]);
    expect(code(() => an([p('a', 'F-1', ''), p('b', 'F-2')]))).toBe('date_invalide');
  });

  it('plusieurs-series-separees', () => {
    const r = an([p('x', 'B-0002'), p('y', 'A-0001'), p('z', 'A-0003'), p('w', 'B-0001', '2026-01-10', 5)]);
    expect(r.map((s) => s.serie)).toEqual(['A-', 'B-']);
    expect(r[0]?.trous).toEqual([2]);
    expect(r[1]?.trous).toEqual([]);
    expect(r[1]?.dernierOrdreVu).toBe(2);
  });

  it('numero-sans-chiffres-illisible', () => {
    expect(decouperNumero('ABC')).toEqual({ serie: 'ABC', ordre: null, largeur: 0 });
    expect(decouperNumero('F-12bis')).toEqual({ serie: 'F-12bis', ordre: null, largeur: 0 });
    const huge = '9'.repeat(20);
    expect(decouperNumero(`F-${huge}`)).toEqual({ serie: 'F-', ordre: null, largeur: 20 });
    const r = an([p('a', 'ABC'), p('b', 'F-1'), p('c', `F-${huge}`)]);
    expect(r.map((s) => [s.serie, s.illisibles, s.dernierOrdreVu])).toEqual([['ABC', ['a'], null], ['F-', ['c'], 1]]);
  });

  it('zeros-en-tete', () => {
    expect(decouperNumero('F-0042')).toEqual({ serie: 'F-', ordre: 42, largeur: 4 });
    expect(decouperNumero(' F-42 ')).toEqual({ serie: 'F-', ordre: 42, largeur: 2 });
    expect(decouperNumero('2026')).toEqual({ serie: '', ordre: 2026, largeur: 4 });
    const r = an([p('a', 'F-0042'), p('b', 'F-42', '2026-01-10', 7)]);
    expect(r).toHaveLength(1);
    expect(r[0]?.doublons).toEqual([{ ordre: 42, ids: ['a', 'b'] }]);
  });

  it('ordre-d-entree-indifferent', () => {
    const l = [p('a', 'F-1', '2026-02-01'), p('b', 'F-2', '2026-01-01'), p('c', 'F-2', '2026-01-05', 9), p('d', 'F-5'), p('e', 'G-3'), p('f', 'zz')];
    const ref = an(l);
    expect(an([...l].reverse())).toEqual(ref);
    expect(an([l[3] as PieceSerie, l[5] as PieceSerie, l[1] as PieceSerie, l[0] as PieceSerie, l[4] as PieceSerie, l[2] as PieceSerie])).toEqual(ref);
  });

  it('liste-vide', () => {
    expect(an([])).toEqual([]);
    expect(premiere([p('a', 'F-7')])).toMatchObject({ trous: [], dernierOrdreVu: 7, tropDeTrous: false });
  });

  it('plafond-de-trous', () => {
    const r = premiere([p('a', 'F-0001'), p('b', 'F-9999')]);
    expect(r.trous).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(r.tropDeTrous).toBe(true);
    const exact = premiere([p('a', 'F-1'), p('b', 'F-12')]);
    expect(exact.trous).toHaveLength(MAX);
    expect(exact.tropDeTrous).toBe(false);
    const deux = premiere([p('a', 'F-1'), p('b', 'F-4'), p('c', 'F-8')], 3);
    expect(deux.trous).toEqual([2, 3, 5]);
    expect(deux.tropDeTrous).toBe(true);
    expect(premiere([p('a', 'F-1'), p('b', 'F-3')], 1).trous).toEqual([2]);
    for (const n of [0, 1.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(code(() => an([], n))).toBe('entree_invalide');
  });

  it('ttc-invalide', () => {
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) expect(code(() => an([p('a', 'F-1', '2026-01-10', n)]))).toBe('entree_invalide');
    expect(code(() => an([p('a', 'F-1', '2026-01-10', 0), p('b', 'F-2', '2026-01-10', -5)]))).toBeUndefined();
  });
});
