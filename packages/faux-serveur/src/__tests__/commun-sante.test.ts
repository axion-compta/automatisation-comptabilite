import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteSanteExploitation, type CibleSanteExploitation } from './suite-sante.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleVrai: CibleSanteExploitation = async () => {
  const app = creerApp();
  return {
    lire: async () => {
      const r = await app.inject({ method: 'GET', url: '/sante' });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleSanteExploitation = async (panne) => {
  serveur.use(...creerHandlers({ base: H }));
  return {
    lire: async () => {
      const r = await fetch(H + '/sante', { ...(panne === null ? {} : { headers: { 'x-panne-sante': panne } }) });
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteSanteExploitation('serveur en mémoire (Fastify + oRPC)', cibleVrai);
suiteSanteExploitation('faux serveur (MSW)', cibleFaux);

describe('santé d’exploitation : serveur en mémoire et faux serveur', () => {
  it('faux-serveur-panne-simulee', async () => {
    const [d, p] = [await cibleFaux('degrade'), await cibleFaux('panne')];
    expect(((await d.lire()).json as { body: { etat: string } }).body.etat).toBe('degrade');
    expect(((await p.lire()).json as { body: { etat: string } }).body.etat).toBe('panne');
  });

  it('meme-reponse-des-deux-serveurs', async () => {
    const [v, f] = [await cibleVrai(null), await cibleFaux(null)];
    const [rv, rf] = [await v.lire(), await f.lire()];
    await v.fermer();
    expect(rf).toEqual(rv);
  });
});
