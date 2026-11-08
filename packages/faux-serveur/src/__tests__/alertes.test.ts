import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

describe('faux serveur : alertes', () => {
  it('un-service-neuf-par-fabrique', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const a = await (await fetch(H + '/exercices/EX2026/alertes')).json();
    serveur.resetHandlers();
    serveur.use(...creerHandlers({ base: H }));
    expect(await (await fetch(H + '/exercices/EX2026/alertes')).json()).toEqual(a);
  });

  it('les-reponses-sont-des-copies', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const lire = async () => ((await (await fetch(H + '/exercices/EX2026/alertes')).json()) as { body: Array<{ gravite: string }> }).body[0]?.gravite;
    const avant = await lire();
    expect(await lire()).toBe(avant);
  });

  it('latence-appliquee-aux-deux-routes', async () => {
    serveur.use(...creerHandlers({ base: H, latenceMs: 30 }));
    for (const chemin of ['/exercices/EX2026/alertes', '/exercices/EX2026/compteurs']) {
      const t = Date.now();
      expect((await fetch(H + chemin)).status).toBe(200);
      expect(Date.now() - t).toBeGreaterThanOrEqual(25);
    }
  });
});
