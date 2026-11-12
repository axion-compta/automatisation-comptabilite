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

describe('serveur : frais', () => {
  it('serveur-repond-aux-frais', async () => {
    const a = appSociete();
    apps.push(a);
    const tout = await a.inject({ method: 'GET', url: '/frais' });
    expect(tout.statusCode).toBe(200);
    expect(tout.json()).toMatchObject({ decalage: 0, total: 16 });
    const page = await a.inject({ method: 'GET', url: '/frais?limite=1' });
    expect(page.json().body).toHaveLength(1);
    expect(page.json().totaux).toEqual(tout.json().totaux);
    expect((await a.inject({ method: 'GET', url: '/frais?statut=refuse' })).json().total).toBe(1);

    const d = await a.inject({ method: 'GET', url: '/frais/FRA-003' });
    expect(d.statusCode).toBe(200);
    expect(d.json().body).toMatchObject({ id: 'FRA-003', montantTtcCentimes: 1260 });
    expect((await a.inject({ method: 'GET', url: '/frais/FRA-999' })).statusCode).toBe(404);

    const mauvais = ['du=2025-05-01&au=2025-04-01', 'du=2025-02-30', 'limite=0', 'limite=101', 'limite=1.5', 'limite=NaN', 'personne=' + 'a'.repeat(51), 'statut=autre'];
    for (const m of mauvais) expect((await a.inject({ method: 'GET', url: '/frais?' + m })).statusCode).toBe(400);
    expect((await a.inject({ method: 'POST', url: '/frais' })).statusCode).not.toBe(404);
  });
});
