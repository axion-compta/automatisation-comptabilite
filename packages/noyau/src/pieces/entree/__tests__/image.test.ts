import { describe, expect, it } from 'vitest';
import { controlerImage, dimensionsImage } from '../image.js';

const t = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0));
const b32 = (v: number): number[] => [Math.floor(v / 16777216) % 256, Math.floor(v / 65536) % 256, Math.floor(v / 256) % 256, v % 256];
const l = (v: number, n: number): number[] => Array.from({ length: n }, (_, i) => Math.floor(v / 256 ** i) % 256);
const u8 = (...p: number[][]): Uint8Array => new Uint8Array(p.flat());
const png = (w: number, h: number): Uint8Array => u8([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], b32(13), t('IHDR'), b32(w), b32(h), [8, 2, 0, 0, 0]);
const sof = (m: number, w: number, h: number): number[] => [0xff, m, 0, 17, 8, Math.floor(h / 256), h % 256, Math.floor(w / 256), w % 256, 3, 0, 0, 0, 0, 0, 0, 0, 0];
const jpeg = (...segments: number[][]): Uint8Array => u8([0xff, 0xd8], ...segments);
const riff = (...c: number[][]): Uint8Array => u8(t('RIFF'), [0, 0, 0, 0], t('WEBP'), ...c);
const vp8x = (w: number, h: number): Uint8Array => riff(t('VP8X'), [10, 0, 0, 0], [0, 0, 0, 0], l(w - 1, 3), l(h - 1, 3));
const R = { coteMax: 30000, pixelsMax: 100000000 };
const illisible = { ok: false, erreur: 'controle_impossible' };
const refus = (raison: string) => ({ ok: false, refus: 'image_refusee', raison });
const code = (f: () => unknown): string | undefined => { try { f(); } catch (e) { return (e as { code?: string }).code; } return undefined; };

describe('image', () => {
  it('png-dimensions', () => {
    expect(dimensionsImage(png(300, 70000))).toEqual({ largeur: 300, hauteur: 70000 });
    expect(dimensionsImage(png(4000000000, 1))).toEqual({ largeur: 4000000000, hauteur: 1 });
    const faux = png(1, 1); faux[13] = 0x58;
    expect(dimensionsImage(faux)).toBeNull();
  });
  it('jpeg-dimensions-apres-segments-app', () => {
    const app = [0xff, 0xe1, 0, 6, 1, 2, 3, 4];
    expect(dimensionsImage(jpeg(app, app, sof(0xc0, 640, 480)))).toEqual({ largeur: 640, hauteur: 480 });
    expect(dimensionsImage(jpeg([0xff, 0xff], [0xff, 0x01], [0xff, 0xd0], sof(0xc2, 1000, 70000 % 65536)))).toEqual({ largeur: 1000, hauteur: 4464 });
    for (const m of [0xc1, 0xc3, 0xc5, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]) expect(dimensionsImage(jpeg(sof(m, 5, 6)))).toEqual({ largeur: 5, hauteur: 6 });
    expect(dimensionsImage(jpeg([0xff, 0xc4, 0, 4, 1, 1], sof(0xc0, 7, 8)))).toEqual({ largeur: 7, hauteur: 8 });
    expect(dimensionsImage(jpeg([0xff, 0xc8, 0, 4, 1, 1], [0xff, 0xcc, 0, 4, 1, 1], sof(0xc0, 7, 8)))).toEqual({ largeur: 7, hauteur: 8 });
  });
  it('webp-vp8x-dimensions', () => {
    expect(dimensionsImage(vp8x(30001, 20))).toEqual({ largeur: 30001, hauteur: 20 });
    expect(dimensionsImage(riff(t('VP8 '), [0, 0, 0, 0], [0, 0, 0], [0x9d, 0x01, 0x2a], l(320, 2), l(240, 2)))).toEqual({ largeur: 320, hauteur: 240 });
    expect(dimensionsImage(riff(t('VP8 '), [0, 0, 0, 0], [0, 0, 0], [0x9d, 0x01, 0x2b], l(320, 2), l(240, 2)))).toBeNull();
    const bits = 99 + 199 * 16384;
    expect(dimensionsImage(riff(t('VP8L'), [0, 0, 0, 0], [0x2f], l(bits, 4), l(0, 5)))).toEqual({ largeur: 100, hauteur: 200 });
    expect(dimensionsImage(riff(t('VP8L'), [0, 0, 0, 0], [0x2e], l(bits, 4), l(0, 5)))).toBeNull();
    expect(dimensionsImage(riff(t('ALPH'), [0, 0, 0, 0], l(0, 12)))).toBeNull();
  });
  it('cote-depasse-refuse', () => {
    expect(controlerImage(png(30001, 10), R)).toEqual(refus('cote'));
    expect(controlerImage(png(10, 30001), R)).toEqual(refus('cote'));
    expect(controlerImage(png(30000, 10), R)).toEqual({ ok: true, largeur: 30000, hauteur: 10 });
  });
  it('pixels-depasses-refuse', () => {
    expect(controlerImage(png(10001, 10000), R)).toEqual(refus('pixels'));
    expect(controlerImage(png(10000, 10000), R)).toEqual({ ok: true, largeur: 10000, hauteur: 10000 });
    expect(controlerImage(png(4000000000, 4000000000), { coteMax: 4000000000, pixelsMax: 9007199254740991 })).toEqual(refus('pixels'));
  });
  it('dimension-nulle-refusee', () => {
    expect(controlerImage(png(0, 10), R)).toEqual(refus('dimension_nulle'));
    expect(controlerImage(png(10, 0), R)).toEqual(refus('dimension_nulle'));
    expect(controlerImage(jpeg(sof(0xc0, 0, 5)), R)).toEqual(refus('dimension_nulle'));
  });
  it('illisible-donne-controle-impossible', () => {
    const cas = [jpeg([0xff, 0xe0, 0, 4, 1, 1]), jpeg([0xff, 0xe0, 0, 1, 1, 1]), jpeg([0xff, 0xda, 0, 4, 1, 1]), jpeg([0xff, 0xd9, 0, 4]),
      jpeg([0x00, 0xc0, 0, 17, 8]), jpeg(sof(0xc0, 5, 6).slice(0, 8)), png(1, 1).slice(0, 23), png(1, 1).slice(0, 12), new Uint8Array(0),
      u8(t('RIFF'), [0, 0, 0, 0], t('WEBP')), u8([0, 0, 0, 24], t('ftypheic'), l(0, 20)), riff(t('VP8X'), l(0, 15)).slice(0, 29)];
    for (const c of cas) expect(controlerImage(c, R)).toEqual(illisible);
  });
  it('reglage-invalide', () => {
    for (const v of [NaN, Infinity, 0, 2.5, -1]) {
      expect(code(() => controlerImage(png(1, 1), { ...R, coteMax: v }))).toBe('reglage_invalide');
      expect(code(() => controlerImage(png(1, 1), { ...R, pixelsMax: v }))).toBe('reglage_invalide');
    }
    expect(code(() => controlerImage(new Uint8Array(0), { ...R, coteMax: 0 }))).toBe('reglage_invalide');
  });
});
