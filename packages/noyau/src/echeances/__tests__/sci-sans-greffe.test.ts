import { describe, expect, it } from 'vitest';
import { type TypeEcheance, echeancesDe } from '../catalogue.js';

// Catalogue INVENTÉ : une échéance de greffe (sociétés commerciales) et une déclaration propre à la SCI.
const base: TypeEcheance = {
  code: 'x', ancrage: 'cloture', decalage: { mois: 6, jours: 0 }, report: 'suivant', condition: {},
  statutSource: 'verifie', niveau: 'preparee', rappelsJours: [], legale: true,
};
const CATALOGUE: TypeEcheance[] = [
  { ...base, code: 'depot_greffe', condition: { formes: ['EURL', 'SARL', 'SASU', 'SAS'] } },
  { ...base, code: 'declaration_revenus_fonciers', condition: { formes: ['SCI'] } },
];
const codes = (forme: string) =>
  echeancesDe(CATALOGUE, { forme, avecSalaries: false, avecVehicule: false }, { clotures: ['2026-12-31'], anneesCiviles: [], finsDePeriode: [] }, { joursNonOuvres: [6, 7], feries: [] }).map((e) => e.code);

describe('SCI sans échéance de greffe', () => {
  it('sci-aucune-echeance-de-greffe', () => {
    expect(codes('SCI')).toEqual(['declaration_revenus_fonciers']);
    expect(codes('SARL')).toContain('depot_greffe');
  });
});
