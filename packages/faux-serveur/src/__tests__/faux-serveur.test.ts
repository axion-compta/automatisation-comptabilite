import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';
import { demarrerNavigateur } from '../navigateur.js';

const H = 'http://exemple.fr';
const json = { 'content-type': 'application/json' };
const nouvelle = (cle: string, libelle = 'Achat fictif') => ({
  method: 'POST',
  headers: { ...json, 'idempotency-key': cle },
  body: JSON.stringify({ libelle, montantCentimes: 1250 }),
});

const serveur = setupServer();
beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
afterEach(() => serveur.resetHandlers());
afterAll(() => serveur.close());

describe('handlers du contrat', () => {
  it('crée puis liste une écriture, et rejoue la même clé sans doublon', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const a = await (await fetch(H + '/ecritures', nouvelle('cle-fictive-1'))).json();
    const b = await (await fetch(H + '/ecritures', nouvelle('cle-fictive-1'))).json();
    expect(b).toEqual(a);
    const liste = ((await (await fetch(H + "/ecritures")).json()) as { body: Array<Record<string, unknown>> }).body;
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ libelle: 'Achat fictif', montantCentimes: 1250, version: 1 });
  });

  it('refuse une écriture sans Idempotency-Key (400)', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const r = await fetch(H + '/ecritures', { method: 'POST', headers: json, body: JSON.stringify({ libelle: 'x', montantCentimes: 1 }) });
    expect(r.status).toBe(400);
  });
});

describe('pannes 409/423/403', () => {
  it('409 : version périmée, avec la version actuelle', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const e = ((await (await fetch(H + "/ecritures", nouvelle("cle-fictive-1"))).json()) as { body: { id: string } }).body;
    const put = (cle: string, version: number) =>
      fetch(H + '/ecritures/' + e.id, {
        method: 'PUT',
        headers: { ...json, 'idempotency-key': cle },
        body: JSON.stringify({ libelle: 'Achat modifié', montantCentimes: 900, version }),
      });
    expect((await put('cle-fictive-2', 1)).status).toBe(200);
    const r = await put('cle-fictive-3', 1);
    expect(r.status).toBe(409);
    expect(((await r.json()) as { data: unknown }).data).toEqual({ versionActuelle: 2 });
  });

  it('423, 403 et 409 à la demande par en-tête x-panne', async () => {
    serveur.use(...creerHandlers({ base: H }));
    for (const code of [423, 403]) {
      const init = nouvelle('cle-fictive-' + code);
      const r = await fetch(H + '/ecritures', { ...init, headers: { ...init.headers, 'x-panne': String(code) } });
      expect(r.status).toBe(code);
    }
    const r409 = await fetch(H + '/ecritures/E1', {
      method: 'PUT',
      headers: { ...json, 'idempotency-key': 'cle-fictive-9', 'x-panne': '409' },
      body: JSON.stringify({ libelle: 'Achat fictif', montantCentimes: 1, version: 1 }),
    });
    expect(r409.status).toBe(409);
  });

  it('panne par défaut configurée, la lecture reste possible', async () => {
    serveur.use(...creerHandlers({ base: H, panne: 423 }));
    expect((await fetch(H + '/ecritures', nouvelle('cle-fictive-1'))).status).toBe(423);
    expect((await fetch(H + '/ecritures')).status).toBe(200);
  });
});

describe('latence et pagination', () => {
  it('applique la latence demandée', async () => {
    serveur.use(...creerHandlers({ base: H, latenceMs: 80 }));
    const debut = Date.now();
    await fetch(H + '/ecritures');
    expect(Date.now() - debut).toBeGreaterThanOrEqual(70);
  });

  it('pagine avec limite seulement (contrat)', async () => {
    serveur.use(...creerHandlers({ base: H }));
    for (let i = 1; i <= 5; i++) await fetch(H + '/ecritures', nouvelle('cle-fictive-' + i, 'Achat ' + i));
    const p1 = await fetch(H + '/ecritures?limite=2');
    const page = (await p1.json()) as { body: Array<{ libelle: string }>; decalage: number; total: number };
    expect(page.body.map((e) => e.libelle)).toEqual(['Achat 1', 'Achat 2']);
    expect(page).toMatchObject({ decalage: 0, total: 5 });
    expect((await fetch(H + '/ecritures?limite=0')).status).toBe(400);
  });
});

describe('PUT et pannes, cas limites', () => {
  const put = (id: string, cle: string | null, corps: unknown) =>
    fetch(H + '/ecritures/' + id, {
      method: 'PUT',
      headers: { ...json, ...(cle ? { 'idempotency-key': cle } : {}) },
      body: JSON.stringify(corps),
    });
  const modif = { libelle: 'Achat modifié', montantCentimes: 900, version: 1 };

  it('PUT rejoué avec la même clé : même réponse, version augmentée une seule fois', async () => {
    serveur.use(...creerHandlers({ base: H }));
    await fetch(H + '/ecritures', nouvelle('cle-fictive-1'));
    const a = (await (await put('E1', 'cle-fictive-2', modif)).json()) as { body: { version: number } };
    const b = (await (await put('E1', 'cle-fictive-2', modif)).json()) as { body: { version: number } };
    expect(a.body.version).toBe(2);
    expect(b).toEqual(a);
    const liste = ((await (await fetch(H + '/ecritures')).json()) as { body: Array<{ version: number }> }).body;
    expect(liste[0]?.version).toBe(2);
  });

  it('PUT sans clé = 400', async () => {
    serveur.use(...creerHandlers({ base: H }));
    await fetch(H + '/ecritures', nouvelle('cle-fictive-1'));
    expect((await put('E1', null, modif)).status).toBe(400);
  });

  it('PUT sur un id inconnu = 404', async () => {
    serveur.use(...creerHandlers({ base: H }));
    expect((await put('E99', 'cle-fictive-2', modif)).status).toBe(404);
  });

  it('x-panne remplace la panne par défaut', async () => {
    serveur.use(...creerHandlers({ base: H, panne: 423 }));
    const init = nouvelle('cle-fictive-1');
    const r = await fetch(H + '/ecritures', { ...init, headers: { ...init.headers, 'x-panne': '403' } });
    expect(r.status).toBe(403);
  });

  it('corps invalide = 400 (POST et PUT)', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const r = await fetch(H + '/ecritures', { method: 'POST', headers: { ...json, 'idempotency-key': 'cle-fictive-1' }, body: '{"libelle":""}' });
    expect(r.status).toBe(400);
    await fetch(H + '/ecritures', nouvelle('cle-fictive-2'));
    expect((await put('E1', 'cle-fictive-3', { libelle: 'x' })).status).toBe(400);
  });

  it('le POST refuse la panne 409 (réservée au PUT)', async () => {
    serveur.use(...creerHandlers({ base: H }));
    const init = nouvelle('cle-fictive-1');
    const r = await fetch(H + '/ecritures', { ...init, headers: { ...init.headers, 'x-panne': '409' } });
    expect(r.status).toBe(200);
  });
});

describe('garde production', () => {
  it('refuse de démarrer en production', () => {
    const avant = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      expect(() => demarrerNavigateur()).toThrow('faux serveur interdit en production');
    } finally {
      process.env['NODE_ENV'] = avant;
    }
  });
});
