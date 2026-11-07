import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import {
  alerte,
  entierParametre,
  ErreurControle,
  exigerCentimes,
  ok,
  parametreUtilisable,
  type ParametreLu,
} from '../commun.js';

const param = (valeur: string | null, statut: ParametreLu['statut'] = 'valide'): ParametreLu => ({
  cle: 'cle.fictive',
  valeur,
  statut,
});
const code = (f: () => unknown): unknown => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurControle ? e.code : 'autre';
  }
  return 'aucune';
};

describe('commun du lot 12', () => {
  it('parametre-valide-utilisable', () => {
    expect(parametreUtilisable(param('12'))).toBe(true);
    expect(entierParametre(param('12'))).toBe(12);
    expect(entierParametre(param('-3'))).toBe(-3);
    expect(entierParametre(param('0'))).toBe(0);
  });

  it('parametre-a-verifier-inutilisable', () => {
    for (const s of ['a_verifier', 'non_verifie', 'absent'] as const) {
      expect(parametreUtilisable(param('12', s))).toBe(false);
      expect(code(() => entierParametre(param('12', s)))).toBe('parametre_absent');
    }
  });

  it('parametre-sans-valeur-inutilisable', () => {
    expect(parametreUtilisable(param(null))).toBe(false);
    expect(code(() => entierParametre(param(null)))).toBe('parametre_absent');
  });

  it('entier-parametre-refuse-non-entiers', () => {
    for (const v of ['1.5', 'NaN', '', 'Infinity', '1e3', ' 1', '1 ', '+1', '-', '9007199254740993']) {
      expect(code(() => entierParametre(param(v)))).toBe('parametre_invalide');
    }
  });

  it('exiger-centimes-refuse', () => {
    for (const n of [Number.NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 2]) {
      expect(code(() => exigerCentimes(n))).toBe('entree_invalide');
    }
    expect(exigerCentimes(-150)).toBe(-150);
    expect(exigerCentimes(0)).toBe(0);
    expect(exigerCentimes(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('alerte-porte-l-ecart', () => {
    expect(alerte(centimes(-1))).toEqual({ resultat: 'ALERTE', ecartCentimes: -1 });
    expect(alerte(centimes(0), 'x')).toEqual({ resultat: 'ALERTE', ecartCentimes: 0, valeur: 'x' });
    expect(alerte(undefined, 0)).toEqual({ resultat: 'ALERTE', valeur: 0 });
    expect(alerte()).toEqual({ resultat: 'ALERTE' });
  });

  it('ok-sans-ecart', () => {
    expect(ok()).toEqual({ resultat: 'OK' });
    expect('ecartCentimes' in ok()).toBe(false);
  });

  it('erreur-controle-porte-son-code', () => {
    const e = new ErreurControle('entree_invalide');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('entree_invalide');
  });
});
