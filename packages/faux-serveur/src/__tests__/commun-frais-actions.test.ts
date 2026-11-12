import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerHandlers } from '../handlers.js';
import { suiteFraisActions } from './suite-frais-actions.js';
import type { Appeler, Cible } from './suite-contrat.js';
import { creerFauxSessions } from '../../../noyau/src/session/memoire.js';
import type { Session } from '../../../noyau/src/session/port.js';
import { PREFIXE_ROUTES_SOCIETE } from '../../../contrat/src/prefixe-routes.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };

const JETON = 'jeton-fictif-lemoine';
const SESSION: Session = {
  personneId: 'PER-01', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-deposer', 'compta-valider'], revendications: {},
};
const vrai: Cible = async () => {
  const app = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions({ [JETON]: SESSION }) } } });
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await app.inject({ method: methode as 'GET', url: chemin, headers: { authorization: 'Bearer ' + JETON, ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { payload: corps as object }) });
    return { status: r.statusCode, json: r.json() };
  };
  return { appeler, fermer: () => app.close() };
};
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());
const demarrer = (): Appeler => async (methode, chemin, entetes, corps) => {
  const r = await fetch(H + chemin, { method: methode, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
  return { status: r.status, json: await r.json() };
};
const faux: Cible = async () => {
  serveur.use(...creerHandlers({ base: H }));
  return { appeler: demarrer(), fermer: async () => serveur.resetHandlers() };
};

suiteFraisActions('vrai serveur (Fastify + oRPC)', vrai);
suiteFraisActions('faux serveur (MSW)', faux);

describe('faux serveur : état par instance', () => {
  it('etat-par-instance', async () => {
    const entetesAvec = (cle: string) => ({ 'idempotency-key': cle, 'x-personne': 'PER-01' });
    const corps = { nature: 'depense', personneId: 'PER-01', date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234 };
    const creer = async (cle: string) => {
      serveur.resetHandlers();
      serveur.use(...creerHandlers({ base: H }));
      return (await demarrer()('POST', PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine') + '/frais', entetesAvec(cle), corps)).json as { body: { id: string } };
    };
    const un = await creer('cle-instance-01');
    const deux = await creer('cle-instance-02');
    expect(deux.body.id).toBe(un.body.id);
  });
});
