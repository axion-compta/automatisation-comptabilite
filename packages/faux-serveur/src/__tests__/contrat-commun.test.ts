import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteContrat, type Appeler, type Cible } from './suite-contrat.js';
import { suitePlan } from './suite-plan.js';
import { suiteTiers } from './suite-tiers.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };

const cibleVrai: Cible = async () => {
  const app = creerApp();
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await app.inject({
      method: methode as 'GET',
      url: chemin,
      headers: { ...(corps === undefined ? {} : json), ...entetes },
      ...(corps === undefined ? {} : { payload: corps as object }),
    });
    return { status: r.statusCode, json: r.json() };
  };
  return { appeler, fermer: () => app.close() };
};

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleFaux: Cible = async () => {
  serveur.use(...creerHandlers({ base: H }));
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await fetch(H + chemin, {
      method: methode,
      headers: { ...(corps === undefined ? {} : json), ...entetes },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    return { status: r.status, json: await r.json() };
  };
  return { appeler, fermer: async () => serveur.resetHandlers() };
};

suiteContrat('vrai serveur (Fastify + oRPC)', cibleVrai);
suitePlan('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteTiers('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteContrat('faux serveur (MSW)', cibleFaux);
suitePlan('faux serveur (MSW)', cibleFaux);
suiteTiers('faux serveur (MSW)', cibleFaux);
