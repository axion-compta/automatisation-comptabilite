import { describe, expect, it } from 'vitest';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Op = { operationId: string; parameters: Array<{ name: string; in: string }>; responses: Record<string, { content?: Record<string, unknown> }> };
const paths = (genererOpenapi() as { paths: Record<string, Record<string, Op>> }).paths;

describe('contrat du chat', () => {
  it('openapi-contient-les-routes', () => {
    const envoi = paths['/chat/messages']?.['post'];
    expect(envoi?.operationId).toBe('posterMessageChat');
    expect(envoi?.parameters.some((p) => p.name === 'Idempotency-Key' && p.in === 'header')).toBe(true);
    expect(Object.keys(envoi?.responses['200']?.content ?? {})).toEqual(['text/event-stream']);
    const arret = paths['/chat/tours/{id}/arreter']?.['post'];
    expect(arret?.operationId).toBe('arreterTour');
    expect(arret?.parameters.some((p) => p.name === 'id' && p.in === 'path')).toBe(true);
    expect(arret?.responses['404']).toBeDefined();
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
