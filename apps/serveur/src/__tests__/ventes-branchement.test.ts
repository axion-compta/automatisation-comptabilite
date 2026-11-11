import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : ventes branchées sur un bouchon', () => {
  it('routes-ventes-branchees', async () => {
    const a = creerApp();
    apps.push(a);
    expect((await a.inject({ method: 'GET', url: '/ventes' })).statusCode).not.toBe(404);
    expect((await a.inject({ method: 'GET', url: '/ventes/VP-1-038' })).statusCode).not.toBe(404);
    expect((await a.inject({ method: 'GET', url: '/ventes?mois=2026-13' })).statusCode).toBe(400);
    expect((await a.inject({ method: 'POST', url: '/ventes' })).statusCode).toBe(404);
  });
});
