import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const poster = async (corps: unknown) => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method: 'POST', url: '/recherche', headers: { 'content-type': 'application/json' }, payload: corps as object });
};

describe('serveur : recherche', () => {
  it('repond-200-sans-idempotency-key', async () => {
    const r = await poster({ q: 'facture', limite: 2 });
    expect(r.statusCode).toBe(200);
    expect(r.json().body.resultats.length).toBeGreaterThan(0);
  });

  it('refuse-400-et-ne-renvoie-pas-le-texte', async () => {
    const secret = 'x'.repeat(201);
    for (const corps of [{ q: 'a' }, { q: secret }, { q: 'facture', extra: 1 }, { q: 'facture', curseur: 'zzz' }]) {
      const r = await poster(corps);
      expect(r.statusCode).toBe(400);
      expect(r.body).not.toContain(secret);
    }
  });

  it('vide-200-rien-trouve', async () => {
    const r = await poster({ q: 'zzzzqqq' });
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toEqual({ resultats: [], mot: 'rien_trouve' });
  });

  it('texte-dans-l-url-refuse', async () => {
    const a = creerApp();
    apps.push(a);
    expect((await a.inject({ method: 'GET', url: '/recherche?q=facture' })).statusCode).toBe(404);
  });
});
