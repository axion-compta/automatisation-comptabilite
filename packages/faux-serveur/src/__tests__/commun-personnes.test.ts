import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerServicePersonnes } from '../../../contrat/src/domaines/personnes-service.js';
import { creerHandlers } from '../handlers.js';
import { handlersPersonnes } from '../domaines/personnes.js';
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

const cibleFaux: CiblePersonnes = async (avecReglage) => {
  // Sans réglage : on monte directement `handlersPersonnes` sans `reglagesPersonnes`, pour exécuter son chemin 503.
  const options = { base: H, horloge: HORLOGE, dateReference: '2026-11-09', attendre: async () => {} };
  serveur.use(...(avecReglage ? creerHandlers({ base: H, horloge: HORLOGE, dateReferenceExploitation: '2026-11-09' }) : handlersPersonnes(options)));
  return {
    appeler: async (methode, chemin, corps, cle) => {
      const r = await fetch(H + chemin, { method: methode, headers: entetes(cle), ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
      return { status: r.status, json: await r.json() };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

suitePersonnes('serveur en mémoire (Fastify + oRPC)', cibleVrai);
suitePersonnes('faux serveur (MSW)', cibleFaux);

describe('refus sans source (service)', () => {
  // Les options des deux serveurs n'exposent ni `concernes` ni `gel` : la règle se prouve sur le service, avec un gel fictif.
  it('refus-gel-sans-source-source-manquante', () => {
    const service = creerServicePersonnes({ horloge: HORLOGE, dateReference: '2026-11-09', ...REGLAGES_FICTIFS, regles: [], gel: () => true, concernes: { 'dem-1': { nom: 'Camille Exemple' } } });
    const demande = service.enregistrer('cle-enreg-0001', { type: 'effacement', recue_le: '2026-11-09' });
    const corps = { issue: 'refus_gel' as const, motif: 'Motif fictif.' };
    expect(() => service.traiter('cle-gel-0001', demande.id, corps)).toThrow('SOURCE_MANQUANTE');
    expect(service.traiter('cle-gel-0002', demande.id, { ...corps, source: 'Source fictive.' }).etat).toBe('refusee');
  });
});

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
