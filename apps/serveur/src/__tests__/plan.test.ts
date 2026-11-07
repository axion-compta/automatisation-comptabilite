import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : plan comptable', () => {
  it('serveur-repond-au-plan', async () => {
    const a = creerApp();
    apps.push(a);
    const ex = await a.inject({ method: 'GET', url: '/exercices' });
    expect(ex.statusCode).toBe(200);
    expect(ex.json().body.map((e: { id: string }) => e.id)).toEqual(['EX2026', 'EX2025']);
    expect(ex.json().total).toBe(2);

    const p = await a.inject({ method: 'GET', url: '/exercices/EX2026/plan?classe=5&q=banque' });
    expect(p.statusCode).toBe(200);
    expect(p.json()).toMatchObject({ decalage: 0, total: 1 });
    expect(p.json().body[0]).toMatchObject({ numero: '512000', libelle: 'Banque', classe: 5 });
    expect(Number.isInteger(p.json().body[0].soldeCentimes)).toBe(true);

    const l = await a.inject({ method: 'GET', url: '/exercices/EX2026/plan?limite=2&decalage=1' });
    expect(l.json().body).toHaveLength(2);
    expect(l.json().decalage).toBe(1);

    expect((await a.inject({ method: 'GET', url: '/exercices/EX1999/plan' })).statusCode).toBe(404);
    expect((await a.inject({ method: 'GET', url: '/exercices/EX2026/plan?classe=8' })).statusCode).toBe(400);
  });
});
