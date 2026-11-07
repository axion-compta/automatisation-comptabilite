import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : tiers', () => {
  it('serveur-repond-aux-tiers', async () => {
    const a = creerApp();
    apps.push(a);
    const tout = await a.inject({ method: 'GET', url: '/tiers' });
    expect(tout.statusCode).toBe(200);
    expect(tout.json()).toMatchObject({ decalage: 0, total: 12 });
    expect(tout.json().body[0]).toMatchObject({ code: 'CLI001', type: 'client' });

    const f = await a.inject({ method: 'GET', url: '/tiers?type=fournisseur&q=FOU00&limite=2&decalage=1' });
    expect(f.statusCode).toBe(200);
    expect(f.json().total).toBe(6);
    expect(f.json().decalage).toBe(1);
    expect(f.json().body.map((t: { code: string }) => t.code)).toEqual(['FOU002', 'FOU003']);

    const s = await a.inject({ method: 'GET', url: '/tiers?q=renovation' });
    expect(s.json().total).toBeGreaterThan(0);

    for (const mauvais of ['type=autre', 'limite=0', 'limite=101', 'limite=1.5', 'decalage=-1', 'limite=NaN', 'q=' + 'a'.repeat(51)]) {
      expect((await a.inject({ method: 'GET', url: '/tiers?' + mauvais })).statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'POST', url: '/tiers' })).statusCode).toBe(404);
  });
});
