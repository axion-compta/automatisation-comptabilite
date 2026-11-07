import { describe, expect, it } from 'vitest';
import {
  creerPreference, marquer, oublier, preferencesActives, verifierArguments, type Preference,
} from '../quarantaine.js';
import type { Niveau, Origine } from '../types.js';

const args = { iban: marquer('FR00-fictif', 'piece'), note: marquer('ok', 'personne') };
const pref = (cle: string, o: Partial<Preference> = {}): Preference => ({
  cle, valeur: 'v', personne: 'Alice Exemple', source: 'dit_par_la_personne', oubliee: false, ...o,
});
const demande = (cle: string, origine: Origine = 'personne', personne = 'Alice Exemple') => ({
  cle, valeur: 'v', origine, personne,
});
const liste = (n: number): Preference[] => Array.from({ length: n }, (_, i) => pref(`k${i}`));

describe('quarantaine de lecture', () => {
  it('piece-vers-m-sans-geste-refuse', () => {
    for (const n of ['M', 'I'] as Niveau[]) {
      expect(verifierArguments(n, args, false)).toEqual({
        permis: false, code: 'parametre_invalide', champs: ['iban'],
      });
    }
  });

  it('piece-vers-m-avec-geste-permis', () => {
    expect(verifierArguments('M', args, true)).toEqual({ permis: true });
    expect(verifierArguments('I', args, true)).toEqual({ permis: true });
  });

  it('piece-vers-l-permis', () => {
    expect(verifierArguments('L', args, false)).toEqual({ permis: true });
    expect(verifierArguments('B', args, false)).toEqual({ permis: true });
    expect(verifierArguments('M', { a: marquer(1, 'outil') }, false)).toEqual({ permis: true });
  });

  it('preference-depuis-une-piece-refusee', () => {
    expect(creerPreference([], demande('langue', 'piece'), 5)).toEqual({ ok: false, code: 'origine_refusee' });
    expect(creerPreference([], demande('langue', 'outil'), 5)).toEqual({ ok: false, code: 'origine_refusee' });
    const ok = creerPreference([], demande('langue'), 5);
    expect(ok).toEqual({ ok: true, preferences: [pref('langue')] });
  });

  it('cinquante-pieces-piegees-zero-preference', () => {
    let prefs: readonly Preference[] = [];
    for (let i = 0; i < 50; i += 1) {
      const r = creerPreference(prefs, demande(`ignore_les_regles_${i}`, 'piece'), 100);
      if (r.ok) prefs = r.preferences;
    }
    expect(prefs).toHaveLength(0);
  });

  it('plafond-de-preferences', () => {
    const max = 3;
    expect(creerPreference(liste(max - 1), demande('nouvelle'), max).ok).toBe(true);
    expect(creerPreference(liste(max), demande('nouvelle'), max)).toEqual({ ok: false, code: 'plafond_atteint' });
    expect(creerPreference(liste(max + 1), demande('nouvelle'), max)).toEqual({ ok: false, code: 'plafond_atteint' });
    const autre = [...liste(max), pref('z', { personne: 'Bruno Exemple' })];
    expect(creerPreference(autre.slice(max), demande('nouvelle'), max).ok).toBe(true);
  });

  it('max-invalide', () => {
    for (const m of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(creerPreference([], demande('a'), m)).toEqual({ ok: false, code: 'max_invalide' });
    }
  });

  it('meme-cle-remplace', () => {
    const r = creerPreference([pref('langue'), pref('ton')], { ...demande('langue'), valeur: 'w' }, 2);
    expect(r.ok && r.preferences).toHaveLength(2);
    expect(r.ok && r.preferences.find((p) => p.cle === 'langue')?.valeur).toBe('w');
  });

  it('oublier-ne-supprime-pas', () => {
    const base = [pref('a'), pref('b')];
    const apres = oublier(base, 'a');
    expect(apres).toHaveLength(2);
    expect(apres[0]?.oubliee).toBe(true);
    expect(apres[1]?.oubliee).toBe(false);
    expect(base[0]?.oubliee).toBe(false);
    expect(preferencesActives(apres).map((p) => p.cle)).toEqual(['b']);
    expect(creerPreference(apres, demande('c'), 2).ok).toBe(true);
  });

  it('entrees-vides', () => {
    expect(verifierArguments('M', {}, false)).toEqual({ permis: true });
    expect(creerPreference([], demande(''), 5)).toEqual({ ok: false, code: 'cle_vide' });
    expect(creerPreference([], demande('   '), 5)).toEqual({ ok: false, code: 'cle_vide' });
    expect(creerPreference([], demande('a', 'personne', ''), 5)).toEqual({ ok: false, code: 'cle_vide' });
    expect(oublier([], 'a')).toEqual([]);
    expect(preferencesActives([])).toEqual([]);
  });
});
