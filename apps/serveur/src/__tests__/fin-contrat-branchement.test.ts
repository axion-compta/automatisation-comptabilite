import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : branchement fin de contrat et acceptations', () => {
  it('six-routes-branchees', async () => {
    const a = creerApp(undefined, { abonnement: { scenario: null } });
    apps.push(a);
    const h = { 'idempotency-key': 'cle-fin-contrat-1', 'content-type': 'application/json' };
    const empreinte = 'a'.repeat(64);
    const appels = [
      { method: 'GET', url: '/fin-contrat' },
      { method: 'POST', url: '/fin-contrat/accuse', headers: h, payload: { manifeste_empreinte: empreinte } },
      { method: 'POST', url: '/fin-contrat/gel', headers: h, payload: { motif: 'litige' } },
      { method: 'POST', url: '/fin-contrat/gel/levee', headers: h, payload: { motif: 'litige clos' } },
      { method: 'GET', url: '/documents-contractuels/a-accepter' },
      { method: 'POST', url: '/acceptations', headers: h, payload: { type: 'cgv', version: 1 } },
    ] as const;
    for (const req of appels) {
      const r = await a.inject({ ...req, headers: 'headers' in req ? { ...req.headers } : undefined });
      expect(r.statusCode, req.url).not.toBe(404);
    }
    expect((await a.inject({ method: 'GET', url: '/tiers' })).statusCode).toBe(200);
  });

  it('version-non-entiere-refusee-400', async () => {
    const a = creerApp();
    apps.push(a);
    const headers = { 'idempotency-key': 'cle-acceptation-1', 'content-type': 'application/json' };
    for (const version of [0, -1, 1.5, '2']) {
      const r = await a.inject({ method: 'POST', url: '/acceptations', headers, payload: { type: 'cgv', version } });
      expect(r.statusCode, String(version)).toBe(400);
    }
  });
});
