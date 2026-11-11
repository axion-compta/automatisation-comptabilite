import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteFraisActions } from './suite-frais-actions.js';
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
const demarrer = (): Appeler => async (methode, chemin, entetes, corps) => {
  const r = await fetch(H + chemin, { method: methode, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
  return { status: r.status, json: await r.json() };
};
const faux: Cible = async () => {
  serveur.use(...creerHandlers({ base: H }));
  return { appeler: demarrer(), fermer: async () => serveur.resetHandlers() };
};

suiteFraisActions('vrai serveur (Fastify + oRPC)', vrai);
suiteFraisActions('faux serveur (MSW)', faux);

describe('faux serveur : état par instance', () => {
  it('etat-par-instance', async () => {
    const entetes = { 'idempotency-key': 'cle-instance-01', 'x-personne': 'PER-01' };
    const corps = { nature: 'depense', personneId: 'PER-01', date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234 };
    const creer = async () => {
      serveur.resetHandlers();
      serveur.use(...creerHandlers({ base: H }));
      return (await demarrer()('POST', '/frais', entetes, corps)).json as { body: { id: string } };
    };
    const un = await creer();
    const deux = await creer();
    expect(deux.body.id).toBe(un.body.id);
  });
});
