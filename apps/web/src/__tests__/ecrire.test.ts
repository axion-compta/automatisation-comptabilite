// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ErreurEcriture, ecrire, nouvelleCle } from '../api.js';

afterEach(() => vi.unstubAllGlobals());

const schema = z.object({ id: z.string(), version: z.number() });
const CLE = 'cle-fictive-12345';

function stub(reponse: () => Promise<Response>) {
  const f = vi.fn<typeof fetch>(() => reponse());
  vi.stubGlobal('fetch', f);
  return f;
}

async function erreurDe(p: Promise<unknown>): Promise<ErreurEcriture> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurEcriture);
    return e as ErreurEcriture;
  }
  throw new Error('aucune erreur levée');
}

describe('ecrire', () => {
  it('ecrire-201-valide-par-schema', async () => {
    const f = stub(() => Promise.resolve(Response.json({ id: 'A1', version: 1 }, { status: 201 })));
    const r = await ecrire('POST', '/abonnement/palier', { palier: 'x' }, schema, CLE);
    expect(r).toEqual({ id: 'A1', version: 1 });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe(new URL('/abonnement/palier', location.origin).toString());
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ palier: 'x' }));
  });

  it('entete-idempotency-key-envoyee', async () => {
    const f = stub(() => Promise.resolve(Response.json({ id: 'A1', version: 1 })));
    await ecrire('PUT', '/a', {}, schema, CLE);
    const h = new Headers(f.mock.calls[0]![1]?.headers);
    expect(h.get('idempotency-key')).toBe(CLE);
    expect(h.get('content-type')).toBe('application/json');
    expect(nouvelleCle().length).toBeGreaterThanOrEqual(8);
    expect(nouvelleCle()).not.toBe(nouvelleCle());
  });

  it('meme-cle-reutilisee-telle-quelle', async () => {
    const f = stub(() => Promise.resolve(Response.json({ id: 'A1', version: 1 })));
    await ecrire('POST', '/a', { n: 1 }, schema, CLE);
    await ecrire('POST', '/a', { n: 1 }, schema, CLE);
    const cles = f.mock.calls.map((c) => new Headers(c[1]?.headers).get('idempotency-key'));
    expect(cles).toEqual([CLE, CLE]);
  });

  it('code-serveur-conserve', async () => {
    stub(() => Promise.resolve(Response.json({ code: 'ACCORD_MANQUANT', details: 1 }, { status: 422 })));
    const e = await erreurDe(ecrire('POST', '/a', {}, schema, CLE));
    expect(e.statut).toBe(422);
    expect(e.code).toBe('ACCORD_MANQUANT');
    expect(e.donnees).toEqual({ code: 'ACCORD_MANQUANT', details: 1 });
  });

  it('etat-acces-403-conserve', async () => {
    stub(() => Promise.resolve(Response.json({ code: 'ETAT_ACCES' }, { status: 403 })));
    const e = await erreurDe(ecrire('DELETE', '/a', undefined, schema, CLE));
    expect(e.statut).toBe(403);
    expect(e.code).toBe('ETAT_ACCES');
  });

  it('reseau', async () => {
    stub(() => Promise.reject(new TypeError('coupé')));
    const e = await erreurDe(ecrire('POST', '/a', {}, schema, CLE));
    expect(e.statut).toBe(0);
    expect(e.code).toBe('reseau');
    stub(() => Promise.resolve(new Response('<html></html>', { status: 502 })));
    const s = await erreurDe(ecrire('POST', '/a', {}, schema, CLE));
    expect(s.statut).toBe(502);
    expect(s.code).toBe('serveur');
  });

  it('reponse-invalide', async () => {
    stub(() => Promise.resolve(Response.json({ id: 5 }, { status: 201 })));
    const e = await erreurDe(ecrire('POST', '/a', {}, schema, CLE));
    expect(e.statut).toBe(201);
    expect(e.code).toBe('reponse_invalide');
    stub(() => Promise.resolve(new Response('pas du json', { status: 200 })));
    expect((await erreurDe(ecrire('POST', '/a', {}, schema, CLE))).code).toBe('reponse_invalide');
  });

  it('cle-invalide-sans-appel', async () => {
    const f = stub(() => Promise.resolve(Response.json({})));
    for (const cle of ['', 'court', '1234567', 'x'.repeat(129)]) {
      const e = await erreurDe(ecrire('POST', '/a', {}, schema, cle));
      expect(e.code).toBe('cle_invalide');
    }
    expect(f).not.toHaveBeenCalled();
  });
});
