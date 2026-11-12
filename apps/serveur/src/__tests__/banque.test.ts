import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : banque', () => {
  it('serveur-repond-a-la-banque', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const comptes = await get('/banque/comptes');
    expect(comptes.statusCode).toBe(200);
    expect(comptes.json().total).toBe(3);
    expect(comptes.json().body[0].ibanMasque).toContain('*');

    const l = await get('/banque/lignes?etat=SANS_PIECE&compte=BQ1&limite=2&decalage=1');
    expect(l.statusCode).toBe(200);
    expect(l.json()).toMatchObject({ decalage: 1, total: 12 });
    expect(l.json().body).toHaveLength(2);
    expect((await get('/banque/lignes?du=2026-10-11&au=2026-10-10')).json().total).toBe(0);

    const e = await get('/banque/lignes/L-001/explication');
    expect(e.statusCode).toBe(200);
    expect(e.json().body.facteurs).toHaveLength(5);
    expect((await get('/banque/lignes/L-999/explication')).statusCode).toBe(404);
    expect((await get('/banque/lignes?compte=BQ9')).statusCode).toBe(404);
    for (const mauvais of ['limite=0', 'limite=101', 'decalage=-1', 'etat=AUTRE']) {
      expect((await get('/banque/lignes?' + mauvais)).statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'POST', url: '/banque/lignes' })).statusCode).toBe(404);
  });
});
