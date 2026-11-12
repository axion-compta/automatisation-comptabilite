import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suitePalier } from './suite-palier.js';
import type { Appeler, Cible } from './suite-contrat.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };
const HORLOGE = () => '2026-06-15T10:00:00Z';

const vrai =
  (scenario: string | null): Cible =>
  async () => {
    const app = creerApp(undefined, { abonnement: { horloge: HORLOGE, scenario } });
    const appeler: Appeler = async (methode, chemin, entetes, corps) => {
      const r = await app.inject({ method: methode as 'GET', url: chemin, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { payload: corps as object }) });
      return { status: r.statusCode, json: r.json() };
    };
    return { appeler, fermer: () => app.close() };
  };
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());
const faux: Cible = async () => {
  serveur.use(...creerHandlers({ base: H, horloge: HORLOGE }));
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await fetch(H + chemin, { method: methode, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
    return { status: r.status, json: await r.json() };
  };
  return { appeler, fermer: async () => serveur.resetHandlers() };
};

suitePalier('vrai serveur (Fastify + oRPC)', vrai(null));
suitePalier('faux serveur (MSW)', faux);
