import { afterEach, describe, expect, it } from 'vitest';
import { ReponseEcheances } from '../../../../packages/contrat/src/domaines/echeances.js';
import { creerServiceEcheances } from '../../../../packages/contrat/src/domaines/echeances-service.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const get = async (url: string) => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method: 'GET', url });
};

describe('serveur : échéances', () => {
  it('serveur-repond-aux-echeances', async () => {
    const r = await get('/echeances?du=2000-01-01&au=2999-12-31');
    expect(r.statusCode).toBe(200);
    expect(ReponseEcheances.parse(r.json())).toEqual(creerServiceEcheances().lister('2000-01-01', '2999-12-31'));
    expect(r.json().body.length).toBeGreaterThan(0);
    const un = await get('/echeances?du=2026-04-20&au=2026-04-20');
    expect(un.json().body.map((e: { code: string }) => e.code)).toEqual(['ECH_A']);
    expect((await get('/echeances?du=2000-01-01&au=2000-01-01')).json()).toEqual({ body: [], total: 0 });
    expect((await get('/echeances?du=2026-05-01&au=2026-04-01')).statusCode).toBe(400);
    expect((await get('/echeances?du=2026-02-30&au=2026-04-01')).statusCode).toBe(400);
    expect((await get('/echeances?du=2026-01-01')).statusCode).toBe(400);
    expect((await get('/echeances')).statusCode).toBe(400);
    const a = creerApp();
    apps.push(a);
    expect((await a.inject({ method: 'POST', url: '/echeances?du=2026-01-01&au=2026-02-01' })).statusCode).toBe(404);
  });
});
