import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerApp } from '../app.js';
import { creerService } from '../../../../packages/contrat/src/service.js';
import { demarrer } from '../index.js';
const json = { 'content-type': 'application/json' };
const apps: Array<ReturnType<typeof creerApp>> = [];
const neuf = () => {
  const a = creerApp();
  apps.push(a);
  return a;
};
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const creer = (a: ReturnType<typeof creerApp>, cle: string, libelle = 'Achat fictif') =>
  a.inject({ method: 'POST', url: '/ecritures', headers: { ...json, 'idempotency-key': cle }, payload: { libelle, montantCentimes: 1250 } });
describe('serveur Fastify + oRPC en mémoire', () => {
  it('crée puis liste une écriture', async () => {
    const a = neuf();
    const r = await creer(a, 'cle-fictive-1');
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ id: 'E1', libelle: 'Achat fictif', montantCentimes: 1250, version: 1 });
    const l = await a.inject({ method: 'GET', url: '/ecritures' });
    expect(l.json().body).toHaveLength(1);
  });
  it('rejouer la même clé ne crée qu\'une écriture (idempotence)', async () => {
    const a = neuf();
    const x = (await creer(a, 'cle-fictive-2')).json();
    const y = (await creer(a, 'cle-fictive-2')).json();
    expect(y).toEqual(x);
    expect((await a.inject({ method: 'GET', url: '/ecritures' })).json().body).toHaveLength(1);
  });
  it('refuse une écriture sans Idempotency-Key (400)', async () => {
    const r = await neuf().inject({ method: 'POST', url: '/ecritures', headers: json, payload: { libelle: 'x', montantCentimes: 1 } });
    expect(r.statusCode).toBe(400);
  });
  it('refuse un montant décimal (400)', async () => {
    const r = await neuf().inject({ method: 'POST', url: '/ecritures', headers: { ...json, 'idempotency-key': 'cle-fictive-3' }, payload: { libelle: 'x', montantCentimes: 1.5 } });
    expect(r.statusCode).toBe(400);
  });
  it('409 : modification avec une version périmée, version actuelle fournie', async () => {
    const a = neuf();
    await creer(a, 'cle-fictive-4');
    const put = (cle: string, version: number) =>
      a.inject({ method: 'PUT', url: '/ecritures/E1', headers: { ...json, 'idempotency-key': cle }, payload: { libelle: 'Maj', montantCentimes: 10, version } });
    expect((await put('cle-fictive-5', 1)).statusCode).toBe(200);
    const r = await put('cle-fictive-6', 1);
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ code: 'CONFLIT_VERSION', data: { versionActuelle: 2 } });
  });
  it('404 : modifier une écriture inconnue ; 404 : route inconnue', async () => {
    const a = neuf();
    const p = await a.inject({ method: 'PUT', url: '/ecritures/E9', headers: { ...json, 'idempotency-key': 'cle-fictive-7' }, payload: { libelle: 'x', montantCentimes: 1, version: 1 } });
    expect(p.statusCode).toBe(404);
    expect((await a.inject({ method: 'GET', url: '/inconnu' })).statusCode).toBe(404);
  });
  it('chaque serveur a son propre état', async () => {
    await creer(neuf(), 'cle-fictive-8');
    expect((await neuf().inject({ method: 'GET', url: '/ecritures' })).json().body).toEqual([]);
  });
  it('une erreur inattendue du service reste une erreur 500, pas un 404', async () => {
    const service = { ...creerService(), modifier: () => { throw new Error('panne interne'); } };
    const a = creerApp(service);
    apps.push(a);
    const r = await a.inject({ method: 'PUT', url: '/ecritures/E1', headers: { ...json, 'idempotency-key': 'cle-fictive-9' }, payload: { libelle: 'x', montantCentimes: 1, version: 1 } });
    expect(r.statusCode).toBe(500);
  });
});
describe('garde production', () => {
  it('refuse de démarrer quand NODE_ENV vaut production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(demarrer(0)).rejects.toThrow('serveur en mémoire interdit en production');
    vi.unstubAllEnvs();
  });
});
