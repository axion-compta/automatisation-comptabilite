import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : suivi de la banque', () => {
  it('serveur-repond-au-suivi', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const c = await get('/banque/comptes/BQ1/couverture?exercice_id=EX-2026');
    expect(c.statusCode).toBe(200);
    expect(c.json().body.mois.filter((m: { etat: string }) => m.etat === 'manquant')).toHaveLength(1);
    expect((await get('/banque/comptes/BQ2/couverture')).json().body.mois.every((m: { etat: string }) => m.etat === 'manquant')).toBe(true);
    expect((await get('/banque/comptes/BQ9/couverture')).statusCode).toBe(404);
    expect((await get('/banque/trous?etat=ouvert')).json().total).toBe(1);
    expect((await get('/banque/demandes?etat=ouverte')).json().total).toBeGreaterThan(0);
    expect((await get('/banque/doublons?etat=propose')).json().total).toBe(1);
    for (const u of ['trous', 'demandes', 'doublons']) expect((await get(`/banque/${u}?etat=AUTRE`)).statusCode).toBe(400);
  });
});
