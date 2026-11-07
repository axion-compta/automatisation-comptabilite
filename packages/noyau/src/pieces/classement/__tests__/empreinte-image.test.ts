import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { distanceHamming, dHash } from '../empreinte-image.js';

const grille = (f: (l: number, c: number) => number): Uint8Array => Uint8Array.from({ length: 72 }, (_, i) => f(Math.floor(i / 9), i % 9));
const code = (f: () => unknown): string | undefined => { try { f(); } catch (e) { return e instanceof ErreurPiece ? e.code : 'autre'; } return undefined; };

describe('empreinte-image', () => {
  it('meme-image-distance-0', () => {
    const g = grille((l, c) => (l * 7 + c * 13) % 251);
    expect(dHash(g)).toBe(dHash(Uint8Array.from(g)));
    expect(distanceHamming(dHash(g), dHash(g))).toBe(0);
    expect(distanceHamming(5n, 5n)).toBe(0);
  });
  it('image-uniforme-empreinte-nulle', () => {
    expect(dHash(grille(() => 120))).toBe(0n);
    expect(dHash(grille((_l, c) => c * 10))).toBe(0n);
  });
  it('degrade-empreinte-pleine', () => {
    const plein = dHash(grille((_l, c) => 200 - c * 10));
    expect(plein).toBe(2n ** 64n - 1n);
    expect(distanceHamming(plein, 0n)).toBe(64);
    expect(distanceHamming(0n, plein)).toBe(64);
  });
  it('un-pixel-change-une-distance-faible', () => {
    const base = grille(() => 100);
    expect(dHash(base)).toBe(0n);
    const a = Uint8Array.from(base); a[0] = 101;
    expect(dHash(a)).toBe(1n);
    const b = Uint8Array.from(base); b[7 * 9 + 7] = 101;
    expect(dHash(b)).toBe(1n << 63n);
    const c = Uint8Array.from(base); c[9 + 8] = 99;
    expect(dHash(c)).toBe(1n << 15n);
    const d = Uint8Array.from(base); d[10] = 101;
    expect(dHash(d)).toBe(1n << 9n);
    expect(distanceHamming(dHash(a), dHash(base))).toBe(1);
    expect(distanceHamming(dHash(a), dHash(b))).toBe(2);
    expect(distanceHamming(0b1011n, 0b0110n)).toBe(3);
  });
  it('longueur-invalide-refusee', () => {
    for (const n of [71, 73, 0]) expect(code(() => dHash(new Uint8Array(n)))).toBe('image_invalide');
    expect(code(() => dHash(new Uint8Array(72)))).toBeUndefined();
  });
  it('empreinte-invalide-refusee', () => {
    for (const v of [-1n, 2n ** 64n]) {
      expect(code(() => distanceHamming(v, 0n))).toBe('empreinte_invalide');
      expect(code(() => distanceHamming(0n, v))).toBe('empreinte_invalide');
    }
    expect(code(() => distanceHamming(2n ** 64n - 1n, 0n))).toBeUndefined();
    expect(code(() => distanceHamming(0n, 0n))).toBeUndefined();
  });
});
