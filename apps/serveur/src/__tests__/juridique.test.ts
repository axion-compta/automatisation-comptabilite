import { afterEach, describe, expect, it } from 'vitest';
import { ReponseObligationsJuridiques } from '../../../../packages/contrat/src/domaines/juridique.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : obligations juridiques', () => {
  it('serveur-repond-aux-obligations', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await a.inject({ method: 'GET', url: '/exercices/EX2026/juridique' });
    expect(r.statusCode).toBe(200);
    expect(ReponseObligationsJuridiques.parse(r.json()).body).toMatchObject({ exerciceId: 'EX2026', mention: 'prepare_par_ia', forme: 'FORME_A' });
    expect((await a.inject({ method: 'GET', url: '/exercices/EX1999/juridique' })).statusCode).toBe(404);
    expect((await a.inject({ method: 'GET', url: `/exercices/${'E'.repeat(65)}/juridique` })).statusCode).toBe(400);
    expect((await a.inject({ method: 'GET', url: '/exercices/%3Cscript%3E/juridique' })).statusCode).toBe(400);
    for (const m of ['POST', 'PUT', 'DELETE'] as const) expect((await a.inject({ method: m, url: '/exercices/EX2026/juridique' })).statusCode).toBe(404);
  });
});
