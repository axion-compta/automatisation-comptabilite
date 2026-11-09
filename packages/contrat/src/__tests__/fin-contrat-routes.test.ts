import { describe, expect, it } from 'vitest';
import { contrat } from '../routes.js';
import { MotifGel } from '../domaines/fin-contrat.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Op = { operationId: string; tags?: string[]; responses: Record<string, unknown>; parameters?: Array<{ name: string }> };
const doc = genererOpenapi() as { paths: Record<string, Record<string, Op>> };
const domaines = { finContrat: contrat.finContrat, acceptations: contrat.acceptations };
const toutes = [...Object.values(contrat.finContrat), ...Object.values(contrat.acceptations)];
const interne = (r: unknown) =>
  (r as { '~orpc': { route: { tags?: string[] }; errorMap: Record<string, { status: number }>; inputSchema: { safeParse: (v: unknown) => { success: boolean } } } })['~orpc'];
const statuts = (r: unknown) => Object.fromEntries(Object.entries(interne(r).errorMap).map(([k, v]) => [k, v.status]));

describe('contrat fin de contrat et acceptations', () => {
  it('fin-contrat-et-acceptations-dans-openapi', () => {
    const attendu: Array<[string, string, string]> = [
      ['/fin-contrat', 'get', 'lireFinContrat'],
      ['/fin-contrat/accuse', 'post', 'accuserReception'],
      ['/fin-contrat/gel', 'post', 'poserGel'],
      ['/fin-contrat/gel/levee', 'post', 'leverGel'],
      ['/documents-contractuels/a-accepter', 'get', 'listerDocumentsAAccepter'],
      ['/acceptations', 'post', 'enregistrerAcceptation'],
    ];
    for (const [chemin, methode, id] of attendu) expect(doc.paths[chemin]?.[methode]?.operationId).toBe(id);
    expect(Object.keys(doc.paths['/acceptations']!['post']!.responses)).toContain('201');
    expect(statuts(contrat.finContrat.accuserReception)).toEqual({ PAS_DE_REMISE: 409, DEJA_ACCUSE: 409, EMPREINTE_DIFFERENTE: 422 });
    expect(statuts(contrat.finContrat.poserGel)).toEqual({ GEL_DEJA_ACTIF: 409 });
    expect(statuts(contrat.finContrat.leverGel)).toEqual({ GEL_INACTIF: 409 });
    expect(statuts(contrat.acceptations.enregistrerAcceptation)).toEqual({ VERSION_PERIMEE: 409, DOCUMENT_ABSENT: 404 });
    expect(Object.keys(domaines.finContrat).sort()).toEqual(['accuserReception', 'leverGel', 'lireFinContrat', 'poserGel']);
    expect(Object.keys(domaines.acceptations).sort()).toEqual(['enregistrerAcceptation', 'listerDocumentsAAccepter']);
  });

  it('post-avec-idempotency-key', () => {
    expect(routesEcritureSansEnTete()).toEqual([]);
    for (const chemin of ['/fin-contrat/accuse', '/fin-contrat/gel', '/fin-contrat/gel/levee', '/acceptations']) {
      expect(doc.paths[chemin]!['post']!.parameters!.map((p) => p.name)).toContain('Idempotency-Key');
    }
  });

  it('motif-vide-ou-blanc-refuse-par-le-schema', () => {
    for (const motif of ['', '   ', 'x'.repeat(501)]) expect(MotifGel.safeParse({ motif }).success).toBe(false);
    expect(MotifGel.safeParse({}).success).toBe(false);
    expect(MotifGel.parse({ motif: '  litige  ' }).motif).toBe('litige');
    expect(MotifGel.safeParse({ motif: 'x'.repeat(500) }).success).toBe(true);
  });

  it('etiquette-acces-compte-partout', () => {
    expect(toutes).toHaveLength(6);
    for (const r of toutes) expect(interne(r).route.tags).toEqual(['acces:compte']);
    for (const chemin of ['/fin-contrat', '/fin-contrat/gel', '/acceptations']) {
      for (const op of Object.values(doc.paths[chemin]!)) expect(op.tags).toEqual(['acces:compte']);
    }
  });

  it('version-non-entiere-refusee-400', () => {
    const entree = interne(contrat.acceptations.enregistrerAcceptation).inputSchema;
    const headers = { 'idempotency-key': 'cle-acceptation-1' };
    expect(entree.safeParse({ headers, body: { type: 'cgv', version: 2 } }).success).toBe(true);
    for (const version of [0, -1, 1.5, '2', NaN, Infinity]) {
      expect(entree.safeParse({ headers, body: { type: 'cgv', version } }).success).toBe(false);
    }
  });
});
