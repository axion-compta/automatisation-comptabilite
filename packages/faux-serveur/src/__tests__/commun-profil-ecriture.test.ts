import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteProfilEcriture } from './suite-profil-ecriture.js';
import type { Appeler, Cible } from './suite-contrat.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };

const vrai: Cible = async () => {
  const app = creerApp();
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
  serveur.use(...creerHandlers({ base: H }));
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await fetch(H + chemin, { method: methode, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
    return { status: r.status, json: await r.json() };
  };
  return { appeler, fermer: async () => serveur.resetHandlers() };
};

suiteProfilEcriture('vrai serveur (Fastify + oRPC)', vrai);
suiteProfilEcriture('faux serveur (MSW)', faux);
