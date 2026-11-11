import { createSign, generateKeyPairSync, type JsonWebKey } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { genererOpenapiComplet } from '../../../../packages/contrat/src/openapi.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import { suiteSession } from '../../../../packages/noyau/src/session/__tests__/suite-session.js';
import {
  creerPersonnesMemoire, creerSessionsJeton, lireReglagesJeton,
  type Attributs, type PortPersonnes, type ReglagesJeton,
} from '../securite/jeton.js';

const EMETTEUR = 'https://royaume.exemple.fr/clients';
const AUDIENCE = 'api-clients-fictive';
const MAINTENANT = Date.parse('2026-11-11T10:00:00Z');
const paire = () => generateKeyPairSync('rsa', { modulusLength: 2048 });
const bonne = paire();
const autre = paire();
const reglages: ReglagesJeton = { emetteur: EMETTEUR, audience: AUDIENCE, cles: { k1: bonne.publicKey.export({ format: 'jwk' }) as JsonWebKey } };
const droits: Attributs = {
  nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'societe-fictive-1', societes: ['societe-fictive-1'], roles: ['utilisateur'], permissions: ['compta-lire'],
};
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
function signer(charge: Record<string, unknown>, cle = bonne.privateKey, entete: Record<string, unknown> = { alg: 'RS256', kid: 'k1' }): string {
  const donnees = `${b64(entete)}.${b64(charge)}`;
  return `${donnees}.${createSign('sha256').update(donnees).sign(cle).toString('base64url')}`;
}
const sec = MAINTENANT / 1000;
const valide = (o: Record<string, unknown> = {}) => ({ iss: EMETTEUR, aud: AUDIENCE, sub: 'sujet-fictif-1', name: 'Camille Exemple', acr: 'mfa', exp: sec + 600, auth_time: sec - 10, ...o });

const attributs = { lire: async (s: string) => (s.startsWith('sujet-fictif') ? droits : null) };
function monter(personnes: PortPersonnes = creerPersonnesMemoire(), trace?: (e: string, id: string) => void) {
  const sessions = creerSessionsJeton({ reglages, attributs, personnes, horloge: () => MAINTENANT, ...(trace ? { trace } : {}) });
  return creerApp(undefined, { securite: { jeton: { sessions } } });
}
const apps: Array<ReturnType<typeof creerApp>> = [];
const neuf = (...a: Parameters<typeof monter>) => { const x = monter(...a); apps.push(x); return x; };
afterEach(async () => { await Promise.all(apps.splice(0).map((a) => a.close())); });
const avec = (jeton: string) => ({ authorization: `Bearer ${jeton}` });
const lecture = (a: ReturnType<typeof creerApp>, headers?: Record<string, string>) => a.inject({ method: 'GET', url: '/ecritures', ...(headers ? { headers } : {}) });

describe('securite/jeton', () => {
  it('toutes-les-routes-sans-jeton-401', async () => {
    const a = neuf();
    const chemins = (genererOpenapiComplet() as { paths: Record<string, Record<string, unknown>> }).paths;
    let vues = 0;
    for (const [chemin, ops] of Object.entries(chemins)) {
      for (const m of Object.keys(ops).filter((k) => ['get', 'post', 'put', 'delete', 'patch'].includes(k))) {
        const r = await a.inject({ method: m.toUpperCase() as 'GET', url: chemin.replace(/\{[^}]+\}/g, 'x') });
        expect(r.statusCode, `${m} ${chemin}`).toBe(401);
        expect(r.json()).toMatchObject({ code: 'NON_AUTHENTIFIE' });
        vues++;
      }
    }
    expect(vues).toBeGreaterThan(50);
    expect((await a.inject({ method: 'GET', url: '/inconnu' })).statusCode).toBe(401);
  });

  it('jeton valide : la route répond', async () => {
    expect((await lecture(neuf(), avec(signer(valide())))).statusCode).toBe(200);
  });

  it('jeton-sans-mfa-refuse', async () => {
    const a = neuf();
    expect((await lecture(a, avec(signer(valide({ acr: 'pwd' }))))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide({ acr: undefined }))))).statusCode).toBe(401);
  });

  it('jeton-expire-refuse', async () => {
    const a = neuf();
    expect((await lecture(a, avec(signer(valide({ exp: sec - 1 }))))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide({ exp: sec }))))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide({ exp: sec + 1 }))))).statusCode).toBe(200);
  });

  it('autre-audience-refusee', async () => {
    const a = neuf();
    expect((await lecture(a, avec(signer(valide({ aud: 'autre-api' }))))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide({ aud: ['autre-api', AUDIENCE] }))))).statusCode).toBe(200);
  });

  it('autre-emetteur-refuse', async () => {
    expect((await lecture(neuf(), avec(signer(valide({ iss: 'https://autre.exemple.fr/clients' }))))).statusCode).toBe(401);
  });

  it('signature-alteree-refusee', async () => {
    const a = neuf();
    const bon = signer(valide());
    const [e, c, s] = bon.split('.') as [string, string, string];
    expect((await lecture(a, avec(`${e}.${b64(valide({ sub: 'sujet-fictif-2' }))}.${s}`))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide(), autre.privateKey)))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide(), bonne.privateKey, { alg: 'none', kid: 'k1' })))).statusCode).toBe(401);
    expect((await lecture(a, avec(signer(valide(), bonne.privateKey, { alg: 'RS256', kid: 'inconnue' })))).statusCode).toBe(401);
    expect((await lecture(a, avec(`${e}.${c}.`))).statusCode).toBe(401);
    expect((await lecture(a, avec('pas-un-jeton'))).statusCode).toBe(401);
    expect((await lecture(a, { authorization: bon })).statusCode).toBe(401);
  });

  it('sujet-sans-droits-refuse', async () => {
    expect((await lecture(neuf(), avec(signer(valide({ sub: 'inconnu' }))))).statusCode).toBe(401);
  });

  it('panne-du-service-de-personnes-refuse', async () => {
    const casse: PortPersonnes = { assurer: async () => { throw new Error('panne'); } };
    expect((await lecture(neuf(casse), avec(signer(valide())))).statusCode).toBe(401);
  });

  it('premiere-visite-cree-la-personne-une-fois', async () => {
    const personnes = creerPersonnesMemoire();
    const traces: string[] = [];
    const a = neuf(personnes, (e, id) => traces.push(`${e}:${id}`));
    const jeton = avec(signer(valide()));
    await lecture(a, jeton);
    await lecture(a, jeton);
    expect(personnes.lignes()).toEqual([{ id: 'personne-1', sujetExterne: 'sujet-fictif-1', nomAffiche: 'Camille Exemple' }]);
    expect(traces).toEqual(['securite.premiere_visite:personne-1']);
    await lecture(a, avec(signer(valide({ sub: 'sujet-fictif-2' }))));
    expect(personnes.lignes()).toHaveLength(2);
  });

  it('reglages-lus-a-un-seul-endroit', () => {
    const cles = JSON.stringify(reglages.cles);
    expect(lireReglagesJeton({ JETON_EMETTEUR: EMETTEUR, JETON_AUDIENCE: AUDIENCE, JETON_CLES: cles })).toEqual(reglages);
    expect(() => lireReglagesJeton({})).toThrow('incomplets');
    expect(() => lireReglagesJeton({ JETON_EMETTEUR: EMETTEUR, JETON_AUDIENCE: AUDIENCE, JETON_CLES: '{}' })).toThrow('invalides');
  });
});

suiteSession('adaptateur jeton', (sessions: Readonly<Record<string, Session>>) => {
  const parSujet = new Map(Object.entries(sessions).map(([ref, s]) => [`sujet-${ref}`, s]));
  const port = creerSessionsJeton({
    reglages, horloge: () => MAINTENANT,
    attributs: { lire: async (s) => { const x = parSujet.get(s); return x ? { ...x, revendications: undefined, personneId: undefined } as unknown as Attributs : null; } },
    personnes: { assurer: async (s) => ({ id: (parSujet.get(s) as Session).personneId, creee: false }) },
  });
  return {
    lire: (ref) => port.lire(ref !== null && Object.hasOwn(sessions, ref) ? signer(valide({ sub: `sujet-${ref}`, auth_time: 1 })) : ref),
  };
});
