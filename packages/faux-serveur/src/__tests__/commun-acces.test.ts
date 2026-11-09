import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { SCENARIOS_ACCES, suiteAcces, type CibleAcces } from './suite-acces.js';

const H = 'http://exemple.fr';
const HORLOGE = () => '2026-11-09T10:00:00Z';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleVrai: CibleAcces = async (scenario) => {
  const app = creerApp(undefined, { abonnement: { horloge: HORLOGE, scenario } });
  return {
    lire: async () => {
      const r = await app.inject({ method: 'GET', url: '/acces' });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleAcces = async (scenario) => {
  serveur.use(...creerHandlers({ base: H, horloge: HORLOGE }));
  return {
    lire: async () => {
      const r = await fetch(H + '/acces', { ...(scenario === null ? {} : { headers: { 'x-scenario-abonnement': scenario } }) });
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteAcces('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteAcces('faux serveur (MSW)', cibleFaux);

describe('accès : vrai et faux serveur', () => {
  it('memes-reponses-vrai-et-faux', async () => {
    expect(SCENARIOS_ACCES).toHaveLength(6);
    for (const s of SCENARIOS_ACCES) {
      const [v, f] = [await cibleVrai(s), await cibleFaux(s)];
      const [rv, rf] = [await v.lire(), await f.lire()];
      await v.fermer();
      await f.fermer();
      expect(rf, String(s)).toEqual(rv);
    }
  });
});
