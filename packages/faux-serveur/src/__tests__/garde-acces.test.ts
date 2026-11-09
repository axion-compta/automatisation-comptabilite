import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';
import { creerApp } from '../../../../apps/serveur/src/app.js';

const H = 'http://exemple.fr';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const appel = (methode: string, chemin: string, acces: string | null, corps: unknown = {}) =>
  fetch(H + chemin, {
    method: methode,
    headers: { 'content-type': 'application/json', 'idempotency-key': 'cle-garde-0001', ...(acces === null ? {} : { 'x-scenario-abonnement': 'acces=' + acces }) },
    ...(methode === 'GET' ? {} : { body: JSON.stringify(corps) }),
  });
const refuse = async (r: Response) => r.status === 403 && ((await r.json()) as { code?: string }).code === 'ETAT_ACCES';
const NOUVELLE = { libelle: 'Achat fictif', montantCentimes: 100 };

describe('faux serveur : garde d état d accès', () => {
  it('ecriture-refusee-en-lecture-seule-403', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const r = await appel('POST', '/ecritures', 'lecture_seule', NOUVELLE);
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ code: 'ETAT_ACCES', status: 403, data: { etat: 'LECTURE_SEULE', raison: 'etat' } });
    expect(await refuse(await appel('PUT', '/ecritures/e1', 'suspendu'))).toBe(true);
  });

  it('lecture-permise-dans-les-six-etats', async () => {
    serveur.use(...creerHandlers({ base: H }));
    for (const e of ['essai', 'actif', 'delai_de_grace', 'lecture_seule', 'suspendu', 'resilie']) {
      expect((await appel('GET', '/ecritures', e)).status, e).toBe(200);
    }
  });

  it('routes-compte-permises-en-resilie', async () => {
    serveur.use(...creerHandlers({ base: H }));
    // Une route sans handler du faux serveur échoue en « non gérée » : elle a passé la garde, donc n'est pas refusée.
    const refusee = (m: string, u: string) => appel(m, u, 'resilie').then(refuse, () => false);
    for (const [m, u] of [['POST', '/fin-contrat/accuse'], ['POST', '/fin-contrat/gel'], ['POST', '/abonnement/demandes-palier'], ['POST', '/acceptations'], ['POST', '/exports']] as const) {
      expect(await refusee(m, u), u).toBe(false);
    }
    expect(await refuse(await appel('POST', '/exercices/2026/alertes/a1/reporter', 'resilie'))).toBe(true);
  });

  it('actif-rien-ne-change', async () => {
    serveur.use(...creerHandlers({ base: H }));
    expect((await appel('POST', '/ecritures', null, NOUVELLE)).status).toBe(200);
    expect((await appel('POST', '/ecritures', 'actif', NOUVELLE)).status).toBe(200);
  });

  it('scenario-par-defaut-de-l-option-et-panne-distincte', async () => {
    serveur.use(...creerHandlers({ base: H, scenarioAbonnement: 'acces=lecture_seule' }));
    expect(await refuse(await appel('POST', '/ecritures', null, NOUVELLE))).toBe(true);
    serveur.resetHandlers();
    serveur.use(...creerHandlers({ base: H, panne: 403 }));
    const p = (await (await appel('POST', '/ecritures', 'actif', NOUVELLE)).json()) as { code: string };
    expect(p.code).toBe('FORBIDDEN');
  });

  it('format-erreur-identique-vrai-et-faux', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const faux = await appel('POST', '/ecritures', 'lecture_seule', NOUVELLE);
    const app = creerApp(undefined, { abonnement: { scenario: 'acces=lecture_seule' } });
    const vrai = await app.inject({ method: 'POST', url: '/ecritures', headers: { 'idempotency-key': 'cle-garde-0001', 'content-type': 'application/json' }, payload: NOUVELLE });
    await app.close();
    expect(vrai.statusCode).toBe(faux.status);
    expect(vrai.json()).toEqual(await faux.json());
  });
});
