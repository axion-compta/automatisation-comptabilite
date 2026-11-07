import { describe, expect, it } from 'vitest';
import {
  ErreurCompte,
  classeDe,
  doublonsProbables,
  normaliserCompte,
  verifierCompteMvp,
} from '../comptes.js';

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErreurCompte ? e.code : 'autre';
  }
  return undefined;
}

describe('comptes', () => {
  it('normalise-avec-auxiliaire', () => {
    expect(normaliserCompte('401 FOURNISSEUR FICTIF')).toEqual({
      numero: '401',
      auxiliaireCandidat: 'FOURNISSEUR FICTIF',
    });
    expect(normaliserCompte('  411  atelier   Bertin é ')).toEqual({
      numero: '411',
      auxiliaireCandidat: 'ATELIER BERTIN E',
    });
    expect(normaliserCompte('Éditions 401')).toEqual({ numero: '401', auxiliaireCandidat: 'EDITIONS' });
    expect(normaliserCompte('401')).toEqual({ numero: '401' });
    expect(Object.keys(normaliserCompte('401'))).toEqual(['numero']);
  });

  it('normalise-points-et-espaces', () => {
    expect(normaliserCompte('60.64').numero).toBe('6064');
    expect(normaliserCompte('6 064').numero).toBe('6064');
    expect(normaliserCompte('60-64').numero).toBe('6064');
    expect(normaliserCompte('60.6 4-0')).toEqual({ numero: '60640' });
  });

  it('numero-absent-refuse', () => {
    expect(code(() => normaliserCompte('FOURNISSEUR'))).toBe('numero_absent');
    expect(code(() => normaliserCompte(''))).toBe('numero_absent');
    expect(code(() => classeDe('abc'))).toBe('numero_invalide');
    expect(code(() => classeDe('40a'))).toBe('numero_invalide');
  });

  it('classe-8-refusee-au-mvp', () => {
    expect(code(() => verifierCompteMvp('801'))).toBe('classe_8_v1');
    expect(code(() => verifierCompteMvp('8'))).toBe('classe_8_v1');
    expect(code(() => verifierCompteMvp('001'))).toBe('classe_inconnue');
    expect(code(() => verifierCompteMvp('901'))).toBe('classe_inconnue');
    expect(code(() => verifierCompteMvp('40'))).toBe('trop_court');
    expect(code(() => verifierCompteMvp('401'))).toBeUndefined();
    expect(code(() => verifierCompteMvp('101'))).toBeUndefined();
    expect(code(() => verifierCompteMvp('799'))).toBeUndefined();
    expect(classeDe('6064')).toBe(6);
    expect(classeDe('101')).toBe(1);
  });

  it('doublon-par-zeros', () => {
    expect(doublonsProbables(['6064', '606400', '401'])).toEqual([['6064', '606400']]);
    expect(doublonsProbables(['606400', '6064', '60640'])).toEqual([
      ['6064', '60640'],
      ['6064', '606400'],
      ['60640', '606400'],
    ]);
    expect(doublonsProbables(['6064', '6064'])).toEqual([]);
  });

  it('pas-de-doublon-si-chiffre-different', () => {
    expect(doublonsProbables(['6064', '606410'])).toEqual([]);
    expect(doublonsProbables(['6064', '606040'])).toEqual([]);
    expect(doublonsProbables(['6064', '5064'])).toEqual([]);
  });
});
