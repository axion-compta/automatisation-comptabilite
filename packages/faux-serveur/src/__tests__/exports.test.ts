import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const appeler = (corps: string, entetes: Record<string, string> = { 'idempotency-key': 'cle-fictive-1' }) =>
  fetch('http://exemple.fr/api/exports', { method: 'POST', headers: { 'content-type': 'application/json', ...entetes }, body: corps });

describe('faux serveur : exports', () => {
  it('route sous le préfixe de base ; corps illisible ou non objet = 400', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr/api' }));
    expect((await appeler('{"liste":"listerTiers","format":"csv"}')).status).toBe(200);
    for (const corps of ['{', 'null', '[]', '"x"']) expect((await appeler(corps)).status).toBe(400);
  });
  it('la panne 423 de test est ignorée : pas de route d’écriture simulée', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr/api' }));
    expect((await appeler('{"liste":"listerTiers","format":"csv"}', { 'idempotency-key': 'cle-fictive-2', 'x-panne': '423' })).status).toBe(200);
  });
});
