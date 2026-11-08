import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

describe('faux serveur : notifications', () => {
  it('route sous le préfixe de base et refuse une query inconnue ou répétée', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr/api' }));
    expect((await fetch('http://exemple.fr/api/notifications')).status).toBe(200);
    expect((await fetch('http://exemple.fr/api/notifications?zzz=1')).status).toBe(400);
    expect((await fetch('http://exemple.fr/api/notifications?limite=1&limite=2')).status).toBe(400);
    expect((await fetch('http://exemple.fr/api/notifications?limite=0')).status).toBe(400);
  });
  it('limite et décalage pagine sans changer le total', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr' }));
    const tout = (await (await fetch('http://exemple.fr/notifications')).json()) as { total: number };
    const page = (await (await fetch('http://exemple.fr/notifications?limite=1&decalage=1')).json()) as { body: unknown[]; total: number };
    expect(page.body).toHaveLength(1);
    expect(page.total).toBe(tout.total);
  });
});
