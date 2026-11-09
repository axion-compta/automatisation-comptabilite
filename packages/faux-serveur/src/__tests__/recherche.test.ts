import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const chercher = (base: string, corps: unknown) =>
  fetch(base + '/recherche', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) });

describe('faux serveur : recherche', () => {
  it('répond sous le préfixe de base à une requête valide', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr/api' }));
    const r = await chercher('http://exemple.fr/api', { q: 'facture' });
    expect(r.status).toBe(200);
    const json = (await r.json()) as { body: { resultats: unknown[] } };
    expect(Array.isArray(json.body.resultats)).toBe(true);
  });

  it('refuse un corps invalide ou non JSON par 400 sans écho du texte', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr' }));
    for (const corps of [{ q: 'a' }, { q: 'facture', extra: 1 }, { q: 12 }, {}]) {
      expect((await chercher('http://exemple.fr', corps)).status).toBe(400);
    }
    const brut = await fetch('http://exemple.fr/recherche', { method: 'POST', body: 'pas du json secret-xyz' });
    expect(brut.status).toBe(400);
    expect(await brut.text()).not.toContain('secret-xyz');
  });

  it('un curseur altéré donne 400 CURSEUR_INVALIDE', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr' }));
    const r = await chercher('http://exemple.fr', { q: 'facture', curseur: 'zzz' });
    expect(r.status).toBe(400);
  });
});
