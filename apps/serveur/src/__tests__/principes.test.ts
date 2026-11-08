import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { CATALOGUE_GESTES } from '../../../../packages/noyau/src/principes/gestes.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

async function lire() {
  const a = creerApp();
  apps.push(a);
  const r = await a.inject({ method: 'GET', url: '/gestes-humains' });
  expect(r.statusCode).toBe(200);
  return r.json() as { body: Array<{ code: string; action: string; permission: string; reauth: string }>; decalage: number; total: number };
}

describe('serveur : principes', () => {
  it('douze-gestes-servis', async () => {
    const j = await lire();
    expect(j.body).toHaveLength(CATALOGUE_GESTES.length);
    expect(j.total).toBe(j.body.length);
    expect(j.decalage).toBe(0);
    expect(j.body).toHaveLength(12);
  });

  it('codes-identiques-au-noyau', async () => {
    const j = await lire();
    expect(j.body).toEqual(CATALOGUE_GESTES.map((g) => ({ ...g })));
  });

  it('ordre-g01-a-g12', async () => {
    const j = await lire();
    expect(j.body.map((g) => g.code)).toEqual(Array.from({ length: 12 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`));
  });
});
