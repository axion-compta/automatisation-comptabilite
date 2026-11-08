import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : fec et contrôles', () => {
  it('serveur-repond-au-fec-et-aux-controles', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const h = await get('/exercices/EX2025/fec/historique');
    expect(h.statusCode).toBe(200);
    expect(h.json().body.map((f: { version: number }) => f.version)).toEqual([2, 1]);
    const f = await get('/fec/FEC001');
    expect(f.json().body).toMatchObject({ id: 'FEC001', statut: 'travail', telechargementAutorise: false, mention: 'prepare_par_ia' });
    expect((await get('/fec/FEC000')).statusCode).toBe(404);
    expect((await get('/exercices/EX0000/fec/historique')).statusCode).toBe(404);
    const t = await get('/exercices/EX2026/controles?limite=2');
    expect([t.statusCode, t.json().total, t.json().body.length, t.json().body[0].resultat]).toEqual([200, 3, 2, 'ALERTE']);
    expect((await get('/exercices/EX2026/controles?resultat=OK')).json().total).toBe(2);
    expect((await get('/exercices/EX0000/controles')).statusCode).toBe(404);
    for (const mauvais of ['resultat=ok', 'limite=0', 'limite=101', 'decalage=-1']) {
      expect((await get('/exercices/EX2026/controles?' + mauvais)).statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'POST', url: '/fec/FEC001' })).statusCode).toBe(404);
  });
});
