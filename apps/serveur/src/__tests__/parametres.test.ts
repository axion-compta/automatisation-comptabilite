import { afterEach, describe, expect, it } from 'vitest';
import { ReponseParametre } from '../../../../packages/contrat/src/domaines/parametres.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : paramètres', () => {
  it('serveur-repond-au-parametre', async () => {
    const a = creerApp();
    apps.push(a);
    const ok = await a.inject({ method: 'GET', url: '/parametres?cle=fictif.taux_b&date=2026-03-15' });
    expect(ok.statusCode).toBe(200);
    expect(ReponseParametre.parse(ok.json()).body).toMatchObject({ cle: 'fictif.taux_b', aVerifier: true });
    const absent = await a.inject({ method: 'GET', url: '/parametres?cle=fictif.inconnu&date=2026-03-15' });
    expect(absent.statusCode).toBe(404);
    expect(absent.json()).toMatchObject({ code: 'PARAMETRE_ABSENT', data: { cle: 'fictif.inconnu', date: '2026-03-15' } });
    expect(absent.body).not.toContain('valeur');
    for (const url of ['/parametres?cle=fictif.taux_b', '/parametres?cle=a%20b&date=2026-03-15', '/parametres?cle=fictif.taux_b&date=2026-13-01']) {
      expect((await a.inject({ method: 'GET', url })).statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'POST', url: '/parametres' })).statusCode).toBe(404);
  });
});
