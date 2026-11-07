import { describe, expect, it } from 'vitest';
import { autoriserAppel, constaterApresAppel, evaluerLimites } from '../limites.js';

const R = { tailleMaxOctets: 1000, pagesMaxFileNormale: 50, pagesMaxModele: 10 };
const code = (f: () => unknown): string | undefined => { try { f(); } catch (e) { return (e as { code?: string }).code; } return undefined; };
const MAUVAIS = [NaN, Infinity, -Infinity, -1, 1.5];

describe('limites', () => {
  it('trop-grand-refuse', () => {
    expect(evaluerLimites({ tailleOctets: 1001, nbPages: 1 }, R)).toEqual({ refus: 'trop_grand' });
    expect(evaluerLimites({ tailleOctets: 1000, nbPages: 1 }, R)).toEqual({ file: 'normale', pagesAuModele: 1 });
    expect(evaluerLimites({ tailleOctets: 0, nbPages: 0 }, R)).toEqual({ file: 'normale', pagesAuModele: 0 });
  });
  it('gros-documents-au-dela-des-pages', () => {
    expect(evaluerLimites({ tailleOctets: 5, nbPages: 51 }, R)).toMatchObject({ file: 'gros_documents' });
    expect(evaluerLimites({ tailleOctets: 5, nbPages: 50 }, R)).toMatchObject({ file: 'normale' });
  });
  it('pages-au-modele-plafonnees', () => {
    expect(evaluerLimites({ tailleOctets: 5, nbPages: 2000 }, R)).toEqual({ file: 'gros_documents', pagesAuModele: 10 });
    expect(evaluerLimites({ tailleOctets: 5, nbPages: 10 }, R)).toMatchObject({ pagesAuModele: 10 });
    expect(evaluerLimites({ tailleOctets: 5, nbPages: 9 }, R)).toMatchObject({ pagesAuModele: 9 });
    expect(evaluerLimites({ tailleOctets: 5, nbPages: 11 }, R)).toMatchObject({ pagesAuModele: 10 });
  });
  it('appel-refuse-si-estimation-depasse', () => {
    expect(autoriserAppel({ depenseMicroCentimes: 60, estimationMicroCentimes: 41, plafondMicroCentimes: 100 })).toBe('plafond_cout');
    expect(autoriserAppel({ depenseMicroCentimes: 101, estimationMicroCentimes: 0, plafondMicroCentimes: 100 })).toBe('plafond_cout');
    expect(autoriserAppel({ depenseMicroCentimes: 0, estimationMicroCentimes: 101, plafondMicroCentimes: 100 })).toBe('plafond_cout');
  });
  it('appel-autorise-a-egalite', () => {
    expect(autoriserAppel({ depenseMicroCentimes: 60, estimationMicroCentimes: 40, plafondMicroCentimes: 100 })).toBe('autorise');
    expect(autoriserAppel({ depenseMicroCentimes: 0, estimationMicroCentimes: 0, plafondMicroCentimes: 0 })).toBe('autorise');
    expect(autoriserAppel({ depenseMicroCentimes: 9007199254740991, estimationMicroCentimes: 9007199254740991, plafondMicroCentimes: 9007199254740991 })).toBe('plafond_cout');
  });
  it('arret-apres-cout-reel', () => {
    expect(constaterApresAppel({ depenseMicroCentimes: 60, coutReelMicroCentimes: 40, plafondMicroCentimes: 100 })).toEqual({ depense: 100, arret: true });
    expect(constaterApresAppel({ depenseMicroCentimes: 60, coutReelMicroCentimes: 39, plafondMicroCentimes: 100 })).toEqual({ depense: 99, arret: false });
    expect(constaterApresAppel({ depenseMicroCentimes: 60, coutReelMicroCentimes: 70, plafondMicroCentimes: 100 })).toEqual({ depense: 130, arret: true });
    expect(constaterApresAppel({ depenseMicroCentimes: 0, coutReelMicroCentimes: 0, plafondMicroCentimes: 1 })).toEqual({ depense: 0, arret: false });
  });
  it('entrees-invalides-refusees', () => {
    for (const v of MAUVAIS) {
      expect(code(() => evaluerLimites({ tailleOctets: v, nbPages: 1 }, R))).toBe('entree_invalide');
      expect(code(() => evaluerLimites({ tailleOctets: 1, nbPages: v }, R))).toBe('entree_invalide');
      for (const c of ['depenseMicroCentimes', 'estimationMicroCentimes', 'plafondMicroCentimes'] as const) {
        const base = { depenseMicroCentimes: 1, estimationMicroCentimes: 1, plafondMicroCentimes: 1 };
        expect(code(() => autoriserAppel({ ...base, [c]: v }))).toBe('entree_invalide');
      }
      for (const c of ['depenseMicroCentimes', 'coutReelMicroCentimes', 'plafondMicroCentimes'] as const) {
        const base = { depenseMicroCentimes: 1, coutReelMicroCentimes: 1, plafondMicroCentimes: 1 };
        expect(code(() => constaterApresAppel({ ...base, [c]: v }))).toBe('entree_invalide');
      }
    }
  });
  it('reglage-invalide-refuse', () => {
    for (const v of [...MAUVAIS, 0]) {
      for (const c of ['tailleMaxOctets', 'pagesMaxFileNormale', 'pagesMaxModele'] as const) {
        expect(code(() => evaluerLimites({ tailleOctets: 1, nbPages: 1 }, { ...R, [c]: v }))).toBe('reglage_invalide');
      }
    }
    expect(evaluerLimites({ tailleOctets: 1, nbPages: 1 }, { tailleMaxOctets: 1, pagesMaxFileNormale: 1, pagesMaxModele: 1 })).toEqual({ file: 'normale', pagesAuModele: 1 });
  });
});
