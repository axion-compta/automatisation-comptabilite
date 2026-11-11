import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

function multipart(fichiers: string[], canal: string): { corps: Buffer; entete: string } {
  const f = 'frontiere-fictive-0001';
  const parties = fichiers.map((contenu, i) => `--${f}\r\nContent-Disposition: form-data; name="fichiers"; filename="piece-${i}.pdf"\r\nContent-Type: application/pdf\r\n\r\n${contenu}\r\n`);
  parties.push(`--${f}\r\nContent-Disposition: form-data; name="canal"\r\n\r\n${canal}\r\n--${f}--\r\n`);
  return { corps: Buffer.from(parties.join('')), entete: `multipart/form-data; boundary=${f}` };
}

describe('serveur : dépôt de pièces', () => {
  it('serveur-accepte-le-multipart', async () => {
    const a = creerApp();
    apps.push(a);
    const { corps, entete } = multipart(['%PDF-1.4 fictif A', '%PDF-1.4 fictif B'], 'api');
    const r = await a.inject({ method: 'POST', url: '/pieces', headers: { 'content-type': entete, 'idempotency-key': 'cle-fictive-001' }, payload: corps });
    expect(r.statusCode).toBe(200);
    const resultats = (r.json() as { body: { resultats: Array<{ statut: string; id: string }> } }).body.resultats;
    expect(resultats.map((x) => x.statut)).toEqual(['recue', 'recue']);
    const etat = await a.inject({ method: 'GET', url: `/pieces/${resultats[0]!.id}/etat` });
    expect(etat.json()).toEqual({ body: { etat: 'recue' } });
    expect((await a.inject({ method: 'POST', url: `/pieces/${resultats[0]!.id}/relancer`, headers: { 'idempotency-key': 'cle-fictive-002' } })).statusCode).toBe(409);
    expect((await a.inject({ method: 'GET', url: '/pieces/inconnue-xyz/etat' })).statusCode).toBe(404);
  });

  it('sans-en-tete-idempotency-key-refuse', async () => {
    const a = creerApp();
    apps.push(a);
    const { corps, entete } = multipart(['%PDF-1.4 fictif A'], 'api');
    const r = await a.inject({ method: 'POST', url: '/pieces', headers: { 'content-type': entete }, payload: corps });
    expect(r.statusCode).toBe(400);
  });
});
