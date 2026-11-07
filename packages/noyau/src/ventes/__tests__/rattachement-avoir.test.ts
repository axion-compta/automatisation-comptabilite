import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { rattacherAvoir } from '../rattachement-avoir.js';
import { ErreurVente } from '../types.js';

const c = centimes;
const fac = (id: string, numero: string, clientId: string, ttc: number, resteDu = ttc) => ({ id, numero, clientId, ttc: c(ttc), resteDu: c(resteDu) });
const factures = [
  fac('f1', 'F-2026-0101', 'cli-a', 12000),
  fac('f2', 'F-2026-0102', 'cli-b', 8000),
  fac('f3', 'G-2026-0101', 'cli-a', 5000),
  fac('f4', 'F-2026-0103', 'cli-b', 12000),
];
const avoir = (extra: Record<string, unknown> = {}) => ({ ttc: c(8000), ...extra });
const A12 = { factureId: null, par: null, cartes: ['A12'] };
const erreur = (action: () => unknown) => {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};

describe('rattachement d’un avoir', () => {
  it('par-reference', () => {
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0102' }), factures)).toEqual({ factureId: 'f2', par: 'reference', cartes: [] });
    // même ordre dans une autre série : pas la même facture
    expect(rattacherAvoir(avoir({ referenceLue: 'G-2026-0101', clientId: 'cli-a', ttc: c(5000) }), factures).factureId).toBe('f3');
    // ordre inversé des factures en entrée : même résultat
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0102' }), [...factures].reverse()).factureId).toBe('f2');
    // référence illisible (sans chiffre) ou inconnue : retombe sur client et montant
    expect(rattacherAvoir(avoir({ referenceLue: 'sans-numero', clientId: 'cli-b' }), factures)).toMatchObject({ factureId: 'f2', par: 'client_et_montant' });
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0999', clientId: 'cli-b' }), factures)).toMatchObject({ factureId: 'f2', par: 'client_et_montant' });
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0999' }), factures)).toEqual(A12);
    expect(rattacherAvoir(avoir({ referenceLue: 'sans-numero' }), [fac('x', 'sans-numero', 'cli-a', 8000)])).toEqual(A12);
  });

  it('reference-avec-zeros-differents', () => {
    const r = rattacherAvoir(avoir({ referenceLue: 'F-2026-101', ttc: c(100) }), factures);
    expect(r).toEqual({ factureId: 'f1', par: 'reference', cartes: [] });
    expect(rattacherAvoir(avoir({ referenceLue: ' F-2026-00102 ' }), factures).factureId).toBe('f2');
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2025-101' }), factures).factureId).toBeNull();
  });

  it('par-client-et-montant', () => {
    expect(rattacherAvoir(avoir({ clientId: 'cli-b' }), factures)).toEqual({ factureId: 'f2', par: 'client_et_montant', cartes: [] });
    expect(rattacherAvoir(avoir({ clientId: 'cli-a', ttc: c(5000) }), factures).factureId).toBe('f3');
    expect(rattacherAvoir(avoir({ clientId: 'cli-b' }), [...factures].reverse()).factureId).toBe('f2');
  });

  it('v17-aucune-facture-a12', () => {
    expect(rattacherAvoir(avoir({ clientId: 'cli-a' }), factures)).toEqual(A12);
    expect(rattacherAvoir(avoir({ clientId: 'cli-b', ttc: c(8001) }), factures)).toEqual(A12);
    expect(rattacherAvoir(avoir({ clientId: 'cli-b' }), [])).toEqual(A12);
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0102' }), [])).toEqual(A12);
  });

  it('deux-candidates-a12', () => {
    const deux = [fac('f1', 'F-2026-0001', 'cli-a', 8000), fac('f2', 'F-2026-0002', 'cli-a', 8000)];
    expect(rattacherAvoir(avoir({ clientId: 'cli-a' }), deux)).toEqual(A12);
    expect(rattacherAvoir(avoir({ clientId: 'cli-a' }), [...deux].reverse())).toEqual(A12);
    // deux factures portant la même référence : ambiguïté, pas de choix arbitraire
    const memeNumero = [fac('f1', 'F-2026-0001', 'cli-a', 8000), fac('f2', 'F-2026-0001', 'cli-b', 8000)];
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-1' }), memeNumero)).toEqual(A12);
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-1', clientId: 'cli-b' }), memeNumero)).toMatchObject({ factureId: 'f2', par: 'client_et_montant' });
  });

  it('avoir-superieur-au-reste-du-a13', () => {
    const f = [fac('f1', 'F-2026-0001', 'cli-a', 12000, 3000)];
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0001', ttc: c(3001) }), f)).toEqual({ factureId: 'f1', par: 'reference', cartes: ['A13'] });
    expect(rattacherAvoir(avoir({ clientId: 'cli-a', ttc: c(12000) }), f)).toEqual({ factureId: 'f1', par: 'client_et_montant', cartes: ['A13'] });
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0001', ttc: c(3000) }), f).cartes).toEqual([]);
    expect(rattacherAvoir(avoir({ referenceLue: 'F-2026-0001', ttc: c(1) }), [fac('f1', 'F-2026-0001', 'cli-a', 100, 0)]).cartes).toEqual(['A13']);
  });

  it('client-absent-a12', () => {
    expect(rattacherAvoir(avoir(), factures)).toEqual(A12);
    expect(rattacherAvoir(avoir({ clientId: '' }), factures)).toEqual(A12);
    expect(rattacherAvoir(avoir({ clientId: 'cli-inconnu' }), factures)).toEqual(A12);
  });

  it('entrees-invalides', () => {
    for (const ttc of [0, -100, Number.NaN, 1.5, Infinity]) {
      expect(erreur(() => rattacherAvoir({ ttc: ttc as never, clientId: 'cli-b' }, factures))).toBe('entree_invalide');
    }
    const brute = (ttc: number, resteDu: number) => ({ ...fac('x', 'F-1', 'cli-b', 100), ttc: ttc as never, resteDu: resteDu as never });
    for (const mauvaise of [brute(Number.NaN, 100), brute(100, -1), brute(100, 1.5), brute(100, Infinity), brute(1.5, 100)]) {
      expect(erreur(() => rattacherAvoir(avoir({ clientId: 'cli-b' }), [mauvaise]))).toBe('entree_invalide');
    }
    expect(erreur(() => rattacherAvoir(avoir({ clientId: 'cli-b' }), factures))).toBeUndefined();
  });
});
