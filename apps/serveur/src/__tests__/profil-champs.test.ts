import { afterEach, describe, expect, it } from 'vitest';
import { ChampProfilV1, ProfilV1 } from '../../../../packages/contrat/src/domaines/profil.js';
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
let n = 0;
const cle = () => 'cle-test-' + String(++n).padStart(6, '0');
const post = (a: ReturnType<typeof creerApp>, url: string, payload: object, k: string | null = cle()) =>
  a.inject({ method: 'POST', url, payload, headers: k ? { 'idempotency-key': k, 'content-type': 'application/json' } : { 'content-type': 'application/json' } });
const AJOUT = { valeur: 'SAS', origine: 'saisie_personne', effetDebut: '2026-01-01' };

describe('serveur : écriture des champs du profil', () => {
  it('ajout-rend-a-confirmer', async () => {
    const r = await post(neuf(), '/profil/champs/forme', AJOUT);
    expect(r.statusCode).toBe(200);
    const c = ChampProfilV1.parse(r.json().body);
    expect([c.statut, c.valeur, c.origine]).toEqual(['a_confirmer', 'SAS', 'saisie_personne']);
    const ia = await post(neuf(), '/profil/champs/forme', { ...AJOUT, origine: 'proposition_ia' });
    expect(ia.statusCode).toBe(400);
  });

  it('confirmation-rend-confirme', async () => {
    const a = neuf();
    await post(a, '/profil/champs/forme', AJOUT);
    const r = await post(a, '/profil/champs/forme/confirmer', { effetDebut: '2026-02-01' });
    expect(r.statusCode).toBe(200);
    const c = ChampProfilV1.parse(r.json().body);
    expect([c.statut, c.valeur, c.effetDebut]).toEqual(['confirme', 'SAS', '2026-02-01']);
    expect((await post(a, '/profil/champs/forme/confirmer', { effetDebut: '2026-03-01' })).statusCode).toBe(409);
  });

  it('sans-en-tete-refuse', async () => {
    const a = neuf();
    expect((await post(a, '/profil/champs/forme', AJOUT, null)).statusCode).toBe(400);
    expect((await post(a, '/profil/champs/forme/confirmer', { effetDebut: '2026-02-01' }, null)).statusCode).toBe(400);
    expect((await post(a, '/profil/champs/forme', AJOUT, 'court')).statusCode).toBe(400);
  });

  it('idempotence-meme-reponse', async () => {
    const a = neuf();
    const k = cle();
    const un = await post(a, '/profil/champs/forme', AJOUT, k);
    const deux = await post(a, '/profil/champs/forme', AJOUT, k);
    expect(deux.statusCode).toBe(200);
    expect(deux.json()).toEqual(un.json());
    const confirmation = { effetDebut: '2026-02-01' };
    const kc = cle();
    const c1 = await post(a, '/profil/champs/forme/confirmer', confirmation, kc);
    const c2 = await post(a, '/profil/champs/forme/confirmer', confirmation, kc);
    expect(c2.json()).toEqual(c1.json());
  });

  it('cle-reutilisee-409', async () => {
    const a = neuf();
    const k = cle();
    await post(a, '/profil/champs/forme', AJOUT, k);
    const r = await post(a, '/profil/champs/forme', { ...AJOUT, valeur: 'SA' }, k);
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('CLE_REUTILISEE');
    expect((await post(a, '/profil/champs/tenue', AJOUT, k)).json().code).toBe('CLE_REUTILISEE');
  });

  it('cle-inconnue-404', async () => {
    const a = neuf();
    for (const url of ['/profil/champs/inconnue', '/profil/champs/inconnue/confirmer']) {
      const r = await post(a, url, url.endsWith('confirmer') ? { effetDebut: '2026-02-01' } : AJOUT);
      expect(r.statusCode).toBe(404);
      expect(r.json().code).toBe('CLE_INCONNUE');
    }
  });

  it('rien-a-confirmer-409', async () => {
    const a = neuf();
    const r = await post(a, '/profil/champs/forme/confirmer', { effetDebut: '2026-02-01' });
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('RIEN_A_CONFIRMER');
  });

  it('lecture-apres-ecriture', async () => {
    const a = neuf();
    const lire = async () => ProfilV1.parse((await a.inject({ method: 'GET', url: '/profil' })).json().body);
    const avant = await lire();
    expect(avant.champs.find((c) => c.cle === 'code_postal_siege')).toBeUndefined();
    await post(a, '/profil/champs/code_postal_siege', { valeur: '75001', origine: 'document', effetDebut: '2026-01-01' });
    const apres = await lire();
    const c = apres.champs.find((x) => x.cle === 'code_postal_siege');
    expect([c?.valeur, c?.statut]).toEqual(['75001', 'a_confirmer']);
    expect(apres.champs.length).toBe(avant.champs.length + 1);
  });
});
