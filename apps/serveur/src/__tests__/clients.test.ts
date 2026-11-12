import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : fiche client', () => {
  it('serveur-repond-au-client', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const r = await get('/clients/CLI001');
    expect(r.statusCode).toBe(200);
    const c = r.json().body;
    expect(c.code).toBe('CLI001');
    expect(c.soldeCentimes).toBeGreaterThan(0);
    expect(Array.isArray(c.facturesOuvertes)).toBe(true);
    const inconnu = await get('/clients/CLI999');
    expect(inconnu.statusCode).toBe(404);
    expect(inconnu.json().code).toBe('CLIENT_INCONNU');
  });
});
