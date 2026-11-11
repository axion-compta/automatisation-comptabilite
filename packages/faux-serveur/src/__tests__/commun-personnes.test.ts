import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerServicePersonnes } from '../../../contrat/src/domaines/personnes-service.js';
import { creerHandlers } from '../handlers.js';
import { handlersPersonnes } from '../domaines/personnes.js';
import { suitePersonnes, type CiblePersonnes } from './suite-personnes.js';

vi.mock('../../../contrat/src/domaines/personnes-service.js', async (o) => { const m = await o<Record<string, never>>(); return { ...m, creerServicePersonnes: vi.fn(m['creerServicePersonnes']) }; }); // espion
const H = 'http://exemple.fr';
const HORLOGE = () => '2026-11-09T10:00:00Z';
const REGLAGES_FICTIFS = { moisReponse: 2, joursRappel: 3 }; // inventés : ni délai ni durée réels
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());
const entetes = (cle: string | undefined) => ({ 'content-type': 'application/json', ...(cle === undefined ? {} : { 'idempotency-key': cle }) });
const cibleVrai: CiblePersonnes = async (avecReglage) => {
  const app = creerApp(undefined, { exploitation: { horloge: HORLOGE, dateReference: '2026-11-09', ...(avecReglage ? { reglagesPersonnes: REGLAGES_FICTIFS, reglesConservation: [] } : {}) } });
  return {
    appeler: async (methode, chemin, corps, cle) => {
      const r = await app.inject({ method: methode, url: chemin, headers: entetes(cle), ...(corps === undefined ? {} : { payload: JSON.stringify(corps) }) });
      return { status: r.statusCode, json: r.json() };
    },
    fermer: () => app.close(),
  };
};
const cibleFaux: CiblePersonnes = async (avecReglage) => {
  serveur.use(...(avecReglage ? creerHandlers({ base: H, horloge: HORLOGE, dateReferenceExploitation: '2026-11-09' }) : handlersPersonnes({ base: H, horloge: HORLOGE, dateReference: '2026-11-09', attendre: async () => {} })));
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
describe('refus sans source (service)', () => { // les options des serveurs n'exposent ni `concernes` ni `gel` : preuve sur le service
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
    const taille = async (c: Awaited<ReturnType<CiblePersonnes>>) => ((await c.appeler('GET', '/personnes/demandes')).json as { body: unknown[] }).body.length;
    const a = await cibleFaux(true);
    await a.appeler('POST', '/personnes/demandes', { type: 'acces', recue_le: '2026-11-09' }, 'cle-instance-1');
    expect(await taille(a)).toBe(7);
    await a.fermer();
    expect(await taille(await cibleFaux(true))).toBe(6);
  });
});
it('service-cree-a-la-premiere-requete-seulement', async () => { // le jeu RGPD (node:crypto) n'est pas généré au montage des handlers
  vi.mocked(creerServicePersonnes).mockClear();
  const c = await cibleFaux(true);
  expect(creerServicePersonnes).not.toHaveBeenCalled();
  await c.appeler('GET', '/personnes/demandes');
  expect(creerServicePersonnes).toHaveBeenCalledTimes(1);
});
it('personnes-service-jamais-importe-statiquement', () => expect(readFileSync(new URL('../domaines/personnes.ts', import.meta.url), 'utf8')).not.toMatch(/^import (?!type)[^\n]*personnes-service/m)); // sinon node:crypto est évalué au démarrage du navigateur
