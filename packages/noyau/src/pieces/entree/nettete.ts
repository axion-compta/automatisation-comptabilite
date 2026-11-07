// Netteté d'une photo : variance du laplacien comparée sans division (forme multipliée, en bigint).
import { ErreurPiece } from '../types.js';

export interface ImageGris { largeur: number; hauteur: number; pixels: Uint8Array; }
export interface MesureNettete { n: bigint; somme: bigint; sommeCarres: bigint; }

const verifier = (img: ImageGris): void => {
  const { largeur, hauteur, pixels } = img;
  if (!Number.isInteger(largeur) || !Number.isInteger(hauteur) || largeur < 3 || hauteur < 3 || pixels.length !== largeur * hauteur) {
    throw new ErreurPiece('image_invalide', 'image en niveaux de gris invalide');
  }
};

export function mesureNettete(img: ImageGris): MesureNettete {
  verifier(img);
  const { largeur, hauteur, pixels } = img;
  let n = 0n;
  let somme = 0n;
  let sommeCarres = 0n;
  for (let y = 1; y < hauteur - 1; y++) {
    for (let x = 1; x < largeur - 1; x++) {
      const i = y * largeur + x;
      const l = BigInt(4 * pixels[i]! - pixels[i - largeur]! - pixels[i + largeur]! - pixels[i - 1]! - pixels[i + 1]!);
      n += 1n;
      somme += l;
      sommeCarres += l * l;
    }
  }
  return { n, somme, sommeCarres };
}

export function estFloue(img: ImageGris, seuil: number): boolean {
  if (!Number.isInteger(seuil) || seuil < 0) throw new ErreurPiece('reglage_invalide', 'seuil de netteté invalide');
  const { n, somme, sommeCarres } = mesureNettete(img);
  return n * sommeCarres - somme * somme < BigInt(seuil) * n * n;
}
