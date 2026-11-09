import { afterEach, describe, expect, it } from 'vitest';
import { ReponseEtatSources } from '../../../../packages/contrat/src/domaines/sources.js';
import { genererSources } from '../../../../packages/donnees-fictives/src/sources.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : état des sources', () => {
  it('serveur-repond-a-l-etat', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await a.inject({ method: 'GET', url: '/sources/etat' });
    expect(r.statusCode).toBe(200);
    const { body } = ReponseEtatSources.parse(r.json());
    expect(body.veille).toEqual(genererSources().veille);
    expect(body.connecteurs.map((c) => c.connecteur)).toEqual(['annuaire_entreprises', 'plateforme_agreee', 'tva_intracom']);
    for (const m of ['POST', 'PUT', 'DELETE'] as const) expect((await a.inject({ method: m, url: '/sources/etat' })).statusCode).toBe(404);
  });
});
