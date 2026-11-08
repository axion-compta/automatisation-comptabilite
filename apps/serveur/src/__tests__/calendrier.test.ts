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
const CAL = '/exercices/EX2026/calendrier';

describe('serveur : calendrier et vocabulaire', () => {
  it('serveur-calendrier-repond', async () => {
    const r = await lire(`${CAL}?du=2026-01-01&au=2027-12-31`);
    expect(r.statusCode).toBe(200);
    expect(r.json().body.map((l: { id: string }) => l.id)).toEqual(['ech-4', 'ech-1', 'ech-3', 'ech-2']);
  });

  it('serveur-refuse-les-requetes-invalides', async () => {
    expect((await lire(`${CAL}?du=2026-12-31&au=2026-01-01`)).statusCode).toBe(400);
    expect((await lire(`${CAL}?du=2026-02-30&au=2026-12-31`)).statusCode).toBe(400);
    expect((await lire(`${CAL}?du=2026-01-01`)).statusCode).toBe(400);
    expect((await lire(`${CAL}?du=2026-01-01&au=2026-12-31&x=1`)).statusCode).toBe(400);
    expect((await lire('/vocabulaire?mode=autre')).statusCode).toBe(400);
    expect((await lire('/exercices/EX1999/calendrier?du=2026-01-01&au=2026-12-31')).statusCode).toBe(404);
  });

  it('serveur-vocabulaire-repond', async () => {
    const r = await lire('/vocabulaire?mode=simple');
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toHaveLength(4);
  });
});
