import { describe, expect, it } from 'vitest';
import {
  CODES_BLOC,
  ETATS_ALERTE_ACTIFS,
  GRAVITES,
  estCodeBloc,
  estGravite,
  estVue,
  graviteMax,
  rangGravite,
} from '../types.js';

const intrus: unknown[] = ['', 'URGENT', null, undefined, Number.NaN, 0, {}, [], ['urgent'], { valueOf: () => 'urgent' }];

describe('types transverses du lot 15', () => {
  it('gravites-dans-l-ordre', () => {
    expect([...GRAVITES]).toEqual(['info', 'a_faire', 'urgent', 'bloquant']);
    expect(GRAVITES.map(rangGravite)).toEqual([0, 1, 2, 3]);
  });

  it('gravite-max-symetrique', () => {
    for (const a of GRAVITES) {
      for (const b of GRAVITES) {
        expect(graviteMax(a, b)).toBe(graviteMax(b, a));
        expect(rangGravite(graviteMax(a, b))).toBe(Math.max(rangGravite(a), rangGravite(b)));
      }
    }
    expect(graviteMax('info', 'urgent')).toBe('urgent');
    expect(graviteMax('bloquant', 'a_faire')).toBe('bloquant');
    expect(graviteMax('a_faire', 'a_faire')).toBe('a_faire');
  });

  it('garde-gravite-refuse-le-reste', () => {
    for (const g of GRAVITES) expect(estGravite(g)).toBe(true);
    for (const x of intrus) expect(estGravite(x)).toBe(false);
    expect(estGravite('toString')).toBe(false);
    expect(estGravite('constructor')).toBe(false);
    // Les autres gardes refusent aussi les intrus et se distinguent les unes des autres.
    for (const x of intrus) {
      expect(estCodeBloc(x)).toBe(false);
      expect(estVue(x)).toBe(false);
    }
    expect(estCodeBloc('urgent')).toBe(false);
    expect(estGravite('tresorerie')).toBe(false);
    expect(estVue('tresorerie')).toBe(false);
    expect(estCodeBloc('mois')).toBe(false);
    expect(estVue('mois')).toBe(true);
    expect(estVue('exercice')).toBe(true);
    expect(estVue('depuis_debut')).toBe(true);
    expect(estVue('annee')).toBe(false);
    expect(estCodeBloc('toString')).toBe(false);
    expect(estVue('toString')).toBe(false);
  });

  it('huit-blocs-exactement', () => {
    expect([...CODES_BLOC]).toEqual([
      'tresorerie',
      'argent_entrant_sortant',
      'resultat',
      'creances_dettes',
      'tva_impots',
      'comptes_associes',
      'transactions',
      'a_faire',
    ]);
    expect(CODES_BLOC).toHaveLength(8);
    expect(new Set(CODES_BLOC).size).toBe(8);
    for (const c of CODES_BLOC) expect(estCodeBloc(c)).toBe(true);
  });

  it('listes-gelees', () => {
    expect(Object.isFrozen(CODES_BLOC)).toBe(true);
    expect(Object.isFrozen(GRAVITES)).toBe(true);
    expect(Object.isFrozen(ETATS_ALERTE_ACTIFS)).toBe(true);
  });

  it('etats-actifs', () => {
    expect([...ETATS_ALERTE_ACTIFS]).toEqual(['ouverte', 'reportee']);
  });
});
