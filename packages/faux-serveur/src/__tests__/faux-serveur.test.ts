import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { creerHandlers } from '../handlers.js';

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
    const liste = (await (await fetch(H + "/ecritures")).json()) as Array<Record<string, unknown>>;
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
    const e = (await (await fetch(H + "/ecritures", nouvelle("cle-fictive-1"))).json()) as { id: string };
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
    for (const code of [423, 403, 409]) {
      const init = nouvelle('cle-fictive-' + code);
      const r = await fetch(H + '/ecritures', { ...init, headers: { ...init.headers, 'x-panne': String(code) } });
      expect(r.status).toBe(code);
    }
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

  it('pagine avec limite et décalage', async () => {
    serveur.use(...creerHandlers({ base: H }));
    for (let i = 1; i <= 5; i++) await fetch(H + '/ecritures', nouvelle('cle-fictive-' + i, 'Achat ' + i));
    const p1 = await fetch(H + '/ecritures?limite=2');
    expect(((await p1.json()) as Array<{ libelle: string }>).map((e) => e.libelle)).toEqual(['Achat 1', 'Achat 2']);
    expect(p1.headers.get('x-total')).toBe('5');
    expect(p1.headers.get('x-decalage-suivant')).toBe('2');
    const p3 = await fetch(H + '/ecritures?limite=2&decalage=4');
    expect((await p3.json()) as unknown[]).toHaveLength(1);
    expect(p3.headers.get('x-decalage-suivant')).toBeNull();
    expect((await fetch(H + '/ecritures?limite=0')).status).toBe(400);
  });
});
