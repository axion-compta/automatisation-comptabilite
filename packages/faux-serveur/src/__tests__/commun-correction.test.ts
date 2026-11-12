import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteCorrection, type CibleCorrection } from './suite-correction.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const entetes = (cle: string | undefined): Record<string, string> => (cle === undefined ? {} : { 'idempotency-key': cle });

const cibleVrai: CibleCorrection = async () => {
  const app = creerApp();
  return {
    corriger: async (id, nom, corps, cle) => {
      const r = await app.inject({ method: 'PATCH', url: `/pieces/${id}/champs/${nom}`, headers: entetes(cle), payload: corps as object });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleCorrection = async () => {
  serveur.use(...creerHandlers({ base: H }));
  return {
    corriger: async (id, nom, corps, cle) => {
      const r = await fetch(`${H}/pieces/${id}/champs/${nom}`, { method: 'PATCH', headers: { 'content-type': 'application/json', ...entetes(cle) }, body: JSON.stringify(corps) });
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteCorrection('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteCorrection('faux serveur (MSW)', cibleFaux);

describe('correction : vrai et faux serveur', () => {
  it('memes-reponses-vrai-et-faux', async () => {
    const [v, f] = [await cibleVrai(), await cibleFaux()];
    const cas: Array<[string, string, unknown]> = [
      ['piece-001', 'ttc', { valeur: '250,50', pourquoi: 'erreur de lecture' }],
      ['piece-001', 'date_piece', { valeur: '05/09/2026', pourquoi: 'mauvaise date' }],
      ['piece-001', 'ttc', { valeur: 'abc', pourquoi: 'p' }],
      ['piece-010', 'ttc', { valeur: '1,00', pourquoi: 'p' }],
      ['inconnue-xyz', 'ttc', { valeur: '1,00', pourquoi: 'p' }],
    ];
    for (const [i, [id, nom, corps]] of cas.entries()) {
      const [rv, rf] = [await v.corriger(id, nom, corps, `cle-fictive-2${i}`), await f.corriger(id, nom, corps, `cle-fictive-2${i}`)];
      expect(rf.status).toBe(rv.status);
      const sansMessage = (j: unknown) => JSON.parse(JSON.stringify(j), (k, x) => (k === 'message' ? 'texte' : x));
      expect(sansMessage(rf.json)).toEqual(sansMessage(rv.json));
    }
    await v.fermer();
    await f.fermer();
  });
});
