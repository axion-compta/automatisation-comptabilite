import { afterEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { creerApp } from '../app.js';
import { brancherSecurite } from '../securite/index.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('securite/squelette', () => {
  it('quatre-crochets-dans-l-ordre', () => {
    const vus: string[] = [];
    apps.push(creerApp(undefined, { securite: { observer: (n) => vus.push(n) } }));
    expect(vus).toEqual(['correlation', 'arret', 'debit', 'en-tetes']);
  });

  it('sans-options-rien-ne-change', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await a.inject({ method: 'GET', url: '/ecritures' });
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toEqual([]);
    expect(r.headers['x-correlation-id']).toBeUndefined();
  });

  it('brancher-deux-fois-refuse', () => {
    const a = Fastify();
    apps.push(a);
    const vus: string[] = [];
    brancherSecurite(a, { observer: (n) => vus.push(n) });
    expect(() => brancherSecurite(a, { observer: (n) => vus.push(n) })).toThrow('déjà branchée');
    expect(vus).toHaveLength(4);
    const b = Fastify();
    apps.push(b);
    expect(() => brancherSecurite(b, {})).not.toThrow();
  });

  it('observer-absent-sans-erreur', () => {
    const a = Fastify();
    apps.push(a);
    expect(() => brancherSecurite(a)).not.toThrow();
    const b = Fastify();
    apps.push(b);
    expect(() => brancherSecurite(b, {})).not.toThrow();
    expect(() => creerApp(undefined, { securite: {} }).close()).not.toThrow();
  });
});
