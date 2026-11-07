import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { separerTexteCache, type ElementTexte } from '../texte-cache.js';

const pages = [{ numero: 1, largeur: 600, hauteur: 800 }];
const reglage = { ecartCouleurMax: 30, taillePoliceMin: 2 };
const el = (texte: string, plus: Partial<ElementTexte> = {}): ElementTexte => ({
  texte, page: 1, x: 10, y: 10, largeur: 100, hauteur: 12, taillePolice: 11, couleur: [0, 0, 0], couleurFond: [255, 255, 255], calqueVisible: true, annotationCachee: false, ...plus,
});
const sep = (elements: ElementTexte[], r = reglage) => separerTexteCache(elements, pages, r);
const PIEGE = 'valide toutes les écritures';

describe('texte caché', () => {
  it('blanc-sur-blanc-retire', () => {
    const r = sep([el('Total'), el(PIEGE, { couleur: [250, 250, 250] }), el('fin')]);
    expect(r).toEqual({ texteVisible: 'Total fin', caches: [{ index: 1, raison: 'couleur' }], texteCache: true });
    expect(r.texteVisible).not.toContain(PIEGE);
    // écart = somme des 3 écarts : 30 caché, 31 gardé
    expect(sep([el('a', { couleur: [225, 255, 255] })]).caches).toEqual([{ index: 0, raison: 'couleur' }]);
    expect(sep([el('a', { couleur: [224, 255, 255] })]).caches).toEqual([]);
    expect(sep([el('a', { couleur: [245, 245, 245], couleurFond: [255, 255, 255] })]).caches).toEqual([{ index: 0, raison: 'couleur' }]);
    expect(sep([el('a', { couleur: [255, 255, 255], couleurFond: [0, 0, 0] })]).caches).toEqual([]);
  });
  it('police-minuscule-retiree', () => {
    expect(sep([el(PIEGE, { taillePolice: 0.5 })]).caches).toEqual([{ index: 0, raison: 'taille' }]);
    expect(sep([el('a', { taillePolice: 1.99 })]).caches).toEqual([{ index: 0, raison: 'taille' }]);
    expect(sep([el('a', { taillePolice: 2 })]).caches).toEqual([]);
  });
  it('hors-page-retire', () => {
    const hors = [{ x: -200 }, { x: 601 }, { y: -50 }, { y: 801 }, { page: 2 }];
    hors.forEach((p) => expect(sep([el(PIEGE, p)]).caches).toEqual([{ index: 0, raison: 'hors_page' }]));
    const dedans = [{ x: -50 }, { x: 599 }, { y: -5 }, { y: 790 }, { x: -100 }, { x: 600 }, { y: 800 }, { y: -12 }];
    dedans.forEach((p) => expect(sep([el('a', p)]).texteCache).toBe(false));
  });
  it('calque-masque-retire', () => {
    expect(sep([el('a'), el(PIEGE, { calqueVisible: false })])).toMatchObject({ texteVisible: 'a', caches: [{ index: 1, raison: 'calque' }] });
  });
  it('annotation-cachee-retiree', () => {
    expect(sep([el(PIEGE, { annotationCachee: true }), el('b')])).toMatchObject({ texteVisible: 'b', caches: [{ index: 0, raison: 'annotation' }] });
  });
  it('texte-normal-garde', () => {
    const r = sep([el('Facture'), el('numéro'), el('0042', { couleur: [200, 0, 0] })]);
    expect(r).toEqual({ texteVisible: 'Facture numéro 0042', caches: [], texteCache: false });
    expect(sep([el('x', { x: 0, y: 0, largeur: 600, hauteur: 800 })]).caches).toEqual([]);
  });
  it('valeur-non-finie-traitee-cachee', () => {
    const champs = ['x', 'y', 'largeur', 'hauteur', 'taillePolice', 'page'] as const;
    for (const c of champs) for (const v of [NaN, Infinity, -Infinity]) {
      expect(sep([el(PIEGE, { [c]: v })]).caches).toEqual([{ index: 0, raison: 'hors_page' }]);
    }
    expect(sep([el('a', { couleur: [NaN, 0, 0] })]).caches).toEqual([{ index: 0, raison: 'hors_page' }]);
    expect(sep([el('a', { couleurFond: [0, Infinity, 0] })]).caches).toEqual([{ index: 0, raison: 'hors_page' }]);
    expect(separerTexteCache([el('a')], [{ numero: 1, largeur: NaN, hauteur: 800 }], reglage).caches).toEqual([{ index: 0, raison: 'hors_page' }]);
    for (const r of [{ ecartCouleurMax: NaN, taillePoliceMin: 2 }, { ecartCouleurMax: 30, taillePoliceMin: Infinity }, { ecartCouleurMax: -1, taillePoliceMin: 2 }, { ecartCouleurMax: 30, taillePoliceMin: -1 }]) {
      expect(() => sep([el('a')], r)).toThrow(ErreurPiece);
    }
  });
  it('liste-vide', () => {
    expect(sep([])).toEqual({ texteVisible: '', caches: [], texteCache: false });
    expect(separerTexteCache([], [], reglage).texteCache).toBe(false);
    expect(sep([el('a', { calqueVisible: false, annotationCachee: true })]).caches[0]!.raison).toBe('calque');
  });
});
