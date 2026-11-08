import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : véhicules et barème', () => {
  it('serveur-repond-au-bareme', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const v = await get('/vehicules?personne=PER-01');
    expect(v.statusCode).toBe(200);
    expect(v.json().body).toHaveLength(4);
    expect(JSON.stringify(v.json())).not.toContain('XX-00');
    expect((await get('/vehicules')).statusCode).toBe(400);
    expect((await get('/vehicules?personne=')).statusCode).toBe(400);

    const b = await get('/parametres/bareme_ik_voiture?date=2025-06-15');
    expect(b.statusCode).toBe(200);
    expect(b.json().body).toMatchObject({ statut: 'valide', majorationPourcent: 10 });
    expect((await get('/parametres/bareme_ik_voiture?date=2026-01-01')).json().body.statut).toBe('a_verifier');
    expect((await get('/parametres/bareme_ik_voiture?date=2024-01-01')).statusCode).toBe(404);
    for (const q of ['', '?date=', '?date=2025-02-30', '?date=15/06/2025']) expect([q, (await get('/parametres/bareme_ik_voiture' + q)).statusCode]).toEqual([q, 400]);
    expect((await a.inject({ method: 'POST', url: '/vehicules' })).statusCode).toBe(404);
  });

  it('date-invalide-400', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    // date calendaire inexistante, chaîne vide, date absente
    for (const q of ['?date=2025-02-30', '?date=', '']) {
      const r = await get('/parametres/bareme_ik_voiture' + q);
      expect([q, r.statusCode]).toEqual([q, 400]);
    }
  });
});
