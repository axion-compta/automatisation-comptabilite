import { describe, expect, it } from 'vitest';
import { oc } from '@orpc/contract';
import { classeDe, classesDesRoutes } from '../domaines/classes.js';
import { contrat, contratChat } from '../routes.js';
import { CLASSES_ACTION } from '../../../noyau/src/abonnement/types.js';

const route = (method: 'GET' | 'POST' | 'PUT', path: `/${string}`, tags?: string[]) => oc.route({ method, path, operationId: 'op' + path, ...(tags ? { tags } : {}) });

describe('classes des routes', () => {
  it('classe-par-defaut-get-lecture-autres-ecriture', () => {
    const l = classesDesRoutes({ a: { b: route('GET', '/a'), c: route('POST', '/c'), d: route('PUT', '/d/{id}') } });
    expect(l.map((r) => r.classe)).toEqual(['lecture', 'ecriture', 'ecriture']);
    expect(classesDesRoutes({ x: route('POST', '/x', ['acces:export', 'autre']) })[0]?.classe).toBe('export');
    expect(classeDe(l, 'DELETE', '/inconnu')).toBe('ecriture');
    expect(classeDe(l, 'GET', '/inconnu')).toBe('ecriture');
  });

  it('etiquette-double-ou-inconnue-refusee', () => {
    expect(() => classesDesRoutes({ x: route('GET', '/x', ['acces:lecture', 'acces:export']) })).toThrow();
    expect(() => classesDesRoutes({ x: route('GET', '/x', ['acces:inconnue']) })).toThrow();
    expect(() => classesDesRoutes({ x: route('GET', '/x', ['acces:']) })).toThrow();
  });

  it('parametre-de-chemin-reconnu', () => {
    const l = classesDesRoutes({ x: route('GET', '/e/{id}/lignes', ['acces:export']) });
    expect(classeDe(l, 'get', '/e/42/lignes')).toBe('export');
    expect(classeDe(l, 'GET', '/e/42/autre')).toBe('ecriture');
    expect(classeDe(l, 'GET', '/e/lignes')).toBe('ecriture');
    expect(classeDe(l, 'POST', '/e/42/lignes')).toBe('ecriture');
  });

  it('aucune-route-sans-classe', () => {
    const l = classesDesRoutes({ contrat, contratChat });
    expect(l.length).toBeGreaterThan(50);
    for (const r of l) {
      expect(CLASSES_ACTION).toContain(r.classe);
      expect(r.chemin.startsWith('/')).toBe(true);
    }
    expect(classeDe(l, 'GET', '/acces')).toBe('compte');
    expect(classeDe(l, 'POST', '/exports')).toBe('export');
    expect(classeDe(l, 'POST', '/ecritures')).toBe('ecriture');
  });
});
