import { ErreurPiece } from '../types.js';

export interface Dimensions { largeur: number; hauteur: number }
export interface ReglageImage { coteMax: number; pixelsMax: number }
export type ResultatImage =
  | { ok: true; largeur: number; hauteur: number }
  | { ok: false; refus: 'image_refusee'; raison: 'cote' | 'pixels' | 'dimension_nulle' }
  | { ok: false; erreur: 'controle_impossible' };

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ascii = (t: string): number[] => Array.from(t, (c) => c.charCodeAt(0));
const a = (o: Uint8Array, m: number[], d: number): boolean => o.length >= d + m.length && m.every((v, i) => o[d + i] === v);
const be16 = (o: Uint8Array, d: number): number => (o[d] as number) * 256 + (o[d + 1] as number);
const be32 = (o: Uint8Array, d: number): number => be16(o, d) * 65536 + be16(o, d + 2);
const le = (o: Uint8Array, d: number, n: number): number => {
  let v = 0;
  for (let i = n - 1; i >= 0; i--) v = v * 256 + (o[d + i] as number);
  return v;
};

function jpeg(o: Uint8Array): Dimensions | null {
  let i = 2;
  while (i + 4 <= o.length) {
    if (o[i] !== 0xff) return null;
    const m = o[i + 1] as number;
    if (m === 0xff) { i++; continue; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }
    if (m === 0xd9 || m === 0xda) return null;
    const long = be16(o, i + 2);
    if (long < 2) return null;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return i + 9 <= o.length ? { hauteur: be16(o, i + 5), largeur: be16(o, i + 7) } : null;
    }
    i += 2 + long;
  }
  return null;
}

function webp(o: Uint8Array): Dimensions | null {
  if (o.length < 30) return null;
  const type = String.fromCharCode(...Array.from(o.subarray(12, 16)));
  if (type === 'VP8X') return { largeur: le(o, 24, 3) + 1, hauteur: le(o, 27, 3) + 1 };
  if (type === 'VP8L') {
    if (o[20] !== 0x2f) return null;
    const bits = le(o, 21, 4);
    return { largeur: (bits & 0x3fff) + 1, hauteur: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (type === 'VP8 ' && a(o, [0x9d, 0x01, 0x2a], 23)) return { largeur: le(o, 26, 2) % 16384, hauteur: le(o, 28, 2) % 16384 };
  return null;
}

export function dimensionsImage(o: Uint8Array): Dimensions | null {
  if (a(o, PNG, 0)) return o.length >= 24 && a(o, ascii('IHDR'), 12) ? { largeur: be32(o, 16), hauteur: be32(o, 20) } : null;
  if (a(o, [0xff, 0xd8], 0)) return jpeg(o);
  if (a(o, ascii('RIFF'), 0) && a(o, ascii('WEBP'), 8)) return webp(o);
  return null;
}

export function controlerImage(o: Uint8Array, reglage: ReglageImage): ResultatImage {
  for (const v of [reglage.coteMax, reglage.pixelsMax]) {
    if (!Number.isInteger(v) || v <= 0) throw new ErreurPiece('reglage_invalide', 'reglage_image');
  }
  const d = dimensionsImage(o);
  if (d === null) return { ok: false, erreur: 'controle_impossible' };
  const refus = (raison: 'cote' | 'pixels' | 'dimension_nulle'): ResultatImage => ({ ok: false, refus: 'image_refusee', raison });
  if (d.largeur === 0 || d.hauteur === 0) return refus('dimension_nulle');
  if (d.largeur > reglage.coteMax || d.hauteur > reglage.coteMax) return refus('cote');
  if (BigInt(d.largeur) * BigInt(d.hauteur) > BigInt(reglage.pixelsMax)) return refus('pixels');
  return { ok: true, largeur: d.largeur, hauteur: d.hauteur };
}
