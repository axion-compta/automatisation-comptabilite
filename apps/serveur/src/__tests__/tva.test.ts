import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : tva', () => {
  it('serveur-repond-a-la-tva', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const p = await get('/exercices/EX2026/tva/periodes?limite=1');
    expect([p.statusCode, p.json().total, p.json().body.length]).toEqual([200, 2, 1]);
    const e = await get('/exercices/EX2026/tva/estimation');
    expect(e.json().body).toEqual({ exerciceId: 'EX2026', etat: 'non_calculee', motif: 'tva_en_doute', piecesARegarder: 2 });
    expect((await get('/exercices/EX2025/tva/estimation')).json().body.etat).toBe('calculee');
    const d = await get('/tva/declarations/DEC2025T4');
    expect(d.statusCode).toBe(200);
    expect(d.json().body).toMatchObject({ id: 'DEC2025T4', mention: 'prepare_par_ia' });
    expect((await get('/tva/declarations/DEC0000')).statusCode).toBe(404);
    expect((await get('/exercices/EX0000/tva/periodes')).statusCode).toBe(404);
    for (const mauvais of ['limite=0', 'limite=101', 'decalage=-1']) {
      expect((await get('/exercices/EX2026/tva/periodes?' + mauvais)).statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'POST', url: '/tva/declarations/DEC2025T4' })).statusCode).toBe(404);
  });
});
