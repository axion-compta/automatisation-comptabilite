import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const MARQUEUR = 'ECHO-INTERDIT-7Q';
const PORTAIL = 'https://portail.exemple.fr';
const json = { 'content-type': 'application/json' };
const SIX = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'strict-transport-security', 'cross-origin-opener-policy', 'cache-control'];
const apps: Array<ReturnType<typeof creerApp>> = [];
const neuf = (securite: Record<string, unknown> = {}) => {
  const a = creerApp(undefined, { securite });
  apps.push(a);
  return a;
};
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const contrat = JSON.parse(readFileSync(new URL('../../../../packages/contrat/openapi.json', import.meta.url), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>;
};
const six = (h: Record<string, unknown>) => SIX.forEach((n) => expect(h[n], n).toBeTypeOf('string'));
const csp = async (securite?: Record<string, unknown>) =>
  String((await neuf(securite).inject({ method: 'GET', url: '/ecritures' })).headers['content-security-policy']);

describe('securite/en-tetes', () => {
  it('six-en-tetes-sur-toutes-les-routes', async () => {
    const a = neuf();
    const requetes = Object.entries(contrat.paths).flatMap(([chemin, ops]) =>
      Object.keys(ops).map((m) => ({ method: m.toUpperCase() as 'GET', url: chemin.replace(/\{[^}]+\}/g, 'E1') })),
    );
    expect(requetes.length).toBeGreaterThanOrEqual(Object.keys(contrat.paths).length);
    for (const r of requetes) six((await a.inject(r)).headers);
    const h = (await a.inject({ method: 'GET', url: '/ecritures' })).headers;
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('no-referrer');
    expect(h['strict-transport-security']).toMatch(/^max-age=[1-9]\d*$/);
    expect(h['cross-origin-opener-policy']).toBe('same-origin');
    expect(h['cache-control']).toBe('no-store');
  });

  it('en-tetes-aussi-sur-404-409-et-400', async () => {
    const a = neuf();
    const cle = { ...json, 'idempotency-key': 'cle-fictive-1' };
    await a.inject({ method: 'POST', url: '/ecritures', headers: cle, payload: { libelle: 'Achat fictif', montantCentimes: 1250 } });
    const rep = [
      await a.inject({ method: 'GET', url: '/inconnue' }),
      await a.inject({ method: 'PUT', url: '/ecritures/E1', headers: cle, payload: { libelle: 'Autre', montantCentimes: 10, version: 99 } }),
      await a.inject({ method: 'POST', url: '/ecritures', headers: cle, payload: { libelle: 1 } }),
      await a.inject({ method: 'POST', url: '/ecritures', headers: cle, payload: '{pas du json' }),
    ];
    expect(rep.map((r) => r.statusCode)).toEqual([404, 409, 400, 400]);
    for (const r of rep) six(r.headers);
  });

  it('csp-sans-unsafe-inline', async () => {
    for (const s of [undefined, { ancetresPermis: [PORTAIL] }]) {
      const c = await csp(s);
      expect(c).not.toContain('unsafe-inline');
      expect(c).not.toContain('unsafe-eval');
      expect(c).toContain("default-src 'none'");
    }
  });

  it('frame-ancestors-none-par-defaut', async () => {
    for (const s of [undefined, {}, { ancetresPermis: [] }]) expect(await csp(s)).toContain("frame-ancestors 'none'");
  });

  it('frame-ancestors-portail-fictif', async () => {
    expect(await csp({ ancetresPermis: [PORTAIL] })).toBe(`default-src 'none'; frame-ancestors ${PORTAIL}`);
  });

  it('origine-invalide-refusee-au-demarrage', () => {
    const mauvaises: unknown[] = [['http://portail.exemple.fr'], ['https://a.fr; script-src *'], [''], ['https://'], ['https://a.fr b.fr'], [NaN], [Infinity], [42], 'https://a.fr', null];
    for (const m of mauvaises) expect(() => creerApp(undefined, { securite: { ancetresPermis: m } }), String(m)).toThrow();
  });

  it('entree-invalide-sans-echo', async () => {
    const a = neuf();
    const cle = { ...json, 'idempotency-key': 'cle-fictive-1' };
    const rep = [
      await a.inject({ method: 'POST', url: '/ecritures', headers: cle, payload: { libelle: MARQUEUR, montantCentimes: MARQUEUR, [MARQUEUR]: MARQUEUR } }),
      await a.inject({ method: 'POST', url: '/ecritures', headers: cle, payload: `{"libelle": ${MARQUEUR}` }),
      await a.inject({ method: 'GET', url: `/ecritures?limite=${MARQUEUR}` }),
    ];
    for (const r of rep) {
      expect(r.statusCode).toBe(400);
      expect(JSON.stringify([r.body, r.headers])).not.toContain(MARQUEUR);
      expect(JSON.parse(r.body)).toMatchObject({ defined: false, code: 'BAD_REQUEST', status: 400 });
      expect(Number(r.headers['content-length'] ?? r.body.length)).toBe(Buffer.byteLength(r.body));
    }
  });
});
