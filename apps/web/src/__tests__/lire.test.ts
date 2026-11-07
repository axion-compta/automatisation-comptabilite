// @vitest-environment jsdom
// Fiche L01-T34 : lire() typé, validé par schéma zod.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ErreurLecture, lire } from '../api.js';

afterEach(() => vi.unstubAllGlobals());
const schema = z.object({ total: z.number(), elements: z.array(z.object({ id: z.string() })) });
const repondre = (statut: number, corps: unknown) => vi.stubGlobal('fetch', () => Promise.resolve(Response.json(corps, { status: statut })));
const echec = async (p: Promise<unknown>): Promise<ErreurLecture> => {
  try {
    await p;
  } catch (e) {
    return e as ErreurLecture;
  }
  throw new Error('aucune erreur levée');
};

describe('lire', () => {
  it('lire-ok-valide-par-schema', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      urls.push(url);
      return Promise.resolve(Response.json({ total: 1, elements: [{ id: 'E1' }] }));
    });
    expect(await lire('/ecritures', schema)).toEqual({ total: 1, elements: [{ id: 'E1' }] });
    expect(urls).toEqual([location.origin + '/ecritures']);
  });
  it('lire-403-acces-refuse', async () => {
    repondre(403, {});
    const e = await echec(lire('/ecritures', schema));
    expect(e).toBeInstanceOf(ErreurLecture);
    expect([e.statut, e.code]).toEqual([403, 'acces_refuse']);
  });
  it('lire-423-verrouille', async () => {
    repondre(423, {});
    const e = await echec(lire('/ecritures', schema));
    expect([e.statut, e.code]).toEqual([423, 'verrouille']);
  });
  it('lire-reseau', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('coupé')));
    const e = await echec(lire('/ecritures', schema));
    expect([e.statut, e.code]).toEqual([0, 'reseau']);
  });
  it('lire-reponse-invalide', async () => {
    repondre(200, { total: 'beaucoup' });
    const e = await echec(lire('/ecritures', schema));
    expect(e.code).toBe('reponse_invalide');
  });
});
