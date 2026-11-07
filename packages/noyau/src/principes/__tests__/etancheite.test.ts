import { describe, expect, it } from 'vitest';
import {
  ErreurEtancheite,
  REPONSE_INTROUVABLE,
  cheminExport,
  exportAccessible,
  societeDeLaRequete,
} from '../etancheite.js';

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurEtancheite) return e.code;
    throw e;
  }
  return undefined;
}

describe('etancheite par societe', () => {
  it('societe-de-la-session-retenue', () => {
    expect(societeDeLaRequete({ societeId: 'soc-A' })).toEqual({ ok: true, societeId: 'soc-A' });
    expect(societeDeLaRequete({ societeId: 'soc-A' }, undefined)).toEqual({ ok: true, societeId: 'soc-A' });
    expect(societeDeLaRequete({ societeId: 'soc-A' }, 'soc-A')).toEqual({ ok: true, societeId: 'soc-A' });
  });

  it('autre-societe-404-meme-corps-qu-inexistant', () => {
    const autre = societeDeLaRequete({ societeId: 'soc-A' }, 'soc-B');
    const inexistante = societeDeLaRequete({ societeId: 'soc-A' }, 'soc-qui-nexiste-pas');
    expect(autre).toEqual({ ok: false, reponse: REPONSE_INTROUVABLE });
    expect(inexistante).toEqual({ ok: false, reponse: REPONSE_INTROUVABLE });
    if (autre.ok || inexistante.ok) throw new Error('refus attendu');
    expect(autre.reponse).toBe(REPONSE_INTROUVABLE);
    expect(inexistante.reponse).toBe(REPONSE_INTROUVABLE);
    expect(REPONSE_INTROUVABLE).toEqual({ statutHttp: 404, code: 'introuvable' });
    expect(Object.isFrozen(REPONSE_INTROUVABLE)).toBe(true);
    // une demande vide n'est pas une demande absente
    expect(societeDeLaRequete({ societeId: 'soc-A' }, '')).toEqual({ ok: false, reponse: REPONSE_INTROUVABLE });
  });

  it('casse-differente-404', () => {
    expect(societeDeLaRequete({ societeId: 'soc-A' }, 'SOC-A')).toEqual({ ok: false, reponse: REPONSE_INTROUVABLE });
    expect(societeDeLaRequete({ societeId: 'soc-A' }, 'soc-A ')).toEqual({ ok: false, reponse: REPONSE_INTROUVABLE });
  });

  it('session-sans-societe-erreur', () => {
    expect(codeErreur(() => societeDeLaRequete({ societeId: '' }))).toBe('session_sans_societe');
    expect(codeErreur(() => societeDeLaRequete({ societeId: '' }, ''))).toBe('session_sans_societe');
    expect(codeErreur(() => societeDeLaRequete({ societeId: undefined as unknown as string }, 'x'))).toBe(
      'session_sans_societe',
    );
  });

  it('chemin-export-prefixe', () => {
    expect(cheminExport('soc-A', 'fec-2026.txt')).toBe('compta/soc-A/fec-2026.txt');
    expect(cheminExport('soc-A', 'a.b.csv')).toBe('compta/soc-A/a.b.csv');
    expect(cheminExport('soc-A', 'grand livre.csv')).toBe('compta/soc-A/grand livre.csv');
  });

  it('traversee-refusee', () => {
    for (const nom of ['../x', 'a/b', '..', '', 'a\u0000b', '.cache', 'a\\b', 'a..b', 'a\nb', 'a\u007fb', 'a\u001fb']) {
      expect(codeErreur(() => cheminExport('soc-A', nom))).toBe('nom_invalide');
    }
    for (const id of ['', 'a/b', '..', 'a\\b', '.s', 'a\u0000b', 'a..b']) {
      expect(codeErreur(() => cheminExport(id, 'f.txt'))).toBe('nom_invalide');
    }
    expect(codeErreur(() => cheminExport('soc-A', 'f.txt'))).toBeUndefined();
  });

  it('lien-autre-societe-refuse', () => {
    const sessionA = { societeId: 'A' };
    const sessionB = { societeId: 'B' };
    expect(exportAccessible('compta/A/fec.txt', sessionA)).toBe(true);
    expect(exportAccessible(cheminExport('A', 'fec.txt'), sessionA)).toBe(true);
    expect(exportAccessible('compta/A/fec.txt', sessionB)).toBe(false);
    expect(exportAccessible('compta/AB/fec.txt', sessionA)).toBe(false);
    expect(exportAccessible('compta/A', sessionA)).toBe(false);
    expect(exportAccessible('compta/a/fec.txt', sessionA)).toBe(false);
    expect(exportAccessible('autre/A/fec.txt', sessionA)).toBe(false);
    expect(exportAccessible('/compta/A/fec.txt', sessionA)).toBe(false);
    expect(exportAccessible('', sessionA)).toBe(false);
    // traversée dissimulée derrière le bon préfixe
    expect(exportAccessible('compta/A/../B/fec.txt', sessionA)).toBe(false);
    expect(exportAccessible('compta/A/x\\y', sessionA)).toBe(false);
    expect(exportAccessible('compta/A/x\u0000y', sessionA)).toBe(false);
    // session sans société : rien n'est accessible
    expect(exportAccessible('compta//fec.txt', { societeId: '' })).toBe(false);
  });
});
