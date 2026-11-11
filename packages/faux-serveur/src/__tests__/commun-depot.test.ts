import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteDepot, type CibleDepot } from './suite-depot.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const FRONTIERE = 'frontiere-fictive-0001';
const entetes = (cle: string | undefined): Record<string, string> => (cle === undefined ? {} : { 'idempotency-key': cle });

const cibleVrai: CibleDepot = async () => {
  const app = creerApp();
  const corps = (fichiers: string[]) => {
    const parties = fichiers.map((c, i) => `--${FRONTIERE}\r\nContent-Disposition: form-data; name="fichiers[${i}]"; filename="piece-${i}.pdf"\r\nContent-Type: application/pdf\r\n\r\n${c}\r\n`);
    parties.push(`--${FRONTIERE}\r\nContent-Disposition: form-data; name="canal"\r\n\r\napi\r\n--${FRONTIERE}--\r\n`);
    return Buffer.from(parties.join(''));
  };
  const ret = (r: { statusCode: number; json: () => unknown }) => ({ status: r.statusCode, json: r.json() });
  return {
    deposer: async (fichiers, cle) =>
      ret(await app.inject({ method: 'POST', url: '/pieces', headers: { 'content-type': `multipart/form-data; boundary=${FRONTIERE}`, ...entetes(cle) }, payload: corps(fichiers) })),
    etat: async (id) => ret(await app.inject({ method: 'GET', url: `/pieces/${id}/etat` })),
    relancer: async (id, cle) => ret(await app.inject({ method: 'POST', url: `/pieces/${id}/relancer`, headers: entetes(cle) })),
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleDepot = async () => {
  serveur.use(...creerHandlers({ base: H }));
  const ret = async (r: Response) => ({ status: r.status, json: await r.json() });
  return {
    deposer: async (fichiers, cle) => {
      const f = new FormData();
      fichiers.forEach((c, i) => f.append('fichiers', new File([c], `piece-${i}.pdf`, { type: 'application/pdf' })));
      f.append('canal', 'api');
      return ret(await fetch(H + '/pieces', { method: 'POST', headers: entetes(cle), body: f }));
    },
    etat: async (id) => ret(await fetch(`${H}/pieces/${id}/etat`)),
    relancer: async (id, cle) => ret(await fetch(`${H}/pieces/${id}/relancer`, { method: 'POST', headers: entetes(cle) })),
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteDepot('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteDepot('faux serveur (MSW)', cibleFaux);

describe('depot : vrai et faux serveur', () => {
  it('memes-reponses-vrai-et-faux', async () => {
    const [v, f] = [await cibleVrai(), await cibleFaux()];
    const lots = [['%PDF-1.4 fictif A', '%PDF-1.4 fictif A', 'contenu brut sans signature'], ['%PDF-1.4 fictif B']];
    for (const [i, lot] of lots.entries()) {
      const [rv, rf] = [await v.deposer(lot, `cle-fictive-1${i}`), await f.deposer(lot, `cle-fictive-1${i}`)];
      expect(rf.status).toBe(rv.status);
      const sansHeure = (j: unknown) => JSON.parse(JSON.stringify(j), (k, x) => (k === 'recueLe' ? 'heure' : x));
      expect(sansHeure(rf.json)).toEqual(sansHeure(rv.json));
    }
    expect((await f.etat('inconnue-xyz')).json).toEqual((await v.etat('inconnue-xyz')).json);
    await v.fermer();
    await f.fermer();
  });
});
