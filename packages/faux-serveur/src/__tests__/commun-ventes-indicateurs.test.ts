import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerServiceIndicateurs } from '../../../contrat/src/domaines/ventes-indicateurs-service.js';
import { creerHandlers } from '../handlers.js';
import type { CibleVentes } from './suite-ventes.js';
import { suiteVentesIndicateurs } from './suite-ventes-indicateurs.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleVrai: CibleVentes = async () => {
  const app = creerApp();
  return {
    lire: async (chemin) => {
      const r = await app.inject({ method: 'GET', url: chemin });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};

const cibleFaux: CibleVentes = async () => {
  serveur.use(...creerHandlers({ base: H }));
  return {
    lire: async (chemin) => {
      const r = await fetch(H + chemin);
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suiteVentesIndicateurs('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteVentesIndicateurs('faux serveur (MSW)', cibleFaux);

describe('indicateurs de ventes : vrai et faux serveur', () => {
  it('memes-reponses-vrai-et-faux', async () => {
    const [v, f] = [await cibleVrai(), await cibleFaux()];
    for (const chemin of ['/ventes/indicateurs?mois=2026-01', '/ventes/indicateurs?mois=2026-01&avecPropositions=true', '/ventes/series', '/ventes/indicateurs?mois=2026-13']) {
      const [rv, rf] = [await v.lire(chemin), await f.lire(chemin)];
      expect(rf.status, chemin).toBe(rv.status);
      if (rv.status === 200) expect(rf.json, chemin).toEqual(rv.json);
    }
    await v.fermer();
    await f.fermer();
  });
  it('societe-vide-tout-a-zero', () => {
    const c = creerServiceIndicateurs(undefined, { profil: 'vide' }).lireIndicateurs('2026-01');
    expect([c.chiffreAffaires.montantCentimes, c.aEncaisser.montantCentimes, c.enRetard.clients]).toEqual([0, 0, 0]);
  });
});
