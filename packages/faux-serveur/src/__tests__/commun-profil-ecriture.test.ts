import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerFauxSessions } from '../../../noyau/src/session/memoire.js';
import type { Session } from '../../../noyau/src/session/port.js';
import { creerHandlers } from '../handlers.js';
import { suiteProfilEcriture } from './suite-profil-ecriture.js';
import type { Appeler, Cible } from './suite-contrat.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };

/** Vrai serveur avec jeton : session fictive de la société `soc-lemoine`, en-tête `authorization: Bearer` sur chaque appel. */
const JETON_FICTIF = 'jeton-fictif-lemoine';
const SESSION_FICTIVE: Session = {
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-saisir'], revendications: {},
};
const vrai: Cible = async () => {
  const app = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions({ [JETON_FICTIF]: SESSION_FICTIVE }) } } });
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await app.inject({ method: methode as 'GET', url: chemin, headers: { authorization: 'Bearer ' + JETON_FICTIF, ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { payload: corps as object }) });
    return { status: r.statusCode, json: r.json() };
  };
  return { appeler, fermer: () => app.close() };
};
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());
const faux: Cible = async () => {
  serveur.use(...creerHandlers({ base: H }));
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await fetch(H + chemin, { method: methode, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
    return { status: r.status, json: await r.json() };
  };
  return { appeler, fermer: async () => serveur.resetHandlers() };
};

suiteProfilEcriture('vrai serveur (Fastify + oRPC)', vrai);
suiteProfilEcriture('faux serveur (MSW)', faux);
