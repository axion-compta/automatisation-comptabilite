import { afterEach, describe, expect, it } from 'vitest';
import { ReponseRegimesImposition, ReponseRegimesTva } from '../../../../packages/contrat/src/domaines/regimes.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : régimes', () => {
  it('serveur-repond-aux-regimes', async () => {
    const a = creerApp();
    apps.push(a);
    const tva = await a.inject({ method: 'GET', url: '/profil/regimes/tva' });
    expect(tva.statusCode).toBe(200);
    expect(ReponseRegimesTva.parse(tva.json()).body[0]).toMatchObject({ regime: 'reel_simplifie', statut: 'propose' });
    const imp = await a.inject({ method: 'GET', url: '/profil/regimes/imposition' });
    expect(imp.statusCode).toBe(200);
    expect(ReponseRegimesImposition.parse(imp.json()).body[0]).toMatchObject({ impot: 'IS', categorie: 'BIC' });
    for (const url of ['/profil/regimes/tva', '/profil/regimes/imposition']) {
      expect((await a.inject({ method: 'POST', url })).statusCode).toBe(404);
    }
  });
});
