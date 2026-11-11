import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : indicateurs des ventes', () => {
  it('serveur-repond-aux-indicateurs', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const r = await get('/ventes/indicateurs?mois=2026-01');
    expect(r.statusCode).toBe(200);
    const corps = r.json().body;
    expect(corps.chiffreAffaires.pieces.length).toBeGreaterThan(0);
    expect(corps.tvaCollectee).toEqual({ nonCalculee: 'regime_a_confirmer' });
    expect((await get('/ventes/indicateurs?mois=2026-01&avecPropositions=true')).json().body.provisoire).toBe(true);
    for (const q of ['', '?mois=2026-00', '?mois=2026-1']) expect((await get(`/ventes/indicateurs${q}`)).statusCode).toBe(400);
    const s = await get('/ventes/series');
    expect(s.statusCode).toBe(200);
    expect(s.json().body.some((x: { trous: number[] }) => x.trous.includes(17))).toBe(true);
    // Ni l'une ni l'autre n'est prise pour un identifiant de vente.
    expect((await get('/ventes/VP-9-999')).json().code).toBe('VENTE_INCONNUE');
    expect((await get('/ventes?limite=1')).statusCode).toBe(200);
  });
});
