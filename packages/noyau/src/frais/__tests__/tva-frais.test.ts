import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { cleParametreTva, traiterTvaFrais, type EntreeTvaFrais, type ParametreTva } from '../tva-frais.js';
import { ErreurFrais } from '../types.js';

const valide = (partPointsDeBase: number): ParametreTva => ({ statut: 'valide', partPointsDeBase });
const entree = (surcharge: Partial<EntreeTvaFrais> = {}): EntreeTvaFrais => ({
  nature: 'repas_affaires',
  tvaLue: centimes(1001),
  ticketAuNomDeLaPersonne: false,
  justificatifPerdu: false,
  estIk: false,
  ...surcharge,
});
const NUL = { deductible: 0, bloquePreparationTva: false };

describe('traiterTvaFrais', () => {
  it('ik-sans-tva', () => {
    const r = traiterTvaFrais(entree({ estIk: true, justificatifPerdu: true }), valide(7000));
    expect(r).toEqual({ code: 'AUCUNE', ...NUL, nonDeductible: 0 });
  });

  it('perdu-sans-piece-zero', () => {
    const r = traiterTvaFrais(entree({ justificatifPerdu: true, ticketAuNomDeLaPersonne: true }), valide(7000));
    expect(r).toEqual({ code: 'SANS_PIECE', ...NUL, nonDeductible: 1001 });
  });

  it('nom-de-la-personne', () => {
    const r = traiterTvaFrais(entree({ ticketAuNomDeLaPersonne: true }), undefined);
    expect(r).toEqual({ code: 'NON_DEDUCTIBLE_NOM', ...NUL, nonDeductible: 1001 });
  });

  it('nf20-parametre-a-verifier-bloque', () => {
    for (const statut of ['a_verifier', 'non_verifie'] as const) {
      const r = traiterTvaFrais(entree(), { statut, partPointsDeBase: 7000 });
      expect(r).toEqual({ code: 'A_VERIFIER', deductible: 0, nonDeductible: 1001, bloquePreparationTva: true });
    }
  });

  it('parametre-absent-bloque', () => {
    const r = traiterTvaFrais(entree(), undefined);
    expect(r.code).toBe('A_VERIFIER');
    expect(r.bloquePreparationTva).toBe(true);
    expect(r.deductible).toBe(0);
  });

  it('parametre-retire-bloque', () => {
    const r = traiterTvaFrais(entree(), { statut: 'retire', partPointsDeBase: 7000 });
    expect(r.code).toBe('A_VERIFIER');
    expect(r.bloquePreparationTva).toBe(true);
  });

  it('part-totale-deductible', () => {
    const r = traiterTvaFrais(entree(), valide(10000));
    expect(r).toEqual({ code: 'DEDUCTIBLE', deductible: 1001, nonDeductible: 0, bloquePreparationTva: false });
  });

  it('part-nulle-non-deductible', () => {
    const r = traiterTvaFrais(entree(), valide(0));
    expect(r).toEqual({ code: 'NON_DEDUCTIBLE', deductible: 0, nonDeductible: 1001, bloquePreparationTva: false });
  });

  it('part-partielle-somme-exacte', () => {
    for (const tva of [0, 1, 3, 999, 1001, 123457]) {
      const r = traiterTvaFrais(entree({ tvaLue: centimes(tva) }), valide(7000));
      expect(r.deductible + r.nonDeductible).toBe(tva);
      expect(r.bloquePreparationTva).toBe(false);
    }
    const r = traiterTvaFrais(entree(), valide(7000));
    expect(r).toEqual({ code: 'PARTIELLE', deductible: 701, nonDeductible: 300, bloquePreparationTva: false });
  });

  it('entrees-invalides', () => {
    const invalides = [Number.NaN, Number.POSITIVE_INFINITY, Number('1.5'), -1];
    for (const v of invalides) {
      expect(() => traiterTvaFrais(entree({ tvaLue: v as never }), valide(7000))).toThrow(ErreurFrais);
      expect(() => traiterTvaFrais(entree({ estIk: true, tvaLue: v as never }), undefined)).toThrow(ErreurFrais);
    }
    for (const part of [-1, 10001, Number.NaN, Number('2.5')]) {
      expect(() => traiterTvaFrais(entree(), valide(part))).toThrow(ErreurFrais);
    }
    try {
      traiterTvaFrais(entree(), valide(-1));
    } catch (e) {
      expect((e as ErreurFrais).code).toBe('entree_invalide');
    }
  });
});

describe('cleParametreTva', () => {
  it('associe les natures connues et ignore les autres', () => {
    expect(cleParametreTva('repas_affaires')).toBe('tva.repas_affaires');
    expect(cleParametreTva('vehicule_personnel')).toBe('tva.vehicule_personnel');
    expect(cleParametreTva('parking')).toBeUndefined();
    expect(cleParametreTva('constructor')).toBeUndefined();
  });
});
