import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ErreurEtancheite, REPONSE_INTROUVABLE } from '../../../../../packages/noyau/src/principes/etancheite.js';
import type { Signataire } from '../../documents/lien-expirant.js';
import { creerLiensExport, ErreurLienExport, type SessionExport } from '../lien-export.js';

const DUREE_TEST_MS = 60_000;
const INSTANT_MS = Date.UTC(2026, 0, 15, 10, 0, 0);
const UNE_MS = 1;
const TAILLE_CLE = 32;
const CLE = 'k'.repeat(TAILLE_CLE);
const NOM = 'journal-ventes.csv';
const OCTETS = new Uint8Array([1, 2, 3, 4]);
const lemoine: SessionExport = { sessionId: 'session-a', societeId: 'societe-lemoine' };
const rivoire: SessionExport = { sessionId: 'session-b', societeId: 'societe-rivoire' };
const lemoineAutre: SessionExport = { sessionId: 'session-c', societeId: 'societe-lemoine' };

const hmac = (c: string): string => createHmac('sha256', CLE).update(c).digest('base64url');
const signataire: Signataire = {
  signer: async (c) => hmac(c),
  verifier: async (c, s) => hmac(c) === s,
};

function monter(duree = DUREE_TEST_MS) {
  const fichiers = new Map<string, Uint8Array>([[`compta/societe-lemoine/${NOM}`, OCTETS]]);
  const lus: string[] = [];
  const stockage = {
    lire: async (chemin: string) => {
      lus.push(chemin);
      return fichiers.get(chemin) ?? null;
    },
  };
  return { fichiers, lus, ...creerLiensExport({ stockage, signataire }, { dureeLienMs: duree }) };
}

async function lien(m: ReturnType<typeof monter>, s = lemoine): Promise<string> {
  const r = await m.demanderLienExport(s, NOM, INSTANT_MS);
  if (r.statutHttp !== 201) throw new Error('lien attendu');
  return r.url.replace('/exports/telechargement/', '');
}

describe('lien-export', () => {
  it('lien-201-chemin-sous-compta-societe', async () => {
    const m = monter();
    const r = await m.demanderLienExport(lemoine, NOM, INSTANT_MS);
    expect(m.lus).toEqual([`compta/societe-lemoine/${NOM}`]);
    if (r.statutHttp !== 201) throw new Error('201 attendu');
    expect(r.url.startsWith('/exports/telechargement/')).toBe(true);
    expect(r.expireLe).toBe(new Date(INSTANT_MS + DUREE_TEST_MS).toISOString());
    const t = await m.telechargerExport(r.url.replace('/exports/telechargement/', ''), lemoine, INSTANT_MS);
    expect(t).toEqual({ statutHttp: 200, octets: OCTETS });
  });

  it('pri-8-05-autre-societe-404', async () => {
    const m = monter();
    const jeton = await lien(m);
    m.lus.length = 0;
    const r = await m.telechargerExport(jeton, rivoire, INSTANT_MS);
    expect(r).toBe(REPONSE_INTROUVABLE);
    expect(await m.telechargerExport('inconnu.inconnu', rivoire, INSTANT_MS)).toBe(r);
    expect(m.lus).toEqual([]);
  });

  it('autre-session-meme-societe-404', async () => {
    const m = monter();
    const jeton = await lien(m);
    expect(await m.telechargerExport(jeton, lemoineAutre, INSTANT_MS)).toBe(REPONSE_INTROUVABLE);
  });

  it('lien-expire-410', async () => {
    const m = monter();
    const jeton = await lien(m);
    const echeance = INSTANT_MS + DUREE_TEST_MS;
    expect((await m.telechargerExport(jeton, lemoine, echeance - UNE_MS)).statutHttp).toBe(200);
    for (const t of [echeance, echeance + UNE_MS]) {
      expect(await m.telechargerExport(jeton, lemoine, t)).toEqual({ statutHttp: 410, code: 'lien_expire' });
    }
  });

  it('jeton-falsifie-404', async () => {
    const m = monter();
    const jeton = await lien(m);
    const dernier = jeton.slice(-UNE_MS);
    const change = jeton.slice(0, -UNE_MS) + (dernier === 'A' ? 'B' : 'A');
    for (const j of [change, '', jeton.slice(0, jeton.length / 2)]) {
      expect(await m.telechargerExport(j, lemoine, INSTANT_MS)).toBe(REPONSE_INTROUVABLE);
    }
  });

  it('fichier-absent-404', async () => {
    const m = monter();
    expect(await m.demanderLienExport(lemoine, 'jamais-produit.csv', INSTANT_MS)).toBe(REPONSE_INTROUVABLE);
    const jeton = await lien(m);
    m.fichiers.clear();
    expect(await m.telechargerExport(jeton, lemoine, INSTANT_MS)).toBe(REPONSE_INTROUVABLE);
  });

  it('nom-invalide-refuse', async () => {
    const m = monter();
    for (const nom of ['../x', 'a/b', '..', '.cache', '']) {
      await expect(m.demanderLienExport(lemoine, nom, INSTANT_MS)).rejects.toMatchObject({ code: 'nom_invalide' });
    }
    expect(m.lus).toEqual([]);
  });

  it('duree-invalide', async () => {
    for (const d of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5]) {
      const m = monter(d);
      await expect(m.demanderLienExport(lemoine, NOM, INSTANT_MS)).rejects.toMatchObject({ code: 'duree_invalide' });
    }
  });

  it('session-incomplete-refusee', async () => {
    const m = monter();
    const vide = await m.demanderLienExport({ ...lemoine, sessionId: '' }, NOM, INSTANT_MS).catch((e: unknown) => e);
    expect(vide).toBeInstanceOf(ErreurLienExport);
    expect(vide).toMatchObject({ code: 'session_invalide' });
    const sans = await m.demanderLienExport({ ...lemoine, societeId: '' }, NOM, INSTANT_MS).catch((e: unknown) => e);
    expect(sans).toBeInstanceOf(ErreurEtancheite);
    expect(sans).toMatchObject({ code: 'session_sans_societe' });
    expect(m.lus).toEqual([]);
  });
});
