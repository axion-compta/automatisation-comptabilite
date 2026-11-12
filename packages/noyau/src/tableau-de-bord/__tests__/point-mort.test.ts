import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, StatutEcriture } from '../../ecritures/modele.js';
import { calculerPointMort, type ClassesPointMort } from '../point-mort.js';

const CLASSES: ClassesPointMort = {
  ca: { prefixes: ['91'], deduire: ['919'] },
  fixes: ['92'],
  variables: ['93'],
};
const P = { debut: '2026-01-01', fin: '2026-12-31' };
const ecr = (id: string, d: string, c: string, montant: number, statut: StatutEcriture = 'valide'): Ecriture => ({
  id, date: '2026-04-01', statut, journal: 'OD',
  lignes: [
    { compte: d, libelle: 'x', debit: centimes(montant), credit: centimes(0) },
    { compte: c, libelle: 'x', debit: centimes(0), credit: centimes(montant) },
  ],
});

describe('point mort', () => {
  it('point-mort-recalcule-depuis-les-ecritures', () => {
    // CA 100 000,00 ; variables 40 000,00 ; fixes 30 000,00 : marge 60 %, point mort 50 000,00.
    const l = [ecr('a', '94', '911', 10000000), ecr('b', '931', '94', 4000000), ecr('c', '921', '94', 3000000)];
    const r = calculerPointMort(l, P, CLASSES);
    expect(r.pointMort).toBe(5000000);
    expect(r.tauxMarge).toBe(6000);
    expect(r.mot).toBe('estimation');
    const plus = [...l, ecr('d', '921', '94', 600000), ecr('e', '921', '94', 999999, 'brouillon'),
      { ...ecr('f', '921', '94', 999999), date: '2027-01-02' }];
    expect(calculerPointMort(plus, P, CLASSES).pointMort).toBe(6000000);
    const deduit = [...l, ecr('g', '919', '94', 2000000)];
    expect(calculerPointMort(deduit, P, CLASSES).pointMort).toBe(6000000);
  });

  it('marge-nulle-point-mort-impossible', () => {
    const nulle = [ecr('a', '94', '911', 1000000), ecr('b', '931', '94', 1000000), ecr('c', '921', '94', 100)];
    const r = calculerPointMort(nulle, P, CLASSES);
    expect(r.statut).toBe('impossible');
    expect(r.pointMort).toBeNull();
    const negative = [ecr('a', '94', '911', 1000000), ecr('b', '931', '94', 1500000)];
    expect(calculerPointMort(negative, P, CLASSES).statut).toBe('impossible');
    expect(calculerPointMort([ecr('c', '921', '94', 100)], P, CLASSES).statut).toBe('impossible');
  });

  it('exercice-sans-ecriture-vide', () => {
    const r = calculerPointMort([], P, CLASSES);
    expect(r.statut).toBe('vide');
    expect(r.pointMort).toBeNull();
    expect(r.mot).toBe('estimation');
    const hors = calculerPointMort([{ ...ecr('a', '94', '911', 100), date: '2025-12-31' }], P, CLASSES);
    expect(hors.statut).toBe('vide');
  });
});
