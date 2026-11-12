import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const avec = (acces: string | null) => {
  const a = creerApp(undefined, { abonnement: { scenario: acces === null ? null : 'acces=' + acces } });
  apps.push(a);
  return a;
};
const ETATS = ['essai', 'actif', 'delai_de_grace', 'lecture_seule', 'suspendu', 'resilie'];
const entetes = { 'idempotency-key': 'cle-garde-0001', 'content-type': 'application/json' };
const refuse = (r: { statusCode: number; json: () => unknown }) => r.statusCode === 403 && (r.json() as { code?: string }).code === 'ETAT_ACCES';

describe('serveur : garde d état d accès', () => {
  it('ecriture-refusee-en-lecture-seule-403', async () => {
    const r = await avec('lecture_seule').inject({ method: 'POST', url: '/ecritures', headers: entetes, payload: { libelle: 'Achat fictif', montantCentimes: 100 } });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ code: 'ETAT_ACCES', status: 403, data: { etat: 'LECTURE_SEULE', raison: 'etat' } });
    const s = await avec('suspendu').inject({ method: 'PUT', url: '/ecritures/e1', headers: entetes, payload: {} });
    expect(s.json()).toMatchObject({ data: { etat: 'SUSPENDU' } });
  });

  it('lecture-permise-dans-les-six-etats', async () => {
    for (const e of ETATS) {
      const r = await avec(e).inject({ method: 'GET', url: '/ecritures' });
      expect(r.statusCode, e).toBe(200);
    }
  });

  it('routes-compte-permises-en-resilie', async () => {
    const a = avec('resilie');
    const essais: Array<[string, string]> = [['POST', '/fin-contrat/accuse'], ['POST', '/fin-contrat/gel'], ['POST', '/abonnement/demandes-palier'], ['POST', '/acceptations'], ['GET', '/acces'], ['POST', '/exports']];
    for (const [method, url] of essais) {
      const r = method === 'GET' ? await a.inject({ method: 'GET', url }) : await a.inject({ method: 'POST', url, headers: entetes, payload: {} });
      expect(refuse(r), url).toBe(false);
    }
    expect(refuse(await a.inject({ method: 'POST', url: '/exercices/2026/alertes/a1/reporter', headers: entetes, payload: {} }))).toBe(true);
  });

  it('actif-rien-ne-change', async () => {
    for (const a of [avec(null), avec('actif'), avec('essai')]) {
      const r = await a.inject({ method: 'POST', url: '/ecritures', headers: entetes, payload: { libelle: 'Achat fictif', montantCentimes: 100 } });
      expect(r.statusCode).toBe(200);
    }
  });

  it('route-inconnue-fermee-par-defaut', async () => {
    expect(refuse(await avec('lecture_seule').inject({ method: 'GET', url: '/nexiste-pas' }))).toBe(true);
    expect((await avec('actif').inject({ method: 'GET', url: '/nexiste-pas' })).statusCode).toBe(404);
  });
});
