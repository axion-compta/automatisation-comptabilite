import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

const H = 'http://exemple.fr';
const AL = H + '/exercices/EX2026/alertes';
const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

const premiere = async () => ((await (await fetch(AL)).json()) as { body: Array<{ id: string; version: number }> }).body[0] as { id: string; version: number };
const poster = (action: string, id: string, extra: Record<string, string> = {}) =>
  fetch(`${AL}/${id}/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'cle-fictive-1', ...extra }, body: JSON.stringify({ version: 1 }) });

describe('faux serveur : actions sur les alertes', () => {
  it('pannes-403-409-423-sur-les-trois-routes', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const a = await premiere();
    const attendu: Array<[string, number, string]> = [['403', 403, 'FORBIDDEN'], ['409', 409, 'CONFLIT_VERSION'], ['423', 423, 'RESSOURCE_VERROUILLEE']];
    for (const action of ['annuler', 'reporter', 'ignorer'])
      for (const [panne, statut, code] of attendu) {
        const r = await poster(action, a.id, { 'x-panne': panne });
        expect([action, r.status, ((await r.json()) as { code: string }).code]).toEqual([action, statut, code]);
      }
    const conflit = (await (await poster('annuler', a.id, { 'x-panne': '409' })).json()) as { data: unknown };
    expect(conflit.data).toEqual({ versionActuelle: a.version });
  });

  it('panne-par-defaut-des-options-et-panne-inconnue-ignoree', async () => {
    serveur.use(...creerHandlers({ base: H, panne: 423 }));
    const a = await premiere();
    expect((await poster('annuler', a.id)).status).toBe(423);
    expect((await poster('annuler', a.id, { 'x-panne': '500' })).status).toBe(423);
    expect((await fetch(AL)).status).toBe(200);
  });

  it('un-seul-etat-lecture-et-ecriture', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const a = ((await (await fetch(AL)).json()) as { body: Array<{ id: string; regle: string; version: number }> }).body.find((x) => x.regle === 'ALR-08') as { id: string; version: number };
    const corps = JSON.stringify({ jours: 7, version: a.version });
    const r = await fetch(`${AL}/${a.id}/reporter`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'cle-fictive-2' }, body: corps });
    const lu = ((await (await fetch(AL + '?etat=reportee')).json()) as { body: Array<{ id: string }> }).body;
    expect([r.status, lu.some((x) => x.id === a.id)]).toEqual([200, true]);
  });

  it('un-service-neuf-par-fabrique', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const a = await premiere();
    await fetch(`${AL}/${a.id}/ignorer`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'cle-fictive-3' }, body: JSON.stringify({ motif: 'motif fictif', version: a.version }) });
    serveur.resetHandlers();
    serveur.use(...creerHandlers({ base: H }));
    expect((await premiere()).version).toBe(a.version);
  });
});
