import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : branchement de la recherche d\'une personne', () => {
  it('recherche-branchee', async () => {
    const a = creerApp(undefined, { exploitation: {} });
    apps.push(a);
    const r = await a.inject({ method: 'GET', url: '/personnes/recherche?nom=Durand' });
    expect(r.statusCode).not.toBe(404);
  });
});
