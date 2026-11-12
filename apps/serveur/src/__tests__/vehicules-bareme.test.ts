import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';

const JETON = 'jeton-fictif-lemoine';
const SESSION = { personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'], societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-saisir'], revendications: {} } as const;
/** Vrai serveur avec jeton : chaque URL reçoit le préfixe de la société fictive et l'en-tête `authorization`. */
function appSociete() {
  const a = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions({ [JETON]: SESSION }) } } });
  const inject = (o: { method: 'GET' | 'POST' | 'PATCH'; url: string; headers?: Record<string, string>; payload?: object }) =>
    a.inject({ ...o, url: PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine') + o.url, headers: { authorization: 'Bearer ' + JETON, ...o.headers } });
  return { inject, close: () => a.close() };
}
const apps: Array<ReturnType<typeof appSociete>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : véhicules et barème', () => {
  it('serveur-repond-au-bareme', async () => {
    const a = appSociete();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const v = await get('/vehicules?personne=PER-01');
    expect(v.statusCode).toBe(200);
    expect(v.json().body).toHaveLength(4);
    expect(JSON.stringify(v.json())).not.toContain('XX-00');
    expect((await get('/vehicules')).statusCode).toBe(400);
    expect((await get('/vehicules?personne=')).statusCode).toBe(400);

    const b = await get('/parametres/bareme_ik_voiture?date=2025-06-15');
    expect(b.statusCode).toBe(200);
    expect(b.json().body).toMatchObject({ statut: 'valide', majorationPourcent: 10 });
    expect((await get('/parametres/bareme_ik_voiture?date=2026-01-01')).json().body.statut).toBe('a_verifier');
    expect((await get('/parametres/bareme_ik_voiture?date=2024-01-01')).statusCode).toBe(404);
    for (const q of ['', '?date=', '?date=2025-02-30', '?date=15/06/2025']) expect([q, (await get('/parametres/bareme_ik_voiture' + q)).statusCode]).toEqual([q, 400]);
    expect((await a.inject({ method: 'POST', url: '/vehicules' })).statusCode).toBe(404);
  });

  it('date-invalide-400', async () => {
    const a = appSociete();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    // date calendaire inexistante, chaîne vide, date absente
    for (const q of ['?date=2025-02-30', '?date=', '']) {
      const r = await get('/parametres/bareme_ik_voiture' + q);
      expect([q, r.statusCode]).toEqual([q, 400]);
    }
  });
});
