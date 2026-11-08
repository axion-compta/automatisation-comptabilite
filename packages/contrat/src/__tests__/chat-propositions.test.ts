import { describe, expect, it } from 'vitest';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Op = { operationId: string; parameters: Array<{ name: string; in: string }>; responses: Record<string, unknown> };
const paths = (genererOpenapi() as { paths: Record<string, Record<string, Op>> }).paths;
const op = (chemin: string, m: string) => paths[`/chat/propositions/{id}${chemin}`]?.[m];

describe('contrat des propositions du chat', () => {
  it('openapi-routes-cles-et-erreurs', () => {
    expect([op('', 'get'), op('/pourquoi', 'get'), op('/appliquer', 'post'), op('/annuler', 'post')].map((o) => o?.operationId)).toEqual(['lireProposition', 'pourquoiProposition', 'appliquerProposition', 'annulerProposition']);
    for (const o of [op('/appliquer', 'post'), op('/annuler', 'post')]) expect(o?.parameters.some((p) => p.name === 'Idempotency-Key')).toBe(true);
    expect(Object.keys(op('/appliquer', 'post')?.responses ?? {})).toEqual(expect.arrayContaining(['403', '404', '409', '423']));
    expect(Object.keys(op('/annuler', 'post')?.responses ?? {})).toEqual(expect.arrayContaining(['404', '409']));
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
