import { describe, expect, it } from 'vitest';
import { estGenereParIA, marquerGenereParIA, marquerModifieParPersonne, metaSaisieHumaine } from '../marqueur-ia.js';

const ia = { modele: 'modele-test', version: 'v-essai' };
const refus = { name: 'ErreurSecurite', code: 'argument_invalide' };

describe('securite/marqueur-ia', () => {
  it('marqueur-pose', () => {
    const m = marquerGenereParIA({ objet: 'Relance' }, ia);
    expect(m).toEqual({ objet: 'Relance', genere_par_ia: true, modele: 'modele-test', version: 'v-essai' });
    expect(estGenereParIA(m)).toBe(true);
    expect(estGenereParIA({ objet: 'Relance' })).toBe(false);
    expect(estGenereParIA({})).toBe(false);
  });

  it('modele-vide-refuse', () => {
    for (const mauvais of [{ modele: '', version: 'v1' }, { modele: 'm', version: '' }, { modele: '  ', version: 'v1' }, { modele: 'm', version: '\t' }, { modele: undefined, version: 'v1' }, { modele: 'm', version: 3 }]) {
      expect(() => marquerGenereParIA({}, mauvais as never)).toThrowError(expect.objectContaining(refus));
    }
    expect(() => marquerGenereParIA({}, undefined as never)).toThrowError(expect.objectContaining(refus));
    expect(() => marquerGenereParIA(null as never, ia)).toThrowError(expect.objectContaining(refus));
  });

  it('retouche-garde-le-marqueur', () => {
    const m = marquerModifieParPersonne(marquerGenereParIA({ corps: 'x' }, ia), 'p-1');
    expect(m).toEqual({ corps: 'x', genere_par_ia: true, modele: 'modele-test', version: 'v-essai', modifie_par_personne: true });
    expect(estGenereParIA(m)).toBe(true);
    for (const mauvais of ['', '  ', undefined, 4]) {
      expect(() => marquerModifieParPersonne(marquerGenereParIA({}, ia), mauvais as never)).toThrowError(expect.objectContaining(refus));
    }
    expect(marquerModifieParPersonne({ corps: 'x' }, 'p-1')).toEqual({ corps: 'x' });
  });

  it('saisie-humaine-sans-marqueur', () => {
    const m = metaSaisieHumaine(marquerModifieParPersonne(marquerGenereParIA({ corps: 'x' }, ia), 'p-1'));
    expect(m).toEqual({ corps: 'x' });
    expect(Object.keys(m)).toEqual(['corps']);
    expect(estGenereParIA(m)).toBe(false);
    expect(metaSaisieHumaine({})).toEqual({});
  });

  it('chaine-true-n-est-pas-un-marqueur', () => {
    for (const faux of ['true', 1, 'oui', {}, [], null, undefined, false]) {
      expect(estGenereParIA({ genere_par_ia: faux })).toBe(false);
    }
    expect(estGenereParIA(null as never)).toBe(false);
    expect(estGenereParIA(undefined as never)).toBe(false);
    expect(estGenereParIA({ genere_par_ia: true })).toBe(true);
  });

  it('meta-d-entree-non-modifiee', () => {
    const base = Object.freeze({ a: 1, imbrique: Object.freeze({ b: 2 }) });
    const m1 = marquerGenereParIA(base, ia);
    const m2 = marquerModifieParPersonne(m1, 'p-1');
    const m3 = metaSaisieHumaine(m2);
    expect(base).toEqual({ a: 1, imbrique: { b: 2 } });
    expect(m1).not.toBe(base);
    expect(m2).not.toBe(m1);
    expect(m3).not.toBe(m2);
    expect(m1).not.toHaveProperty('modifie_par_personne');
    expect(m2).toHaveProperty('genere_par_ia', true);
  });

  it('autres-champs-conserves', () => {
    const base = { a: 1, b: null, c: ['x'], d: { e: 'f' }, vide: '' };
    expect(marquerGenereParIA(base, ia)).toMatchObject(base);
    expect(metaSaisieHumaine({ ...base, genere_par_ia: true, modele: 'm', version: 'v', modifie_par_personne: true })).toEqual(base);
    expect(marquerGenereParIA({ modele: 'ancien', version: 'ancienne' }, ia)).toMatchObject(ia);
  });
});
