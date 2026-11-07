import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = (...a: Parameters<typeof creerApp>) => {
  const x = creerApp(...a);
  apps.push(x);
  return x;
};

describe('serveur : branchement abonnement', () => {
  it('trois-routes-branchees', async () => {
    const a = neuf(undefined, { abonnement: { scenario: null } });
    const cle = { 'idempotency-key': 'cle-abonnement-1', 'content-type': 'application/json' };
    const r1 = await a.inject({ method: 'GET', url: '/acces' });
    const r2 = await a.inject({ method: 'GET', url: '/volume' });
    const r3 = await a.inject({
      method: 'POST',
      url: '/abonnement/demandes-palier',
      headers: cle,
      payload: { code_demande: 'palier-b', accord: true },
    });
    for (const r of [r1, r2, r3]) {
      expect(r.statusCode).not.toBe(404);
      expect(r.statusCode).not.toBe(400);
    }
    // les routes existantes ne sont pas affectées
    expect((await a.inject({ method: 'GET', url: '/tiers' })).statusCode).toBe(200);
  });

  it('post-sans-cle-refuse-400', async () => {
    const a = neuf();
    const corps = { code_demande: 'palier-b', accord: true };
    const h = { 'content-type': 'application/json' };
    expect((await a.inject({ method: 'POST', url: '/abonnement/demandes-palier', headers: h, payload: corps })).statusCode).toBe(400);
    const court = { ...h, 'idempotency-key': 'x' };
    expect((await a.inject({ method: 'POST', url: '/abonnement/demandes-palier', headers: court, payload: corps })).statusCode).toBe(400);
    const ok = { ...h, 'idempotency-key': 'cle-valide-12' };
    for (const mauvais of [{ code_demande: '', accord: true }, { code_demande: 'b' }, { code_demande: 'b', accord: 'oui' }]) {
      expect((await a.inject({ method: 'POST', url: '/abonnement/demandes-palier', headers: ok, payload: mauvais })).statusCode).toBe(400);
    }
  });
});
