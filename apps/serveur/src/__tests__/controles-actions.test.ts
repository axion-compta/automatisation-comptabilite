import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { creerServiceControlesActions, type Session } from '../domaines/controles-actions.js';
import type { TraceControle } from '../../../../packages/noyau/src/controles/moteur.js';

const PERM = 'compta-lever-bloquant';
const BONNE: Session = { sorte: 'personne', par: 'Alice Exemple', permissions: [PERM], reauthentifie: true };
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));

const trace = (regleId: string): TraceControle => ({ horodatage: new Date(Date.UTC(2026, 3, 1, 8)).toISOString(), declencheur: 'nocturne', regleId, versionRegle: 1, objetType: 'piece', objetId: 'p1', resultat: 'ALERTE' });
function monter(session: Session | null = BONNE, horloge: () => string = () => '2026-04-02T08:00:00Z', regles = ['CC-T01', 'TVA-C01']) {
  const service = creerServiceControlesActions({ traces: regles.map(trace), horloge });
  const app = creerApp(undefined, { controlesActions: service, session: () => session ?? undefined });
  apps.push(app);
  return app;
}
const cle = (c = 'cle-00001') => ({ 'idempotency-key': c });
const ecarter = (app: ReturnType<typeof creerApp>, trace: string, payload: unknown = { motif: 'Motif fictif' }, entetes = cle()) =>
  app.inject({ method: 'POST', url: `/controles/${trace}/ecarter`, headers: entetes, payload: payload as object });

describe('serveur : écarter un contrôle', () => {
  it('CT-44 http', async () => {
    const app = monter();
    const refus = await ecarter(app, 'CC-T01~p1');
    expect(refus.statusCode).toBe(422);
    expect(refus.json().data).toEqual({ code: 'controle_non_ecartable' });
    const ok = await ecarter(app, 'TVA-C01~p1');
    expect(ok.statusCode).toBe(200);
    expect(ok.json().body).toMatchObject({ regleId: 'TVA-C01', resultat: 'ECARTE', motif: 'Motif fictif', par: 'Alice Exemple', horodatage: '2026-04-02T08:00:00Z' });
  });
  it('agent-403', async () => {
    const app = monter({ ...BONNE, sorte: 'agent' });
    expect((await ecarter(app, 'TVA-C01~p1')).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/controles/reverifier', headers: cle(), payload: { exercice: 'EX2026' } })).statusCode).toBe(403);
  });
  it('sans-permission-403', async () => {
    const r = await ecarter(monter({ ...BONNE, permissions: ['compta-lire'] }), 'TVA-C01~p1');
    expect(r.statusCode).toBe(403);
    expect(r.json().code).toBe('PERMISSION_MANQUANTE');
  });
  it('sans-reauthentification-401', async () => {
    const r = await ecarter(monter({ ...BONNE, reauthentifie: false }), 'TVA-C01~p1');
    expect(r.statusCode).toBe(401);
    expect(r.json().code).toBe('REAUTHENTIFICATION_REQUISE');
  });
  it('sans-session-401', async () => {
    const app = monter(null);
    expect((await ecarter(app, 'TVA-C01~p1')).json().code).toBe('NON_AUTHENTIFIE');
    expect((await app.inject({ method: 'POST', url: '/controles/reverifier', headers: cle(), payload: { exercice: 'EX2026' } })).statusCode).toBe(401);
  });
  it('motif-vide-et-trace-inconnue', async () => {
    const app = monter();
    for (const motif of ['', '   ']) {
      const r = await ecarter(app, 'TVA-C01~p1', { motif });
      expect([r.statusCode, r.json().data]).toEqual([422, { code: 'motif_obligatoire' }]);
    }
    expect((await ecarter(app, 'XX-000~p9')).statusCode).toBe(404);
  });
  it('entree-sans-personne-ni-societe', async () => {
    const app = monter();
    for (const extra of [{ par: 'Intrus Exemple' }, { societe: 'societe-fictive' }, { permissions: [PERM] }]) {
      expect((await ecarter(app, 'TVA-C01~p1', { motif: 'Motif fictif', ...extra })).statusCode).toBe(400);
    }
    expect((await ecarter(app, 'TVA-C01~p1', { motif: 'Motif fictif' }, {} as never)).statusCode).toBe(400);
  });
  it('idempotence', async () => {
    let n = 0;
    const app = monter(BONNE, () => `2026-04-02T08:00:0${++n}Z`, ['TVA-C01', 'TVA-C02']);
    const a = await ecarter(app, 'TVA-C01~p1');
    const b = await ecarter(app, 'TVA-C01~p1');
    expect([b.statusCode, b.json()]).toEqual([200, a.json()]);
    expect(b.json().body.horodatage).toBe('2026-04-02T08:00:01Z');
    const c = await ecarter(app, 'TVA-C02~p1', { motif: 'Motif fictif' }, cle('cle-00002'));
    expect(c.json().body.horodatage).toBe('2026-04-02T08:00:02Z');
  });
});

describe('serveur : revérifier', () => {
  it('perimetre-de-l-exercice', async () => {
    const app = monter();
    const r = await app.inject({ method: 'POST', url: '/controles/reverifier', headers: cle(), payload: { exercice: 'EX2026' } });
    expect([r.statusCode, r.json().body]).toEqual([200, { exercice: 'EX2026', verifiees: 2, ouvertes: 2 }]);
    await ecarter(app, 'TVA-C01~p1');
    const apres = await app.inject({ method: 'POST', url: '/controles/reverifier', headers: cle('cle-00002'), payload: { exercice: 'EX2026' } });
    expect(apres.json().body).toEqual({ exercice: 'EX2026', verifiees: 2, ouvertes: 1 });
  });
  it('exercice-inconnu-et-entree-invalide', async () => {
    const app = monter();
    const post = (payload: object, h = cle()) => app.inject({ method: 'POST', url: '/controles/reverifier', headers: h, payload });
    expect((await post({ exercice: 'EX1999' })).statusCode).toBe(404);
    expect((await post({ exercice: '' })).statusCode).toBe(400);
    expect((await post({ exercice: 'EX2026', societe: 'x' })).statusCode).toBe(400);
  });
});
