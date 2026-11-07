import { describe, expect, it } from 'vitest';
import { REPONSE_INTROUVABLE, lireDansSociete, verifierSocieteDeLaRequete } from '../societe.js';

const base = { societeSession: 'A', societesDuCorps: [] as string[], societesDeLaPersonne: ['A', 'B'] };
const refus = (raison: string) => ({ ok: false, raison });

describe('securite/societe', () => {
  it('societe-de-la-session-acceptee', () => {
    expect(verifierSocieteDeLaRequete(base)).toEqual({ ok: true, societeId: 'A' });
    expect(verifierSocieteDeLaRequete({ ...base, societeChemin: 'A', societesDuCorps: ['A', 'A'] })).toEqual({ ok: true, societeId: 'A' });
  });

  it('chemin-autre-societe-refuse', () => {
    expect(verifierSocieteDeLaRequete({ ...base, societeChemin: 'B' })).toEqual(refus('societe_unique'));
    expect(verifierSocieteDeLaRequete({ ...base, societeChemin: '' })).toEqual(refus('societe_unique'));
  });

  it('corps-qui-melange-refuse', () => {
    expect(verifierSocieteDeLaRequete({ ...base, societesDuCorps: ['A', 'B'] })).toEqual(refus('societe_unique'));
    expect(verifierSocieteDeLaRequete({ ...base, societesDuCorps: ['C'] })).toEqual(refus('societe_unique'));
  });

  it('session-vide-refusee', () => {
    expect(verifierSocieteDeLaRequete({ ...base, societeSession: '' })).toEqual(refus('non_authentifie'));
    expect(verifierSocieteDeLaRequete({ ...base, societeSession: '', societesDeLaPersonne: [''] })).toEqual(refus('non_authentifie'));
    expect(verifierSocieteDeLaRequete({ ...base, societeSession: undefined as unknown as string })).toEqual(refus('non_authentifie'));
  });

  it('societe-hors-personne-refusee', () => {
    expect(verifierSocieteDeLaRequete({ ...base, societeSession: 'C' })).toEqual(refus('societe_unique'));
    expect(verifierSocieteDeLaRequete({ ...base, societesDeLaPersonne: [] })).toEqual(refus('societe_unique'));
  });

  it('casse-differente-refusee', () => {
    expect(verifierSocieteDeLaRequete({ ...base, societeChemin: 'a' })).toEqual(refus('societe_unique'));
    expect(verifierSocieteDeLaRequete({ ...base, societesDuCorps: ['a'] })).toEqual(refus('societe_unique'));
    expect(verifierSocieteDeLaRequete({ ...base, societeSession: 'a' })).toEqual(refus('societe_unique'));
    expect(verifierSocieteDeLaRequete({ ...base, societeChemin: 'A ' })).toEqual(refus('societe_unique'));
  });

  it('inexistant-et-autre-societe-meme-reponse', () => {
    const autre = lireDansSociete({ societeId: 'B', id: 'x1' }, 'A');
    const absent = lireDansSociete(undefined, 'A');
    expect(autre).toBe(absent);
    expect(autre).toBe(REPONSE_INTROUVABLE);
    expect(JSON.stringify(autre)).toBe(JSON.stringify(absent));
    expect(REPONSE_INTROUVABLE).toEqual({ statut: 404, code: 'introuvable' });
    expect(Object.isFrozen(REPONSE_INTROUVABLE)).toBe(true);
    const mien = { societeId: 'A', id: 'x2' };
    expect(lireDansSociete(mien, 'A')).toBe(mien);
  });

  it('tache-de-fond-autre-societe-introuvable', () => {
    const tache = { societeId: 'C', id: 't1' };
    expect(lireDansSociete(tache, 'A')).toBe(REPONSE_INTROUVABLE);
    expect(lireDansSociete(tache, 'c')).toBe(REPONSE_INTROUVABLE);
    expect(lireDansSociete(tache, '')).toBe(REPONSE_INTROUVABLE);
    expect(tache).toEqual({ societeId: 'C', id: 't1' });
  });

  it('corps-sans-societe-accepte', () => {
    const entree = { ...base, societesDuCorps: [] as string[] };
    expect(verifierSocieteDeLaRequete(entree)).toEqual({ ok: true, societeId: 'A' });
    expect(entree.societesDuCorps).toEqual([]);
  });
});
