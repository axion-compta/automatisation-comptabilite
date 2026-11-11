// OCR local derrière un port : aucun moteur choisi, aucun réseau. Le faux en mémoire sert aux tests.
import type { ImageGris } from '../../../../../packages/noyau/src/pieces/entree/nettete.js';
import type { ElementTexte } from '../../../../../packages/noyau/src/pieces/sensibles/texte-cache.js';

export interface BoiteOcr { texte: string; x: number; y: number; largeur: number; hauteur: number; }
export interface ResultatOcr { boites: BoiteOcr[]; }
export interface Ocr { lire(image: ImageGris): Promise<ResultatOcr>; }
export interface OcrIndisponible { code: 'ocr_indisponible'; }
export interface ElementsOcr { elements: ElementTexte[]; rejetees: number; }

const NOIR: [number, number, number] = [0, 0, 0];
const BLANC: [number, number, number] = [255, 255, 255];

export class OcrMemoire implements Ocr {
  constructor(private readonly reponse: ResultatOcr, private readonly enPanne = false) {}
  async lire(): Promise<ResultatOcr> {
    if (this.enPanne) throw new Error('ocr en panne simulée');
    return { boites: this.reponse.boites.map((b) => ({ ...b })) };
  }
}

/** Une panne n'est jamais présentée comme un texte vide lu. */
export async function lireAvecOcr(ocr: Ocr, image: ImageGris): Promise<ResultatOcr | OcrIndisponible> {
  try {
    const r = await ocr.lire(image);
    return Array.isArray(r?.boites) ? r : { code: 'ocr_indisponible' };
  } catch {
    return { code: 'ocr_indisponible' };
  }
}

function boiteValide(b: BoiteOcr, image: ImageGris): boolean {
  if (typeof b !== 'object' || b === null) return false;
  const { x, y, largeur, hauteur } = b;
  if (typeof b.texte !== 'string' || ![x, y, largeur, hauteur].every((v) => Number.isFinite(v))) return false;
  return largeur > 0 && hauteur > 0 && x >= 0 && y >= 0 && x + largeur <= image.largeur && y + hauteur <= image.hauteur;
}

export function elementsDepuisOcr(resultat: ResultatOcr, page: number, image: ImageGris): ElementsOcr {
  const elements: ElementTexte[] = [];
  let rejetees = 0;
  const contexteValide = Number.isInteger(page) && page >= 1
    && Number.isInteger(image.largeur) && image.largeur > 0 && Number.isInteger(image.hauteur) && image.hauteur > 0;
  for (const b of resultat.boites) {
    if (!contexteValide || !boiteValide(b, image)) { rejetees += 1; continue; }
    elements.push({
      texte: b.texte, page, x: b.x, y: b.y, largeur: b.largeur, hauteur: b.hauteur,
      taillePolice: b.hauteur, couleur: [...NOIR], couleurFond: [...BLANC], calqueVisible: true, annotationCachee: false,
    });
  }
  return { elements, rejetees };
}
