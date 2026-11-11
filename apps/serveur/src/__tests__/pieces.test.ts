import { afterEach, describe, expect, it } from 'vitest';
import { genererPieces } from '../../../../packages/donnees-fictives/src/pieces.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : pièces en lecture', () => {
  it('serveur-repond-aux-pieces', async () => {
    const a = creerApp();
    apps.push(a);
    const jeu = genererPieces().pieces;
    const liste = await a.inject({ method: 'GET', url: '/pieces?limite=3&etat=prete' });
    expect(liste.statusCode).toBe(200);
    const lignes = (liste.json() as { body: Array<{ id: string; etat: string }> }).body;
    expect(lignes.length).toBe(3);
    expect(lignes.every((p) => p.etat === 'prete')).toBe(true);
    const detail = await a.inject({ method: 'GET', url: '/pieces/piece-001' });
    expect(detail.statusCode).toBe(200);
    expect((detail.json() as { body: { id: string } }).body.id).toBe('piece-001');
    const sensible = jeu.find((p) => p.sensible)!;
    const masque = ((await a.inject({ method: 'GET', url: `/pieces/${sensible.id}` })).json() as { body: { champs: unknown[]; fournisseur?: string } }).body;
    expect(masque.champs).toEqual([]);
    expect(masque.fournisseur).toBeUndefined();
    const inconnue = await a.inject({ method: 'GET', url: '/pieces/piece-999' });
    expect(inconnue.statusCode).toBe(404);
    expect(JSON.stringify(inconnue.json())).toContain('PIECE_INCONNUE');
    expect((await a.inject({ method: 'GET', url: '/pieces?du=2026-02-01&au=2026-01-01' })).statusCode).toBe(400);
  });
});
