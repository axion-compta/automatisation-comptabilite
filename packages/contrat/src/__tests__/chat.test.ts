import { describe, expect, it } from 'vitest';
import { cheminSociete } from '../prefixe-routes.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Op = { operationId: string; parameters: Array<{ name: string; in: string }>; responses: Record<string, { content?: Record<string, unknown> }> };
const paths = (genererOpenapi() as { paths: Record<string, Record<string, Op>> }).paths;

describe('contrat du chat', () => {
  it('openapi-contient-les-routes', () => {
    const envoi = paths[cheminSociete('/chat/messages')]?.['post'];
    expect(envoi?.operationId).toBe('posterMessageChat');
    expect(envoi?.parameters.some((p) => p.name === 'Idempotency-Key' && p.in === 'header')).toBe(true);
    expect(Object.keys(envoi?.responses['200']?.content ?? {})).toEqual(['text/event-stream']);
    const arret = paths[cheminSociete('/chat/tours/{id}/arreter')]?.['post'];
    expect(arret?.operationId).toBe('arreterTour');
    expect(arret?.parameters.some((p) => p.name === 'id' && p.in === 'path')).toBe(true);
    expect(arret?.responses['404']).toBeDefined();
    expect(routesEcritureSansEnTete()).toEqual([]);
  });

  it('chat-sous-le-prefixe', () => {
    const attendus = ['/chat/messages', '/chat/tours/{id}/arreter', '/chat/propositions/{id}', '/chat/propositions/{id}/appliquer', '/chat/propositions/{id}/annuler', '/chat/propositions/{id}/pourquoi'].map(cheminSociete);
    const chat = Object.keys(paths).filter((c) => c.includes('/chat/'));
    expect([...chat].sort()).toEqual([...attendus].sort());
    expect(chat.flatMap((c) => Object.values(paths[c] ?? {})).map((o) => o.operationId).sort()).toEqual(['annulerProposition', 'appliquerProposition', 'arreterTour', 'lireProposition', 'posterMessageChat', 'pourquoiProposition']);
    expect(Object.keys(paths).some((c) => c.startsWith('/chat/'))).toBe(false);
  });
});
