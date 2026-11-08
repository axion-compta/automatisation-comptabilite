import { afterEach, describe, expect, it } from 'vitest';
import { ProfilV1 } from '../../../../packages/contrat/src/domaines/profil.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = () => {
  const a = creerApp();
  apps.push(a);
  return a;
};

describe('serveur : profil', () => {
  it('serveur-repond-au-profil', async () => {
    const a = neuf();
    const r = await a.inject({ method: 'GET', url: '/profil' });
    expect(r.statusCode).toBe(200);
    const p = ProfilV1.parse(r.json().body);
    expect(p.champs.find((c) => c.cle === 'denomination')?.valeur).toBe('Lemoine Rénovation');
    const passe = await a.inject({ method: 'GET', url: '/profil?au=2020-01-01' });
    expect(passe.statusCode).toBe(200);
    expect(ProfilV1.parse(passe.json().body).champs).toEqual([]);
    expect((await a.inject({ method: 'POST', url: '/profil' })).statusCode).toBe(404);
  });

  it('au-mal-formee-400', async () => {
    const a = neuf();
    for (const mauvais of ['2026-02-30', '31%2F12%2F2026', '']) {
      expect((await a.inject({ method: 'GET', url: '/profil?au=' + mauvais })).statusCode).toBe(400);
    }
  });
});
