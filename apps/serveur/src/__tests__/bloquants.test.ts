import { afterEach, describe, expect, it } from 'vitest';
import { ReponseBloquants } from '../../../../packages/contrat/src/domaines/bloquants.js';
import { creerServiceBloquants } from '../../../../packages/contrat/src/domaines/bloquants-service.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const appel = async (url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method, url });
};

describe('serveur : bloquants', () => {
  it('action-inconnue-400', async () => {
    for (const q of ['?action=virement', '?action=', '?action=TVA', '?action=tva&action=export', '?action=tva&autre=1', '']) {
      const r = await appel('/controles/bloquants' + q);
      expect([q, r.statusCode]).toEqual([q, 400]);
    }
    const ok = await appel('/controles/bloquants?action=tva');
    expect(ok.statusCode).toBe(200);
    expect(ReponseBloquants.parse(ok.json().body)).toEqual(creerServiceBloquants().lister('tva'));
    for (const a of ['validation', 'tva', 'export', 'cloture']) expect((await appel('/controles/bloquants?action=' + a)).statusCode).toBe(200);
    for (const method of ['POST', 'PUT', 'DELETE'] as const) expect((await appel('/controles/bloquants?action=tva', method)).statusCode).toBe(404);
  });
});
