import { afterEach, describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import { creerServiceFraisActions } from '../../../../packages/contrat/src/domaines/frais-actions-service.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import type { Permission } from '../../../../packages/noyau/src/securite/types.js';
import { creerApp } from '../app.js';
import { routesFraisActions, type TraceSaisie } from '../domaines/frais-actions.js';

const session = (personneId: string, permissions: Permission[]): Session => ({
  personneId, nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions, revendications: {},
});
const JETON = 'jeton-fictif-droits';
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));
/** Vrai serveur avec une session fictive aux droits donnés ; chaque URL reçoit le préfixe de la société. */
const monter = (personneId: string, permissions: Permission[]) => {
  const a = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions({ [JETON]: session(personneId, permissions) }) } } });
  apps.push(a);
  let n = 0;
  return (methode: 'GET' | 'POST', url: string, payload?: object, entetes: Record<string, string> = {}) =>
    a.inject({ method: methode, url: PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine') + url, headers: { authorization: 'Bearer ' + JETON, 'idempotency-key': 'cle-droits-' + String(++n).padStart(4, '0'), ...entetes }, ...(payload === undefined ? {} : { payload }) });
};
const depense = (personneId: string) => ({ nature: 'depense', personneId, date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234 });

describe('serveur : droits des frais, identité de la session', () => {
  it('sans-droit-lire-403', async () => {
    const sans = monter('PER-01', ['compta-saisir']);
    for (const url of ['/frais', '/frais/FRA-003', '/vehicules?personne=PER-01', '/parametres/bareme_ik_voiture?date=2025-06-15']) {
      const r = await sans('GET', url);
      expect([url, r.statusCode, r.json().code]).toEqual([url, 403, 'DROIT_REFUSE']);
    }
    expect((await monter('PER-01', ['compta-lire'])('GET', '/frais')).statusCode).toBe(200);
  });

  it('deposer-pour-soi-accepte', async () => {
    const r = await monter('PER-01', ['compta-deposer'])('POST', '/frais', depense('PER-01'));
    expect([r.statusCode, r.json().body.personneId]).toEqual([201, 'PER-01']);
  });

  it('deposer-pour-autrui-403', async () => {
    const r = await monter('PER-01', ['compta-deposer'])('POST', '/frais', depense('PER-02'));
    expect([r.statusCode, r.json().code]).toEqual([403, 'PERSONNE_DIFFERENTE']);
    expect((await monter('PER-01', ['compta-lire'])('POST', '/frais', depense('PER-01'))).statusCode).toBe(403);
  });

  it('saisir-pour-autrui-trace', async () => {
    const traces: TraceSaisie[] = [];
    const routes = routesFraisActions(creerServiceFraisActions(), (t) => void traces.push(t));
    const contexte = { sessionVerifiee: session('PER-09', ['compta-saisir']) };
    const entree: Record<string, unknown> = { params: { s: 'soc-lemoine' }, headers: { 'idempotency-key': 'cle-trace-0001' }, body: depense('PER-02') };
    const r = (await call(routes.creerFrais, entree as never, { context: contexte })) as { body: { personneId: string } };
    expect(r.body.personneId).toBe('PER-02');
    expect(traces).toEqual([{ societeId: 'soc-lemoine', acteur: 'PER-09', pour: 'PER-02', action: 'creerFrais' }]);
    const lui = { sessionVerifiee: session('PER-02', ['compta-saisir']) };
    await call(routes.creerFrais, { ...entree, headers: { 'idempotency-key': 'cle-trace-0002' } } as never, { context: lui });
    expect(traces).toHaveLength(1);
  });

  it('valider-sans-compta-valider-403', async () => {
    const sans = monter('PER-01', ['compta-lire', 'compta-saisir']);
    const appels = [['POST', '/frais/FRA-005/proposer', undefined], ['POST', '/frais/valider', { ids: ['FRA-005'] }], ['POST', '/remboursements', { personneId: 'PER-01', fraisIds: ['FRA-003'] }]] as const;
    for (const [m, url, corps] of appels) {
      const r = await sans(m, url, corps as object | undefined);
      expect([url, r.statusCode, r.json().code]).toEqual([url, 403, 'DROIT_REFUSE']);
    }
    expect((await monter('PER-01', ['compta-valider'])('POST', '/frais/valider', { ids: ['FRA-005'] })).statusCode).toBe(200);
  });

  it('x-personne-ignore-hors-test', async () => {
    const moi = monter('PER-01', ['compta-deposer']);
    const autre = { 'x-personne': 'PER-02' };
    expect((await moi('POST', '/frais', depense('PER-02'), autre)).statusCode).toBe(403);
    expect((await moi('POST', '/frais', depense('PER-01'), autre)).statusCode).toBe(201);
    const valide = await monter('PER-01', ['compta-valider'])('POST', '/frais/valider', { ids: ['FRA-005'] }, autre);
    expect(valide.statusCode).toBe(200);
  });
});
