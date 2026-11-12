import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : pièces branchées sur un bouchon', () => {
  it('routes-pieces-branchees', async () => {
    const a = creerApp();
    apps.push(a);
    expect((await a.inject({ method: 'GET', url: '/pieces' })).statusCode).not.toBe(404);
    expect((await a.inject({ method: 'GET', url: '/pieces/piece-001' })).statusCode).not.toBe(404);
    expect((await a.inject({ method: 'GET', url: '/pieces?du=2026-02-01&au=2026-01-01' })).statusCode).toBe(400);
    expect((await a.inject({ method: 'DELETE', url: '/pieces/piece-001' })).statusCode).toBe(404);
  });
});
