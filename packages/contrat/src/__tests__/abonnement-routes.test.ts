import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { contrat } from '../routes.js';
import { ErreurEtatAcces } from '../domaines/acces.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Doc = { paths: Record<string, Record<string, { operationId: string; tags?: string[]; responses: Record<string, unknown> }>> };
const doc = genererOpenapi() as Doc;
const routes = Object.entries(contrat.abonnement);
const interne = (r: unknown) =>
  (r as { '~orpc': { route: { tags?: string[] }; outputSchema: z.ZodType } })['~orpc'];

function cles(j: unknown, acc: string[] = []): string[] {
  if (Array.isArray(j)) j.forEach((x) => cles(x, acc));
  else if (j && typeof j === 'object') {
    for (const [k, v] of Object.entries(j)) {
      acc.push(k);
      cles(v, acc);
    }
  }
  return acc;
}

describe('contrat abonnement', () => {
  it('abonnement-routes-dans-openapi', () => {
    expect(doc.paths['/acces']?.['get']?.operationId).toBe('lireAcces');
    expect(doc.paths['/volume']?.['get']?.operationId).toBe('lireVolume');
    const post = doc.paths['/abonnement/demandes-palier']?.['post'];
    expect(post?.operationId).toBe('demanderPalier');
    expect(Object.keys(post!.responses).sort()).toEqual(['201', '404', '422']);
    expect(Object.keys(contrat.abonnement).sort()).toEqual(['demanderPalier', 'lireAcces', 'lireVolume']);
  });

  it('post-avec-idempotency-key', () => {
    expect(routesEcritureSansEnTete()).toEqual([]);
    const sans = interne(contrat.abonnement.demanderPalier);
    expect(sans).toBeDefined();
    const p = doc.paths['/abonnement/demandes-palier']!['post'] as unknown as { parameters: Array<{ name: string }> };
    expect(p.parameters.map((x) => x.name)).toContain('Idempotency-Key');
  });

  it('chaque-route-abonnement-a-une-etiquette-acces', () => {
    const valides = ['acces:lecture', 'acces:export', 'acces:ecriture', 'acces:agent', 'acces:compte'];
    expect(routes).toHaveLength(3);
    for (const [, r] of routes) {
      const t = interne(r).route.tags ?? [];
      expect(t.filter((x) => x.startsWith('acces:'))).toHaveLength(1);
      expect(valides).toContain(t[0]);
    }
    expect(interne(contrat.abonnement.lireVolume).route.tags).toEqual(['acces:lecture']);
    expect(interne(contrat.abonnement.lireAcces).route.tags).toEqual(['acces:compte']);
    expect(doc.paths['/volume']!['get']!.tags).toEqual(['acces:lecture']);
  });

  it('aucun-champ-montant-prix-cout', () => {
    const schemas = [...routes.map(([, r]) => interne(r).outputSchema), ErreurEtatAcces];
    const toutes = schemas.flatMap((s) => cles((z.toJSONSchema(s) as { properties?: unknown }).properties));
    expect(toutes).toContain('pieces_traitees');
    expect(toutes.length).toBeGreaterThan(20);
    for (const k of toutes) expect(k).not.toMatch(/montant|prix|cout|tarif/i);
  });

  it('cles-existantes-inchangees', () => {
    expect(Object.keys(contrat.ecritures).sort()).toEqual(['creer', 'lister', 'modifier']);
    expect(contrat.plan).toBeDefined();
    expect(contrat.tiers).toBeDefined();
    expect(Object.keys(contrat).sort()).toEqual(['abonnement', 'ecritures', 'plan', 'tiers']);
  });
});
