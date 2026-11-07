import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { creerService } from '../../../../packages/contrat/src/service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_FICTIF = '123e4567-e89b-42d3-a456-426614174000';
const json = { 'content-type': 'application/json' };
const apps: Array<ReturnType<typeof creerApp>> = [];
type Rapport = { correlation_id: string; route: string; code: string };
type Service = Parameters<typeof creerApp>[0];

const neuf = (service?: Service, outil?: (r: Rapport) => void) => {
  const a = creerApp(service, { securite: { correlation: true, ...(outil ? { outilErreurs: outil } : {}) } });
  apps.push(a);
  return a;
};
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const ecrire = (a: ReturnType<typeof creerApp>, methode: 'POST' | 'PUT', url: string, payload: object) =>
  a.inject({ method: methode, url, headers: { ...json, 'idempotency-key': 'cle-fictive-1' }, payload });

describe('securite/correlation', () => {
  it('en-tete-sur-200-404-409', async () => {
    const a = neuf();
    const ok = await a.inject({ method: 'GET', url: '/ecritures' });
    const absent = await a.inject({ method: 'GET', url: '/inconnue' });
    await ecrire(a, 'POST', '/ecritures', { libelle: 'Achat fictif', montantCentimes: 1250 });
    const conflit = await ecrire(a, 'PUT', '/ecritures/E1', { libelle: 'Autre', montantCentimes: 10, version: 99 });
    expect([ok.statusCode, absent.statusCode, conflit.statusCode]).toEqual([200, 404, 409]);
    for (const r of [ok, absent, conflit]) expect(r.headers['x-correlation-id']).toMatch(UUID);
  });

  it('uuid-recu-repris', async () => {
    const r = await neuf().inject({ method: 'GET', url: '/ecritures', headers: { 'x-correlation-id': UUID_FICTIF } });
    expect(r.headers['x-correlation-id']).toBe(UUID_FICTIF);
  });

  it('valeur-recue-mal-formee-remplacee', async () => {
    const a = neuf();
    for (const v of ['<script>', 'a'.repeat(500), '', ' ' + UUID_FICTIF, UUID_FICTIF + ', ' + UUID_FICTIF]) {
      const r = await a.inject({ method: 'GET', url: '/ecritures', headers: { 'x-correlation-id': v } });
      expect(r.headers['x-correlation-id']).toMatch(UUID);
      expect(r.headers['x-correlation-id']).not.toBe(v);
    }
  });

  it('deux-requetes-deux-codes', async () => {
    const a = neuf();
    const x = await a.inject({ method: 'GET', url: '/ecritures' });
    const y = await a.inject({ method: 'GET', url: '/ecritures' });
    expect(x.headers['x-correlation-id']).not.toBe(y.headers['x-correlation-id']);
  });

  it('erreur-500-rapport-trois-champs', async () => {
    const service = creerService();
    service.creer = () => {
      throw new Error('montant 98765 de Tiers Fictif Durand');
    };
    const rapports: Rapport[] = [];
    const r = await ecrire(neuf(service, (x) => rapports.push(x)), 'POST', '/ecritures', { libelle: 'Achat fictif', montantCentimes: 5 });
    expect(r.statusCode).toBe(500);
    expect(rapports).toHaveLength(1);
    expect(Object.keys(rapports[0]!).sort()).toEqual(['code', 'correlation_id', 'route']);
    expect(rapports[0]!.route).toBe('/ecritures');
    expect(rapports[0]!.code).toMatch(/^[A-Z_]+$/);
    const texte = JSON.stringify(rapports);
    expect(texte).not.toContain('98765');
    expect(texte).not.toContain('Durand');
  });

  it('meme-code-en-tete-et-rapport', async () => {
    const rapports: Rapport[] = [];
    const a = neuf(undefined, (x) => rapports.push(x));
    await ecrire(a, 'POST', '/ecritures', { libelle: 'Achat fictif', montantCentimes: 1 });
    const r = await ecrire(a, 'PUT', '/ecritures/E1', { libelle: 'Autre', montantCentimes: 10, version: 99 });
    expect(rapports).toHaveLength(1);
    expect(rapports[0]!.route).toBe('/ecritures/{id}');
    expect(rapports[0]!.correlation_id).toBe(r.headers['x-correlation-id']);
    const ok = await a.inject({ method: 'GET', url: '/ecritures' });
    expect(ok.statusCode).toBe(200);
    expect(rapports).toHaveLength(1);
    const inconnue = await a.inject({ method: 'GET', url: '/ecritures/E1/secret-du-client' });
    expect(inconnue.statusCode).toBe(404);
    expect(rapports.at(-1)!.route).not.toContain('secret-du-client');
    expect(rapports.at(-1)!.correlation_id).toBe(inconnue.headers['x-correlation-id']);
  });

  it('outil-absent-sans-erreur', async () => {
    const r = await neuf().inject({ method: 'GET', url: '/inconnue' });
    expect(r.statusCode).toBe(404);
    expect(r.headers['x-correlation-id']).toMatch(UUID);
    const casse = neuf(undefined, () => {
      throw new Error('panne de l\'outil');
    });
    const s = await casse.inject({ method: 'GET', url: '/inconnue' });
    expect(s.statusCode).toBe(404);
    expect(s.json()).toMatchObject({ code: 'INTROUVABLE' });
    expect(s.headers['x-correlation-id']).toMatch(UUID);
  });

  it('options-absentes-rien-ne-change', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await a.inject({ method: 'GET', url: '/ecritures', headers: { 'x-correlation-id': UUID_FICTIF } });
    expect(r.headers['x-correlation-id']).toBeUndefined();
  });
});
