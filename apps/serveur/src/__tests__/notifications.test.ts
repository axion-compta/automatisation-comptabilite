import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const demarrer = () => {
  const a = creerApp();
  apps.push(a);
  let n = 0;
  const cle = () => ({ 'idempotency-key': `cle-essai-${++n}` });
  const lister = async (q = '') => (await a.inject({ method: 'GET', url: `/notifications${q}` })).json();
  const poster = (url: string, entetes: Record<string, string> = cle()) => a.inject({ method: 'POST', url, headers: entetes });
  return { lister, poster, cle };
};

describe('serveur : notifications', () => {
  it('liste-plus-recentes-d-abord', async () => {
    const { lister } = demarrer();
    const r = await lister();
    expect(r.body.map((n: { id: string }) => n.id)).toEqual(['no-1', 'no-3', 'no-2']);
    expect(r.total).toBe(3);
    expect((await lister('?limite=1&decalage=2')).body.map((n: { id: string }) => n.id)).toEqual(['no-2']);
  });

  it('filtre-non-lues', async () => {
    const { lister } = demarrer();
    expect((await lister('?nonLues=oui')).body.map((n: { id: string }) => n.id)).toEqual(['no-1', 'no-3']);
  });

  it('marquer-lue', async () => {
    const { lister, poster } = demarrer();
    const r = await poster('/notifications/no-1/lue');
    expect(r.statusCode).toBe(200);
    expect(r.json().body.lueLe).toBeTypeOf('string');
    expect((await lister('?nonLues=oui')).total).toBe(1);
  });

  it('marquer-deux-fois-meme-lue-le', async () => {
    const { poster } = demarrer();
    const un = (await poster('/notifications/no-1/lue')).json().body.lueLe;
    expect((await poster('/notifications/no-1/lue')).json().body.lueLe).toBe(un);
  });

  it('tout-lire-compte-les-non-lues', async () => {
    const { poster, lister } = demarrer();
    expect((await poster('/notifications/tout-lire')).json()).toEqual({ body: { marquees: 2 } });
    expect((await poster('/notifications/tout-lire')).json()).toEqual({ body: { marquees: 0 } });
    expect((await lister('?nonLues=oui')).total).toBe(0);
  });

  it('autre-personne-404-meme-corps', async () => {
    const { poster } = demarrer();
    const autre = await poster('/notifications/no-autre/lue');
    const inconnue = await poster('/notifications/no-inconnu/lue');
    expect(autre.statusCode).toBe(404);
    expect(inconnue.statusCode).toBe(404);
    expect(autre.json()).toEqual(inconnue.json());
    expect(autre.json().code).toBe('NOTIFICATION_INCONNUE');
  });

  it('sans-idempotency-key-400', async () => {
    const { poster, lister } = demarrer();
    expect((await poster('/notifications/no-1/lue', {})).statusCode).toBe(400);
    expect((await poster('/notifications/tout-lire', {})).statusCode).toBe(400);
    expect((await lister('?nonLues=oui')).total).toBe(2);
  });

  it('aucun-montant-ni-tiers-dans-le-schema', async () => {
    const { lister } = demarrer();
    for (const n of (await lister()).body) {
      expect(Object.keys(n).every((k) => ['id', 'categorie', 'gravite', 'titreCode', 'lien', 'creeLe', 'lueLe'].includes(k))).toBe(true);
    }
  });
});
