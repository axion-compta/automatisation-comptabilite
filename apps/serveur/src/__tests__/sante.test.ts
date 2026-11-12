import { afterEach, describe, expect, it } from 'vitest';
import { ReponseSante } from '../../../../packages/contrat/src/domaines/sante.js';
import { creerServiceSante } from '../../../../packages/contrat/src/domaines/sante-service.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : santé', () => {
  it('serveur-repond-200', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await a.inject({ method: 'GET', url: '/controles/sante' });
    expect(r.statusCode).toBe(200);
    expect(ReponseSante.parse(r.json().body)).toEqual(creerServiceSante().lire());
    expect((await a.inject({ method: 'GET', url: '/controles/sante' })).json()).toEqual(r.json());
    for (const method of ['POST', 'PUT', 'DELETE'] as const) {
      expect((await a.inject({ method, url: '/controles/sante' })).statusCode).toBe(404);
    }
  });
});
