import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : ventes', () => {
  it('serveur-repond-aux-ventes', async () => {
    const a = creerApp();
    apps.push(a);
    const get = (url: string) => a.inject({ method: 'GET', url });
    const liste = await get('/ventes?limite=5');
    expect(liste.statusCode).toBe(200);
    expect(liste.json().body).toHaveLength(5);
    expect(liste.json().total).toBeGreaterThan(5);
    const id = liste.json().body[0].id as string;
    const d = await get(`/ventes/${id}`);
    expect(d.statusCode).toBe(200);
    expect(d.json().body.id).toBe(id);
    expect(d.json().body.lignes.length).toBeGreaterThan(0);
    const inconnu = await get('/ventes/VP-9-999');
    expect(inconnu.statusCode).toBe(404);
    expect(inconnu.json().code).toBe('VENTE_INCONNUE');
    expect((await get('/ventes?etat=en_retard')).json().body.every((v: { etat: string }) => v.etat === 'en_retard')).toBe(true);
    expect((await get('/ventes?mois=2026-13')).statusCode).toBe(400);
  });
});
