import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { SCENARIOS_VOLUME, suiteVolume, type CibleVolume } from './suite-volume.js';

const H = 'http://exemple.fr';
const HORLOGE = () => '2026-06-15T10:00:00Z';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleVrai: CibleVolume = async (scenario) => {
  const app = creerApp(undefined, { abonnement: { horloge: HORLOGE, scenario } });
  return {
    lire: async () => {
      const r = await app.inject({ method: 'GET', url: '/volume' });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleVolume = async (scenario) => {
  serveur.use(...creerHandlers({ base: H, horloge: HORLOGE }));
  return {
    lire: async () => {
      const r = await fetch(H + '/volume', { ...(scenario === null ? {} : { headers: { 'x-scenario-abonnement': scenario } }) });
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteVolume('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteVolume('faux serveur (MSW)', cibleFaux);

describe('volume : vrai et faux serveur', () => {
  it('memes-reponses-vrai-et-faux', async () => {
    expect(SCENARIOS_VOLUME).toHaveLength(3);
    for (const s of SCENARIOS_VOLUME) {
      const [v, f] = [await cibleVrai(s), await cibleFaux(s)];
      const [rv, rf] = [await v.lire(), await f.lire()];
      await v.fermer();
      await f.fermer();
      expect(rf, String(s)).toEqual(rv);
    }
  });
});
