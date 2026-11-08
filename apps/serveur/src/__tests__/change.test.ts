import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { creerServiceChange } from '../../../../packages/contrat/src/domaines/change-service.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const get = (url: string) => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method: 'GET', url });
};
const NBSP = ' ';

describe('serveur : explication d\'un écart de change', () => {
  it('explication-perte-phrase-exacte', async () => {
    const r = await get('/ecarts-change/ECART-001/explication');
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toEqual({
      sens: 'perte',
      montantCentimes: 1800,
      devise: 'XXA',
      taux: [
        { tauxE8: 92000000, source: 'taux de test, source fictive', date: '2026-10-07' },
        { tauxE8: 95000000, source: 'taux de test, source fictive', date: '2026-11-20' },
      ],
      phrase: `Perte de change de 18,00${NBSP}€ : la facture a été enregistrée au taux de 0,92000000 (taux de test, source fictive, 07/10/2026) et payée à 0,95000000 (taux de test, source fictive, 20/11/2026).`,
    });
    const gain = (await get('/ecarts-change/ECART-002/explication')).json().body;
    expect([gain.sens, gain.montantCentimes]).toEqual(['gain', 1250]);
    expect(gain.phrase).toMatch(/^Gain de change de 12,50/);
  });

  it('ecart-inconnu-404', async () => {
    for (const id of ['ECART-000', 'constructor', '__proto__', 'toString']) {
      const r = await get('/ecarts-change/' + id + '/explication');
      expect([id, r.statusCode, r.json().code]).toEqual([id, 404, 'ECART_INCONNU']);
    }
  });

  it('aucun-effet', async () => {
    const a = creerApp();
    apps.push(a);
    const url = '/ecarts-change/ECART-001/explication';
    const [x, y] = [await a.inject({ method: 'GET', url }), await a.inject({ method: 'GET', url })];
    expect(x.json()).toEqual(y.json());
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      expect((await a.inject({ method, url })).statusCode, method).toBe(404);
    }
    expect(Object.keys(creerServiceChange())).toEqual(['expliquer']);
  });
});
