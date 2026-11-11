import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suitePersonnes, type CiblePersonnes } from './suite-personnes.js';

const H = 'http://exemple.fr';
const HORLOGE = () => '2026-11-09T10:00:00Z';
// Réglages inventés pour les tests : ni délai ni durée réels.
const REGLAGES_FICTIFS = { moisReponse: 2, joursRappel: 3 };
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const entetes = (cle: string | undefined) => ({ 'content-type': 'application/json', ...(cle === undefined ? {} : { 'idempotency-key': cle }) });

const cibleVrai: CiblePersonnes = async (avecReglage) => {
  const app = creerApp(undefined, {
    exploitation: { horloge: HORLOGE, dateReference: '2026-11-09', ...(avecReglage ? { reglagesPersonnes: REGLAGES_FICTIFS, reglesConservation: [] } : {}) },
  });
  return {
    appeler: async (methode, chemin, corps, cle) => {
      const r = await app.inject({ method: methode, url: chemin, headers: entetes(cle), ...(corps === undefined ? {} : { payload: JSON.stringify(corps) }) });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CiblePersonnes = async () => {
  serveur.use(...creerHandlers({ base: H, horloge: HORLOGE, dateReferenceExploitation: '2026-11-09' }));
  return {
    appeler: async (methode, chemin, corps, cle) => {
      const r = await fetch(H + chemin, { method: methode, headers: entetes(cle), ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suitePersonnes('serveur en mémoire (Fastify + oRPC)', cibleVrai);
// Le faux serveur a toujours des réglages fictifs : le test « sans-reglage-503 » n'a de sens que côté serveur en mémoire.
suitePersonnes('faux serveur (MSW)', async (avecReglage) => (avecReglage ? cibleFaux(true) : cibleVrai(false)));

describe('demandes des personnes : état par instance', () => {
  it('etat-propre-a-chaque-instance', async () => {
    const [a, b] = [await cibleFaux(true), await cibleFaux(true)];
    expect(a).not.toBe(b);
    await a.appeler('POST', '/personnes/demandes', { type: 'acces', recue_le: '2026-11-09' }, 'cle-instance-1');
    const l = (await a.appeler('GET', '/personnes/demandes')).json as { body: unknown[] };
    expect(l.body).toHaveLength(7);
    await a.fermer();
    const neuf = await cibleFaux(true);
    expect(((await neuf.appeler('GET', '/personnes/demandes')).json as { body: unknown[] }).body).toHaveLength(6);
  });
});
