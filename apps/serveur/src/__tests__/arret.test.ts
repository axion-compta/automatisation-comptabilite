import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import type { OptionsSecurite } from '../securite/index.js';
import type { Drapeaux } from '../../../../packages/noyau/src/securite/arret.js';

const marque = { depuis: '2026-01-01T00:00:00.000Z', par: 'admin-fictif' };
const LIBRE: Drapeaux = { societes: {} };
const CORPS = { defined: false, code: 'ARRET_URGENCE', status: 503, message: 'ARRET_URGENCE' };
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = (securite: OptionsSecurite) => {
  const a = creerApp(undefined, { securite });
  apps.push(a);
  return a;
};
const get = (a: ReturnType<typeof creerApp>, url = '/ecritures') => a.inject({ method: 'GET', url });

describe('securite/arret', () => {
  it('global-toutes-routes-503', async () => {
    const a = neuf({ arret: { lire: () => ({ global: marque, societes: {} }) } });
    for (const url of ['/ecritures', '/ecritures/E1', '/inconnue']) {
      const r = await get(a, url);
      expect(r.statusCode).toBe(503);
      expect(r.json()).toEqual(CORPS);
    }
    const ecrire = await a.inject({ method: 'POST', url: '/ecritures', payload: {} });
    expect(ecrire.statusCode).toBe(503);
  });

  it('societe-a-503-societe-b-200', async () => {
    let courante: string | undefined = 'societe-a';
    const a = neuf({ arret: { lire: () => ({ societes: { 'societe-a': marque } }), societeDe: () => courante } });
    expect((await get(a)).statusCode).toBe(503);
    courante = 'societe-b';
    expect((await get(a)).statusCode).toBe(200);
    courante = undefined;
    expect((await get(a)).statusCode).toBe(200);
  });

  it('levee-prise-en-compte-a-la-requete-suivante', async () => {
    let drapeaux: Drapeaux = { global: marque, societes: {} };
    const a = neuf({ arret: { lire: () => drapeaux } });
    expect((await get(a)).statusCode).toBe(503);
    drapeaux = LIBRE;
    expect((await get(a)).statusCode).toBe(200);
    drapeaux = { societes: { 'societe-a': marque }, global: marque };
    expect((await get(a)).statusCode).toBe(503);
  });

  it('options-absentes-rien-ne-change', async () => {
    for (const securite of [{}, { arret: undefined }]) {
      const r = await get(neuf(securite));
      expect(r.statusCode).toBe(200);
    }
    expect(() => neuf({ arret: {} })).toThrow();
    expect(() => neuf({ arret: { lire: Number.NaN } })).toThrow();
    expect(() => neuf({ arret: { lire: () => LIBRE, societeDe: Infinity } })).toThrow();
  });

  it('lecture-des-drapeaux-qui-leve-une-erreur-503', async () => {
    const mauvaises: Array<() => unknown> = [
      () => {
        throw new Error('base indisponible');
      },
      () => undefined,
      () => null,
      () => ({ societes: null }),
    ];
    for (const lire of mauvaises) {
      const r = await get(neuf({ arret: { lire } }));
      expect(r.statusCode).toBe(503);
      expect(r.json()).toEqual(CORPS);
    }
    const societeCasse = neuf({
      arret: {
        lire: () => LIBRE,
        societeDe: () => {
          throw new Error('session illisible');
        },
      },
    });
    expect((await get(societeCasse)).statusCode).toBe(503);
  });

  // À activer quand L06-T25 (crochet de corrélation) est fusionnée : remplacer it.skip par it.
  it.skip('en-tete-de-correlation-present-sur-503', async () => {
    const r = await get(neuf({ correlation: true, arret: { lire: () => ({ global: marque, societes: {} }) } }));
    expect(r.statusCode).toBe(503);
    expect(r.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
