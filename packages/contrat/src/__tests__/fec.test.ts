import { describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerRouteur } from '../../../../apps/serveur/src/app.js';
import { genererDeclarations } from '../../../donnees-fictives/src/declarations.js';
import { creerServiceFec } from '../domaines/fec-service.js';
import { creerServiceControles } from '../domaines/controles-service.js';
import { ReponseFec, ReponseHistoriqueFec } from '../domaines/fec.js';
import { ReponseTraces, type TraceControle } from '../domaines/controles.js';
import { genererOpenapi } from '../openapi.js';

const jeu = genererDeclarations();
const r = creerRouteur();
const rejet = (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string }) => e.code);
type Hist = { body: Array<{ id: string; version: number; statut: string; telechargementAutorise: boolean; mention: string }> };
const hist = (exercice: string) => call(r.fec.listerHistoriqueFec, { params: { exercice } }) as Promise<Hist>;
type Traces = { body: TraceControle[]; decalage: number; total: number };
const traces = (exercice: string, query?: { resultat?: TraceControle['resultat']; limite?: number; decalage?: number }) =>
  call(r.controles.listerTraces, { params: { exercice }, ...(query ? { query } : {}) }) as Promise<Traces>;
const trace = (o: Partial<TraceControle>): TraceControle => ({ regleId: 'R', gravite: 'I', objetType: 'ecriture', objetId: 'O', resultat: 'OK', valeur: null, ecartCentimes: null, horodatage: '2026-03-01T00:00:00Z', ...o });

describe('fec et contrôles en lecture', () => {
  it('historique-trie-par-version', async () => {
    const h = await hist('EX2025');
    expect(h.body.map((f) => f.version)).toEqual([2, 1]);
    expect(ReponseHistoriqueFec.safeParse(h).success).toBe(true);
    expect(h.body.every((f) => f.mention === 'prepare_par_ia')).toBe(true);
    const inverse = creerServiceFec({ ...jeu, fec: [...jeu.fec].reverse() });
    expect(inverse.historique('EX2025')?.map((f) => f.version)).toEqual([2, 1]);
    // exercice connu sans FEC : liste vide ; exercice inconnu : 404 ; identifiant vide : 400
    expect(creerServiceFec({ ...jeu, fec: [] }).historique('EX2025')).toEqual([]);
    expect(creerServiceFec(genererDeclarations(undefined, 'vide')).historique('EX2025')).toBeUndefined();
    expect(await rejet(hist('EX0000'))).toBe('EXERCICE_INCONNU');
    expect(await rejet(hist(''))).toBe('BAD_REQUEST');
  });

  it('remplace-visible-dans-l-historique', async () => {
    const h = await hist('EX2025');
    expect(h.body.map((f) => f.statut)).toEqual(['definitif', 'remplace']);
    const remplace = (await call(r.fec.lireFec, { params: { fec: 'FEC002' } })) as { body: Record<string, unknown> };
    expect(remplace.body).toMatchObject({ statut: 'remplace', resultatControles: 'ecarts', telechargementAutorise: false });
    expect(ReponseFec.safeParse(remplace).success).toBe(true);
    expect((remplace.body['controles'] as Array<{ nombreEcarts: number }>).some((c) => c.nombreEcarts > 0)).toBe(true);
    expect(await rejet(call(r.fec.lireFec, { params: { fec: 'FEC000' } }))).toBe('FEC_INCONNU');
    expect(await rejet(call(r.fec.lireFec, { params: { fec: '' } }))).toBe('BAD_REQUEST');
  });

  it('fec-travail-telechargement-interdit', async () => {
    const travail = ((await hist('EX2026')).body)[0]!;
    expect([travail.statut, travail.telechargementAutorise]).toEqual(['travail', false]);
    expect(((await hist('EX2025')).body).filter((f) => f.telechargementAutorise).map((f) => f.statut)).toEqual(['definitif']);
    expect(ReponseFec.safeParse({ body: { ...travail, mention: 'autre' } }).success).toBe(false);
    expect(ReponseFec.safeParse({ body: { ...travail, sha256: 'xyz' } }).success).toBe(false);
  });

  it('traces-non-ok-d-abord', async () => {
    const t = await traces('EX2026');
    expect(t.body.map((x) => x.resultat)).toEqual(['ALERTE', 'OK', 'OK']);
    expect(t.body.slice(1).map((x) => x.horodatage)).toEqual(['2026-02-02T10:00:00Z', '2026-02-01T10:00:00Z']);
    expect(ReponseTraces.safeParse(t).success).toBe(true);
    // IMPOSSIBLE et ECARTE restent avant tout OK, gravité B, M, m, I puis horodatage décroissant
    const s = creerServiceControles(jeu, [
      trace({ regleId: 'a', resultat: 'IMPOSSIBLE', gravite: 'm', horodatage: '2026-05-01T00:00:00Z' }),
      trace({ regleId: 'b', resultat: 'ECARTE', gravite: 'M', horodatage: '2026-04-01T00:00:00Z' }),
      trace({ regleId: 'c', resultat: 'ALERTE', gravite: 'B', horodatage: '2026-01-01T00:00:00Z' }),
      trace({ regleId: 'd', resultat: 'ALERTE', gravite: 'I', horodatage: '2026-06-01T00:00:00Z' }),
      trace({ regleId: 'e', resultat: 'OK', gravite: 'B', horodatage: '2026-12-01T00:00:00Z' }),
    ]).lister('EX2026')!;
    expect(s.body.slice(0, 6).map((x) => x.regleId)).toEqual(['CTL_B', 'c', 'b', 'a', 'd', 'e']);
    expect(s.total).toBe(8);
    const page = await traces('EX2026', { limite: 1, decalage: 1 });
    expect([page.body.length, page.decalage, page.total]).toEqual([1, 1, 3]);
    expect((await traces('EX2026', { decalage: 50 })).body).toEqual([]);
    expect((await traces('EX2025')).total).toBe(0);
    expect(await rejet(traces('EX0000'))).toBe('EXERCICE_INCONNU');
  });

  it('filtre-par-resultat', async () => {
    expect((await traces('EX2026', { resultat: 'ALERTE' })).body.map((x) => x.regleId)).toEqual(['CTL_B']);
    expect((await traces('EX2026', { resultat: 'OK' })).total).toBe(2);
    expect((await traces('EX2026', { resultat: 'IMPOSSIBLE' })).body).toEqual([]);
    for (const query of [{ resultat: 'ok' }, { resultat: 'INCONNU' }, { limite: 0 }, { limite: 101 }, { limite: 1.5 }, { limite: Number.NaN }, { decalage: -1 }]) {
      expect(await rejet(traces('EX2026', query as never)), JSON.stringify(query)).toBe('BAD_REQUEST');
    }
  });

  it('openapi-contient-fec-et-controles', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId: string; responses: Record<string, unknown> }>> };
    const op = (c: string) => doc.paths[c]?.['get'];
    expect(op('/exercices/{exercice}/fec/historique')?.operationId).toBe('listerHistoriqueFec');
    expect(op('/fec/{fec}')?.operationId).toBe('lireFec');
    expect(op('/exercices/{exercice}/controles')?.operationId).toBe('listerTraces');
    expect(Object.keys(op('/fec/{fec}')?.responses ?? {})).toContain('404');
    expect(Object.entries(doc.paths).filter(([c]) => c.includes('/fec') || c.endsWith('/controles')).flatMap(([, ops]) => Object.keys(ops))).toEqual(['get', 'get', 'get']);
  });
});
