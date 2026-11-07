// Empreinte perceptuelle dHash 64 bits : calcul pur sur une image 9 x 8 en niveaux de gris.
import { ErreurPiece } from '../types.js';

const COLONNES = 9;
const LIGNES = 8;
const MAX = (1n << 64n) - 1n;

/** Bit n = 1 si le pixel de gauche est plus clair que celui de droite ; n = ligne * 8 + colonne. */
export function dHash(gris: Uint8Array): bigint {
  if (gris.length !== COLONNES * LIGNES) throw new ErreurPiece('image_invalide', 'L\'image réduite doit contenir 72 valeurs.');
  let h = 0n;
  for (let l = 0; l < LIGNES; l++) {
    for (let c = 0; c < COLONNES - 1; c++) {
      const i = l * COLONNES + c;
      if ((gris[i] ?? 0) > (gris[i + 1] ?? 0)) h |= 1n << BigInt(l * (COLONNES - 1) + c);
    }
  }
  return h;
}

export function distanceHamming(a: bigint, b: bigint): number {
  if (a < 0n || a > MAX || b < 0n || b > MAX) throw new ErreurPiece('empreinte_invalide', 'Empreinte hors de 64 bits.');
  const x = a ^ b;
  let n = 0;
  for (let i = 0n; i < 64n; i++) if (((x >> i) & 1n) === 1n) n++;
  return n;
}
