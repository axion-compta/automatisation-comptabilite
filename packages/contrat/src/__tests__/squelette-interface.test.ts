import { describe, expect, it } from 'vitest';
import { contrat } from '../routes.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const SEPT = ['tableauDeBord', 'alertes', 'preferences', 'recherche', 'exports', 'calendrier', 'notifications'] as const;

describe('squelette du lot 15', () => {
  it('sept-domaines-presents', () => {
    const c = contrat as Record<string, unknown>;
    for (const nom of SEPT) {
      expect(Object.keys(c)).toContain(nom);
      expect(c[nom]).toEqual({});
    }
  });

  it('squelette-sept-domaines-branches', () => {
    expect(routesEcritureSansEnTete()).toEqual([]);
    const chemins = Object.keys((genererOpenapi() as { paths: Record<string, unknown> }).paths);
    for (const origine of ['/ecritures', '/ecritures/{id}', '/exercices', '/exercices/{exercice}/plan', '/tiers']) expect(chemins).toContain(origine);
    for (const nom of SEPT) expect(contrat[nom]).toBeDefined();
  });

  it('anciens-domaines-intacts', () => {
    expect(Object.keys(contrat.ecritures).sort()).toEqual(['creer', 'lister', 'modifier']);
    expect(Object.keys(contrat.plan).length).toBeGreaterThan(0);
    expect(Object.keys(contrat.tiers)).toEqual(['listerTiers']);
  });
});
