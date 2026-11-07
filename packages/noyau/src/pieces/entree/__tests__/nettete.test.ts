import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { estFloue, mesureNettete, type ImageGris } from '../nettete.js';

const image = (largeur: number, hauteur: number, f: (x: number, y: number) => number): ImageGris => {
  const pixels = new Uint8Array(largeur * hauteur);
  for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) pixels[y * largeur + x] = f(x, y);
  return { largeur, hauteur, pixels };
};
const point = (v: number): ImageGris => image(4, 3, (x, y) => (x === 1 && y === 1 ? v : 0));

describe('nettete', () => {
  it('image-uniforme-floue', () => {
    const img = image(5, 5, () => 77);
    expect(mesureNettete(img)).toEqual({ n: 9n, somme: 0n, sommeCarres: 0n });
    expect(estFloue(img, 0)).toBe(false);
    expect(estFloue(img, 1)).toBe(true);
  });
  it('damier-net', () => {
    const img = image(5, 5, (x, y) => ((x + y) % 2 === 0 ? 0 : 255));
    const m = mesureNettete(img);
    expect(m.n).toBe(9n);
    expect(m.sommeCarres).toBe(9n * 1020n * 1020n);
    expect(estFloue(img, 1000)).toBe(false);
  });
  it('flou-moyen-sous-seuil', () => {
    expect(mesureNettete(point(1))).toEqual({ n: 2n, somme: 3n, sommeCarres: 17n });
    expect(estFloue(point(1), 7)).toBe(true);
    expect(estFloue(point(1), 6)).toBe(false);
  });
  it('egalite-au-seuil-non-floue', () => {
    expect(mesureNettete(point(10))).toEqual({ n: 2n, somme: 30n, sommeCarres: 1700n });
    expect(estFloue(point(10), 625)).toBe(false);
    expect(estFloue(point(10), 626)).toBe(true);
    expect(estFloue(point(10), 624)).toBe(false);
  });
  it('dimensions-trop-petites-refusees', () => {
    for (const [l, h] of [[2, 2], [3, 2], [2, 3], [0, 0], [-3, 5], [3.5, 4], [NaN, 3], [Infinity, 3]] as const) {
      const img = { largeur: l, hauteur: h, pixels: new Uint8Array(Math.max(0, Number.isInteger(l * h) ? l * h : 12)) };
      expect(() => mesureNettete(img)).toThrow(ErreurPiece);
      try { estFloue(img, 1); } catch (e) { expect((e as ErreurPiece).code).toBe('image_invalide'); }
    }
  });
  it('longueur-incoherente-refusee', () => {
    for (const n of [0, 8, 10]) {
      const img = { largeur: 3, hauteur: 3, pixels: new Uint8Array(n) };
      expect(() => estFloue(img, 1)).toThrow(expect.objectContaining({ code: 'image_invalide' }));
    }
  });
  it('seuil-invalide-refuse', () => {
    const img = point(1);
    for (const s of [NaN, Infinity, -Infinity, -1, 0.5]) {
      expect(() => estFloue(img, s)).toThrow(expect.objectContaining({ code: 'reglage_invalide' }));
    }
  });
});
