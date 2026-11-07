import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const lire = async (url: string) => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method: 'GET', url });
};

describe('serveur : tableau de bord', () => {
  it('serveur-repond-au-tableau-de-bord', async () => {
    const r = await lire('/exercices/EX2026/tableau-de-bord?vue=mois');
    expect(r.statusCode).toBe(200);
    expect(r.json().body.blocs).toHaveLength(8);
    expect(r.json().body.vue).toBe('mois');
    const b = await lire('/exercices/EX2026/tableau-de-bord/resultat');
    expect(b.statusCode).toBe(200);
    expect(b.json().body.code).toBe('resultat');
    const v = await lire('/exercices/EX2026/tableau-de-bord?profil=vide');
    expect(v.json().body.anneau.global).toBe('pointille');
  });

  it('refuse-les-requetes-invalides', async () => {
    expect((await lire('/exercices/EX2026/tableau-de-bord?vue=semaine')).statusCode).toBe(400);
    expect((await lire('/exercices/EX2026/tableau-de-bord?inconnu=1')).statusCode).toBe(400);
    expect((await lire('/exercices/EX1999/tableau-de-bord')).statusCode).toBe(404);
    expect((await lire('/exercices/EX2026/tableau-de-bord/inconnu')).statusCode).toBe(404);
  });
});
