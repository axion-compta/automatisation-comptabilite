import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { creerApp } from '../../../../apps/serveur/src/app.js';
import { creerServicePropositions } from '../../../../apps/serveur/src/domaines/chat-propositions.js';
import { creerHandlers } from '../handlers.js';
import { suiteContrat, type Appeler, type Cible } from './suite-contrat.js';
import { suitePlan } from './suite-plan.js';
import { suiteTiers } from './suite-tiers.js';
import { suiteTableauDeBord } from './suite-tableau-de-bord.js';
import { suiteAlertes } from './suite-alertes.js';
import { suiteAlertesActions } from './suite-alertes-actions.js';
import { suitePreferences } from './suite-preferences.js';
import { suiteRecherche } from './suite-recherche.js';
import { suiteExports } from './suite-exports.js';
import { suiteCalendrier } from './suite-calendrier.js';
import { suiteNotifications } from './suite-notifications.js';
import { suiteTva } from './suite-tva.js';
import { suiteChange } from './suite-change.js';
import { suiteSante } from './suite-sante.js';
import { suiteTresorerie } from './suite-tresorerie.js';
import { suiteBloquants } from './suite-bloquants.js';
import { suiteSources } from './suite-sources.js';
import { suiteJuridique } from './suite-juridique.js';
import { creerHandlersJuridique } from '../domaines/juridique.js';
import { creerServiceJuridique } from '../../../contrat/src/domaines/juridique-service.js';
import { routesJuridique } from '../../../../apps/serveur/src/domaines/juridique.js';
import { genererJuridique } from '../../../donnees-fictives/src/juridique.js';
import { suiteBanque } from './suite-banque.js';
import { suiteBanqueSuivi } from './suite-banque-suivi.js';
import { suitePrincipes } from './suite-principes.js';
import { suiteChat, type CibleChat } from './suite-chat.js';
import { AJOUTS, DEBUT, REGLAGES, suiteChatPropositions, type CiblePropositions } from './suite-chat-propositions.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };

const cibleVrai: Cible = async () => {
  const app = creerApp();
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await app.inject({
      method: methode as 'GET',
      url: chemin,
      headers: { ...(corps === undefined ? {} : json), ...entetes },
      ...(corps === undefined ? {} : { payload: corps as object }),
    });
    return { status: r.statusCode, json: r.json() };
  };
  return { appeler, fermer: () => app.close() };
};

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const cibleFaux: Cible = async () => {
  serveur.use(...creerHandlers({ base: H }));
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await fetch(H + chemin, {
      method: methode,
      headers: { ...(corps === undefined ? {} : json), ...entetes },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    return { status: r.status, json: await r.json() };
  };
  return { appeler, fermer: async () => serveur.resetHandlers() };
};

const cibleChatVrai: CibleChat = async () => {
  const app = creerApp();
  return {
    appeler: async (chemin, entetes, corps) => {
      const r = await app.inject({ method: 'POST', url: chemin, headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { payload: corps as object }) });
      return { status: r.statusCode, texte: r.body, type: String(r.headers['content-type']) };
    },
    fermer: () => app.close(),
  };
};

const cibleChatFaux: CibleChat = async () => {
  serveur.use(...creerHandlers({ base: H }));
  return {
    appeler: async (chemin, entetes, corps) => {
      const r = await fetch(H + chemin, { method: 'POST', headers: { ...(corps === undefined ? {} : json), ...entetes }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }) });
      return { status: r.status, texte: await r.text(), type: r.headers.get('content-type') ?? '' };
    },
    fermer: async () => serveur.resetHandlers(),
  };
};

const cibleProposVrai: CiblePropositions = async ({ acteur }) => {
  const t = { ms: Date.parse(DEBUT) };
  const service = creerServicePropositions({ acteur, horloge: () => new Date(t.ms).toISOString(), reglages: REGLAGES });
  for (const e of AJOUTS) service.ajouter(e);
  const app = creerApp(undefined, { propositions: service });
  const appeler: Appeler = async (methode, chemin, entetes, corps) => {
    const r = await app.inject({ method: methode as 'GET', url: chemin, headers: { ...(corps === undefined ? {} : json), ...entetes } });
    return { status: r.statusCode, json: r.json() };
  };
  return { appeler, avancer: (ms) => void (t.ms += ms), fermer: () => app.close() };
};

const cibleProposFaux: CiblePropositions = async ({ acteur }) => {
  const t = { ms: Date.parse(DEBUT) };
  serveur.use(...creerHandlers({ base: H, propositions: { acteur, horloge: () => new Date(t.ms).toISOString(), reglages: REGLAGES, ajouts: AJOUTS } }));
  const appeler: Appeler = async (methode, chemin, entetes) => {
    const r = await fetch(H + chemin, { method: methode, ...(entetes ? { headers: entetes } : {}) });
    return { status: r.status, json: await r.json() };
  };
  return { appeler, avancer: (ms) => void (t.ms += ms), fermer: async () => serveur.resetHandlers() };
};

suiteContrat('vrai serveur (Fastify + oRPC)', cibleVrai);
suitePlan('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteTiers('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteTableauDeBord('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteAlertes('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteAlertesActions('vrai serveur (Fastify + oRPC)', cibleVrai);
suitePreferences('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteRecherche('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteExports('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteCalendrier('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteNotifications('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteContrat('faux serveur (MSW)', cibleFaux);
suitePlan('faux serveur (MSW)', cibleFaux);
suiteTiers('faux serveur (MSW)', cibleFaux);
suiteTableauDeBord('faux serveur (MSW)', cibleFaux);
suiteAlertes('faux serveur (MSW)', cibleFaux);
suiteAlertesActions('faux serveur (MSW)', cibleFaux);
suitePreferences('faux serveur (MSW)', cibleFaux);
suiteRecherche('faux serveur (MSW)', cibleFaux);
suiteExports('faux serveur (MSW)', cibleFaux);
suiteCalendrier('faux serveur (MSW)', cibleFaux);
suiteNotifications('faux serveur (MSW)', cibleFaux);
suiteChat('vrai serveur (Fastify + oRPC)', cibleChatVrai);
suiteChat('faux serveur (MSW)', cibleChatFaux);
suiteChatPropositions('vrai serveur (Fastify + oRPC)', cibleProposVrai);
suiteChatPropositions('faux serveur (MSW)', cibleProposFaux);
suiteBanque('vrai serveur (Fastify + oRPC)', cibleVrai, false);
suiteBanque('faux serveur (MSW)', cibleFaux, true);
suiteBanqueSuivi('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteBanqueSuivi('faux serveur (MSW)', cibleFaux);
suitePrincipes('vrai serveur (Fastify + oRPC)', cibleVrai);
suitePrincipes('faux serveur (MSW)', cibleFaux);
suiteTva('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteTva('faux serveur (MSW)', cibleFaux);
suiteChange('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteChange('faux serveur (MSW)', cibleFaux);
suiteSante('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteSante('faux serveur (MSW)', cibleFaux);
suiteTresorerie('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteTresorerie('faux serveur (MSW)', cibleFaux);
suiteBloquants('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteBloquants('faux serveur (MSW)', cibleFaux);
suiteSources('vrai serveur (Fastify + oRPC)', cibleVrai);
suiteSources('faux serveur (MSW)', cibleFaux);

// Le vrai serveur ne sert que la SARL par défaut (app.ts hors périmètre) : la SCI passe par la procédure du serveur, appelée directement.
const SIREN_SCI = genererJuridique().obligations[1]!.societeSiren;
const cibleSciVrai: Cible = async () => {
  const procedure = routesJuridique(creerServiceJuridique(SIREN_SCI)).lireObligationsJuridiques;
  const appeler: Appeler = async () => ({ status: 200, json: await procedure['~orpc'].handler({ input: { params: { exercice: 'EX2026' } }, errors: {} } as never) });
  return { appeler, fermer: async () => undefined };
};
const cibleSciFaux: Cible = async () => {
  const c = await cibleFaux();
  serveur.use(...creerHandlersJuridique(H, async () => undefined, SIREN_SCI));
  return c;
};
suiteJuridique('vrai serveur (Fastify + oRPC)', cibleVrai, cibleSciVrai);
suiteJuridique('faux serveur (MSW)', cibleFaux, cibleSciFaux);
