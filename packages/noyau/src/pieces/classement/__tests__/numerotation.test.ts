import { describe, expect, it } from 'vitest';
import { decouperNumero, trousDeSerie } from '../numerotation.js';

const seq = (numeros: string[], trousMax = 10) => trousDeSerie(numeros, { sequentielle: true, trousMax });
const SERIE = ['F-0101', 'F-0102', 'F-0104', 'F-0105'];

describe('numerotation', () => {
  it('un-trou-f-0103', () => {
    expect(seq(SERIE)).toEqual({ trous: ['F-0103'], tronque: false, ignores: [] });
    expect(decouperNumero('F-0101')).toEqual({ prefixe: 'F-', nombre: 101n, largeur: 4 });
    expect(decouperNumero('A1-22')).toEqual({ prefixe: 'A1-', nombre: 22n, largeur: 2 });
  });
  it('serie-complete-sans-trou', () => {
    expect(seq(['F-0101', 'F-0102', 'F-0103']).trous).toEqual([]);
    expect(seq(['F-0101']).trous).toEqual([]);
  });
  it('non-sequentielle-ignoree', () => {
    expect(trousDeSerie(SERIE, { sequentielle: false, trousMax: 10 })).toEqual({ trous: [], tronque: false, ignores: [] });
  });
  it('ordre-sans-effet', () => {
    const inverse = [...SERIE, 'X', 'G-1'].reverse();
    expect(seq(inverse)).toEqual(seq([...SERIE, 'X', 'G-1']));
    expect(seq(['F-0105', 'F-0101', 'F-0104', 'F-0102'])).toEqual(seq(SERIE));
  });
  it('doublons-retires', () => {
    expect(seq(['F-0101', 'F-0101', 'F-0103', 'F-0103', 'F-0103'])).toEqual({ trous: ['F-0102'], tronque: false, ignores: [] });
    expect(seq(['F-1', 'F-01', 'F-3']).trous).toEqual(['F-02']);
  });
  it('prefixe-different-ignore', () => {
    const r = seq(['F-0101', 'F-0103', 'F-0104', 'G-0200', 'G-0300']);
    expect(r.trous).toEqual(['F-0102']);
    expect(r.ignores).toEqual(['G-0200', 'G-0300']);
    expect(seq(['B-1', 'B-3', 'A-1', 'A-5'])).toEqual({ trous: ['A-2', 'A-3', 'A-4'], tronque: false, ignores: ['B-1', 'B-3'] });
    expect(seq(['A1', 'B1', 'B3', 'B4', 'A3']).trous).toEqual(['B2']);
    expect(seq(['9', 'F-1', 'F-3']).trous).toEqual(['F-2']);
  });
  it('trous-tronques', () => {
    expect(seq(['A1', 'A6'], 3)).toEqual({ trous: ['A2', 'A3', 'A4'], tronque: true, ignores: [] });
    expect(seq(['A1', 'A5'], 3)).toEqual({ trous: ['A2', 'A3', 'A4'], tronque: false, ignores: [] });
    expect(seq(['A1', 'A3'], 0)).toEqual({ trous: [], tronque: true, ignores: [] });
    expect(seq(['A1', 'A99999999999999999999999'], 2)).toMatchObject({ tronque: true, trous: [expect.stringMatching(/^A0+2$/), expect.stringMatching(/^A0+3$/)] });
    expect(seq(['A1', 'A3', 'A5', 'A7'], 2)).toEqual({ trous: ['A2', 'A4'], tronque: true, ignores: [] });
  });
  it('entrees-vides-et-sans-chiffre', () => {
    expect(seq([])).toEqual({ trous: [], tronque: false, ignores: [] });
    expect(seq(['', 'ABC', 'F-12A'])).toEqual({ trous: [], tronque: false, ignores: ['', 'ABC', 'F-12A'] });
    expect(decouperNumero('')).toBeNull();
    expect(decouperNumero('12A')).toBeNull();
    expect(decouperNumero('0042')).toEqual({ prefixe: '', nombre: 42n, largeur: 4 });
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) expect(() => seq(SERIE, m)).toThrow(expect.objectContaining({ code: 'reglage_invalide' }));
  });
});
