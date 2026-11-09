import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { personnes } from '../domaines/personnes.js';
import { genererOpenapi } from '../openapi.js';

type Doc = { paths: Record<string, Record<string, { operationId: string; tags?: string[]; parameters?: Array<{ name: string }> }>> };
const doc = genererOpenapi() as Doc;
const interne = (r: unknown) => (r as { '~orpc': { route: { tags?: string[] }; errorMap: Record<string, { status: number }>; inputSchema: z.ZodType } })['~orpc'];

describe('contrat recherche d\'une personne', () => {
  it('recherche-dans-openapi', () => {
    const op = doc.paths['/personnes/recherche']?.['get'];
    expect(op?.operationId).toBe('rechercherPersonne');
    expect(op?.tags).toEqual(['acces:compte']);
    expect(interne(personnes.rechercherPersonne).route.tags).toEqual(['acces:compte']);
    expect((op?.parameters ?? []).map((p) => p.name).sort()).toEqual(['email', 'iban', 'nom']);
  });

  it('erreurs-recherche-422-et-503-declarees', () => {
    const e = interne(personnes.rechercherPersonne).errorMap;
    for (const [c, s] of [['RECHERCHE_VIDE', 422], ['RECHERCHE_TROP_COURTE', 422], ['REGLAGE_ABSENT', 503]] as const) expect(e[c]?.status).toBe(s);
  });
});
