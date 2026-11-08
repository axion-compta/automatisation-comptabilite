import { describe, expect, it } from 'vitest';
import { cheminSociete, PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';

const erreur = (f: () => unknown) => {
  try { f(); } catch (e) { return (e as Error).message; }
  return 'aucune';
};

describe('prefixe-routes', () => {
  it('prefixe-par-defaut', () => {
    expect(PREFIXE_ROUTES_SOCIETE).toBe('/api/compta/v1/societes/{s}');
  });
  it('chemin-societe-concatene', () => {
    expect(cheminSociete('/ecritures')).toBe('/api/compta/v1/societes/{s}/ecritures');
    expect(cheminSociete('/')).toBe('/api/compta/v1/societes/{s}/');
  });
  it('suffixe-sans-barre-refuse', () => {
    for (const s of ['', 'ecritures', ' /x']) expect(erreur(() => cheminSociete(s))).toBe('suffixe_invalide');
    expect(erreur(() => cheminSociete(1 as never))).toBe('suffixe_invalide');
  });
  it('suffixe-avec-points-refuse', () => {
    for (const s of ['/../x', '/a/..', '//x', '/a//b', '/..']) expect(erreur(() => cheminSociete(s))).toBe('suffixe_invalide');
    expect(erreur(() => cheminSociete('/a..b'))).toBe('suffixe_invalide');
  });
});
