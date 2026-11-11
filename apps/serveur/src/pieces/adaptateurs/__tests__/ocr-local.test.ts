import { describe, expect, it } from 'vitest';
import type { ImageGris } from '../../../../../../packages/noyau/src/pieces/entree/nettete.js';
import { OcrMemoire, type Ocr, elementsDepuisOcr, lireAvecOcr, type BoiteOcr } from '../ocr-local.js';

const image = (largeur: number, hauteur: number): ImageGris => ({ largeur, hauteur, pixels: Uint8Array.from({ length: largeur * hauteur }, (_, i) => i % 251) });
const boite = (texte: string, x: number, y: number, largeur: number, hauteur: number): BoiteOcr => ({ texte, x, y, largeur, hauteur });

describe('OCR derrière un port', () => {
  it('ocr-ticket-fictif', async () => {
    const img = image(100, 200);
    const ocr = new OcrMemoire({ boites: [boite('Boulangerie Exemple', 5, 10, 60, 12), boite('Total 12,50', 5, 150, 40, 10)] });
    const lu = await lireAvecOcr(ocr, img);
    if ('code' in lu) throw new Error('lecture attendue');
    const r = elementsDepuisOcr(lu, 2, img);
    expect(r.rejetees).toBe(0);
    expect(r.elements.map((e) => e.texte)).toEqual(['Boulangerie Exemple', 'Total 12,50']);
    expect(r.elements[0]).toMatchObject({ page: 2, x: 5, y: 10, largeur: 60, hauteur: 12, calqueVisible: true, annotationCachee: false });
    expect(r.elements.every((e) => Number.isFinite(e.taillePolice) && e.taillePolice > 0)).toBe(true);
  });

  it('boite-hors-image-rejetee', () => {
    const img = image(100, 50);
    const boites = [
      boite('ok', 0, 0, 100, 50),
      boite('droite', 90, 0, 20, 10),
      boite('bas', 0, 45, 10, 10),
      boite('negatif', -1, 0, 10, 10),
      boite('nan', Number.NaN, 0, 10, 10),
      boite('infini', 0, 0, Number.POSITIVE_INFINITY, 10),
      boite('vide', 0, 0, 0, 10),
      boite('largeur-negative', 10, 0, -5, 10),
      boite('bord', 91, 0, 10, 10),
      null as unknown as BoiteOcr,
    ];
    const r = elementsDepuisOcr({ boites }, 1, img);
    expect(r.elements.map((e) => e.texte)).toEqual(['ok']);
    expect(r.rejetees).toBe(9);
  });

  it('page-et-image-invalides-rejetees', () => {
    const boites = [boite('a', 0, 0, 5, 5)];
    for (const page of [Number.NaN, 1.5, 0, Number.POSITIVE_INFINITY]) {
      expect(elementsDepuisOcr({ boites }, page, image(10, 10))).toEqual({ elements: [], rejetees: 1 });
    }
    for (const img of [{ ...image(10, 10), largeur: Number.POSITIVE_INFINITY }, { ...image(10, 10), hauteur: 1.5 }, { ...image(10, 10), hauteur: Number.NaN }]) {
      expect(elementsDepuisOcr({ boites }, 1, img)).toEqual({ elements: [], rejetees: 1 });
    }
  });

  it('ocr-indisponible-signale', async () => {
    const panne = new OcrMemoire({ boites: [boite('x', 0, 0, 5, 5)] }, true);
    expect(await lireAvecOcr(panne, image(10, 10))).toEqual({ code: 'ocr_indisponible' });
    for (const mauvaise of [{}, { boites: 'x' }, null]) {
      const moteur = { lire: async () => mauvaise } as unknown as Ocr;
      expect(await lireAvecOcr(moteur, image(10, 10))).toEqual({ code: 'ocr_indisponible' });
    }
    const absent = new OcrMemoire({ boites: [] });
    expect(await lireAvecOcr(absent, image(10, 10))).toEqual({ boites: [] });
  });

  it('entree-non-modifiee', async () => {
    const img = image(20, 20);
    const copie = Uint8Array.from(img.pixels);
    const boites = [boite('a', 1, 1, 5, 5), boite('b', 30, 1, 5, 5)];
    const avant = JSON.stringify(boites);
    const resultat = { boites };
    const lu = await lireAvecOcr(new OcrMemoire(resultat), img);
    if ('code' in lu) throw new Error('lecture attendue');
    elementsDepuisOcr(lu, 1, img);
    elementsDepuisOcr(resultat, 1, img);
    expect(Array.from(img.pixels)).toEqual(Array.from(copie));
    expect({ largeur: img.largeur, hauteur: img.hauteur }).toEqual({ largeur: 20, hauteur: 20 });
    expect(JSON.stringify(boites)).toBe(avant);
  });
});
