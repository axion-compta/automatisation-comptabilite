import { implement } from '@orpc/server';
import { describe, expect, it } from 'vitest';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { contratModules } from '../../../../packages/contrat/src/registres/index.js';
import type { ContexteSession } from '../domaines/controles-actions.js';
import { implementerModules } from '../registres/index.js';
import { creerApp, creerRouteur } from '../app.js';

describe('registres serveur par lot', () => {
  it('les clés implémentées égalent celles des modules du contrat', () => {
    const os = implement(contrat).$context<ContexteSession>();
    expect(Object.keys(implementerModules(os, {})).sort()).toEqual(Object.keys(contratModules).sort());
  });

  it('creerRouteur et creerApp gardent leur signature (session conservée par creerApp)', async () => {
    expect(creerRouteur.length).toBeLessThanOrEqual(3);
    expect(creerApp.length).toBeLessThanOrEqual(2);
    const app = creerApp(undefined, { session: () => undefined });
    const reponse = await app.inject({ method: 'GET', url: '/inconnu-registres' });
    expect(reponse.statusCode).toBe(404);
    await app.close();
  });
});
