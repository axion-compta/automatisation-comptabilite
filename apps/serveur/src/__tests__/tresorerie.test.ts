import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : trésorerie', () => {
  it('serveur-repond-a-la-tresorerie', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const p = await get('/tresorerie/prevision?horizon=30&scenario=central');
    expect(p.statusCode).toBe(200);
    expect(p.json().body).toMatchObject({ estimation: true });
    expect(p.json().body.hypotheses.length).toBeGreaterThan(0);
    for (const q of ['horizon=0', 'horizon=45', 'horizon=NaN', 'horizon=30&scenario=autre']) expect((await get('/tresorerie/prevision?' + q)).statusCode).toBe(400);
    expect((await get('/tresorerie/flux?du=2026-12-01&au=2026-11-01')).json().body).toEqual([]);
    expect((await get('/tresorerie/flux?origine=tva')).json().body).toHaveLength(1);
    const e = await get('/fournisseurs/echeances');
    expect(e.statusCode).toBe(200);
    expect(e.json().body.map((x: { pieceId: string }) => x.pieceId)).not.toContain('P-DET-002');
    expect((await get('/fournisseurs/alertes-iban')).json().body).toHaveLength(1);
    expect((await a.inject({ method: 'POST', url: '/fournisseurs/echeances' })).statusCode).toBe(404);
  });
});
