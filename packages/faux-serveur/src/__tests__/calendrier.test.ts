import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

describe('faux serveur : calendrier', () => {
  it('route sous le préfixe de base et refuse une query répétée', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr/api' }));
    const cal = 'http://exemple.fr/api/exercices/EX2026/calendrier';
    expect((await fetch(cal + '?du=2026-01-01&au=2027-12-31')).status).toBe(200);
    expect((await fetch(cal + '?du=2026-01-01&du=2026-02-01&au=2027-12-31')).status).toBe(400);
    expect((await fetch('http://exemple.fr/api/vocabulaire?mode=simple&mode=comptable')).status).toBe(400);
    expect((await fetch('http://exemple.fr/api/vocabulaire?mode=comptable')).status).toBe(200);
  });
});
