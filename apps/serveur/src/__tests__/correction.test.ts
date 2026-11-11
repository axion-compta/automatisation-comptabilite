import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

const patch = (a: ReturnType<typeof creerApp>, url: string, payload: unknown, cle: string | null = 'cle-fictive-001') =>
  a.inject({ method: 'PATCH', url, headers: cle === null ? {} : { 'idempotency-key': cle }, payload: payload as object });
const CORPS = { valeur: '250,50', pourquoi: 'erreur de lecture' };

describe('serveur : correction d un champ lu', () => {
  it('corrige-le-ttc-et-renvoie-la-piece', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await patch(a, '/pieces/piece-001/champs/ttc', CORPS);
    expect(r.statusCode).toBe(200);
    expect((r.json() as { body: { ttcCentimes: number } }).body.ttcCentimes).toBe(25050);
  });

  it('refuse-selon-le-cas', async () => {
    const a = creerApp();
    apps.push(a);
    expect((await patch(a, '/pieces/inconnue/champs/ttc', CORPS)).statusCode).toBe(404);
    expect((await patch(a, '/pieces/piece-001/champs/zzz', CORPS)).statusCode).toBe(404);
    expect((await patch(a, '/pieces/piece-001/champs/ttc', { ...CORPS, valeur: 'abc' })).statusCode).toBe(400);
    expect((await patch(a, '/pieces/piece-010/champs/ttc', CORPS)).statusCode).toBe(409);
    expect((await patch(a, '/pieces/piece-001/champs/ttc', CORPS, null)).statusCode).toBe(400);
  });
});
