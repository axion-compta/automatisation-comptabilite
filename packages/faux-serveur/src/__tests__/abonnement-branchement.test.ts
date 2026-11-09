import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';
import { scenarioDeLaRequete } from '../domaines/options-abonnement.js';

const serveur = setupServer();
const inconnues: string[] = [];
beforeAll(() => {
  serveur.listen({ onUnhandledRequest: (req) => void inconnues.push(req.method + ' ' + req.url) });
});
afterEach(() => {
  serveur.resetHandlers();
  inconnues.length = 0;
});
afterAll(() => serveur.close());

const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['GET', '/acces'],
  ['GET', '/volume'],
  ['POST', '/abonnement/demandes-palier'],
  ['GET', '/fin-contrat'],
  ['POST', '/fin-contrat/accuse'],
  ['POST', '/fin-contrat/gel'],
  ['POST', '/fin-contrat/gel/levee'],
  ['GET', '/documents-contractuels/a-accepter'],
  ['POST', '/acceptations'],
];
const appeler = (base: string, [methode, chemin]: readonly [string, string]) =>
  fetch(base + chemin, { method: methode, ...(methode === 'POST' ? { body: '{}', headers: { 'content-type': 'application/json' } } : {}) });

describe('faux serveur : branchement de l\'abonnement', () => {
  it('neuf-routes-interceptees', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr' }));
    expect(ROUTES).toHaveLength(9);
    for (const r of ROUTES) {
      const rep = await appeler('http://exemple.fr', r);
      expect(rep.status, r.join(' ')).not.toBe(404);
    }
    expect(inconnues).toEqual([]);
  });

  it('entete-scenario-prioritaire', () => {
    const req = new Request('http://exemple.fr/acces', { headers: { 'x-scenario-abonnement': 'acces=lecture_seule' } });
    expect(scenarioDeLaRequete(req, { scenarioParDefaut: 'acces=actif' })).toBe('acces=lecture_seule');
    expect(scenarioDeLaRequete(new Request('http://exemple.fr/acces'), { scenarioParDefaut: 'acces=actif' })).toBe('acces=actif');
  });

  it('scenario-absent-null', () => {
    expect(scenarioDeLaRequete(new Request('http://exemple.fr/acces'), { scenarioParDefaut: null })).toBeNull();
  });

  it('base-appliquee', async () => {
    serveur.use(...creerHandlers({ base: 'http://localhost:3000' }));
    for (const r of ROUTES) expect((await appeler('http://localhost:3000', r)).status, r.join(' ')).not.toBe(404);
    await appeler('http://exemple.fr', ROUTES[0]!).catch(() => undefined);
    expect(inconnues.some((u) => u.includes('exemple.fr/acces'))).toBe(true);
  });

  it('routes-existantes-inchangees', async () => {
    serveur.use(...creerHandlers({ base: 'http://exemple.fr' }));
    const rep = await fetch('http://exemple.fr/ecritures');
    expect(rep.status).toBe(200);
    expect(await rep.json()).toHaveProperty('body');
    expect((await fetch('http://exemple.fr/ecritures?limite=0')).status).toBe(400);
  });
});
