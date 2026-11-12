import { afterEach, describe, expect, it } from 'vitest';
import { ProfilV1 } from '../../../../packages/contrat/src/domaines/profil.js';
import { creerApp } from '../app.js';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';

/** Vrai serveur avec jeton : session fictive de `soc-lemoine`, chemins sous son préfixe, `authorization: Bearer` sur chaque appel. */
const JETON = 'jeton-fictif-lemoine';
const SESSION = { personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'], societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire'], revendications: {} } as const;
function creerAppJeton() {
  const a = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions({ [JETON]: SESSION }) } } });
  const brut = a.inject.bind(a) as (o: object) => unknown;
  a.inject = ((o: { url: string; headers?: object }) => brut({ ...o, url: PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine') + o.url, headers: { authorization: 'Bearer ' + JETON, ...o.headers } })) as typeof a.inject;
  return a;
}

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = () => {
  const a = creerAppJeton();
  apps.push(a);
  return a;
};

describe('serveur : profil', () => {
  it('serveur-repond-au-profil', async () => {
    const a = neuf();
    const r = await a.inject({ method: 'GET', url: '/profil' });
    expect(r.statusCode).toBe(200);
    const p = ProfilV1.parse(r.json().body);
    expect(p.champs.find((c) => c.cle === 'denomination')?.valeur).toBe('Lemoine Rénovation');
    const passe = await a.inject({ method: 'GET', url: '/profil?au=2020-01-01' });
    expect(passe.statusCode).toBe(200);
    expect(ProfilV1.parse(passe.json().body).champs).toEqual([]);
    expect((await a.inject({ method: 'POST', url: '/profil' })).statusCode).toBe(404);
  });

  it('au-mal-formee-400', async () => {
    const a = neuf();
    for (const mauvais of ['2026-02-30', '31%2F12%2F2026', '']) {
      expect((await a.inject({ method: 'GET', url: '/profil?au=' + mauvais })).statusCode).toBe(400);
    }
  });
});
