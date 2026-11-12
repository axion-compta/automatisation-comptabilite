import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteClients, type CibleClients } from './suite-clients.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleVrai: CibleClients = async () => {
  const app = creerApp();
  return {
    lire: async (chemin) => {
      const r = await app.inject({ method: 'GET', url: chemin });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleClients = async () => {
  serveur.use(...creerHandlers({ base: H }));
  return {
    lire: async (chemin) => {
      const r = await fetch(H + chemin);
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteClients('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteClients('faux serveur (MSW)', cibleFaux);

describe('fiche client : vrai et faux serveur', () => {
  it('memes-reponses-vrai-et-faux', async () => {
    const [v, f] = [await cibleVrai(), await cibleFaux()];
    const ventes = (await v.lire('/ventes?limite=100')).json as { body: Array<{ client?: { code: string } }> };
    const code = ventes.body.find((x) => x.client)?.client?.code ?? '';
    for (const chemin of ['/clients/' + code, '/clients/CLI-INCONNU']) {
      const [rv, rf] = [await v.lire(chemin), await f.lire(chemin)];
      expect(rf.status, chemin).toBe(rv.status);
      if (rv.status === 200) expect(rf.json, chemin).toEqual(rv.json);
      else expect((rf.json as { code: string }).code, chemin).toBe((rv.json as { code: string }).code);
    }
    await v.fermer();
    await f.fermer();
  });
});
