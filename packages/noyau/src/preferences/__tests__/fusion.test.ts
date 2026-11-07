import { describe, expect, it } from 'vitest';
import {
  ErreurFusion,
  appliquerEcriture,
  lirePreferences,
  terminerInstallation,
  type Ligne,
} from '../fusion.js';

const T = 1_000_000;
const TOL = 300_000;
const ctx = { maintenant: T, toleranceMs: TOL };
const ligne = (p: Partial<Ligne> & Pick<Ligne, 'cle'>): Ligne => ({
  appareil: 'tous',
  valeur: 'x',
  origine: 'personne',
  modifieLe: 0,
  ...p,
});
const defauts = { chat_etat: 'reduit', menu_etat: 'ouvert', premier_lancement: { termine: false } };
const ecrit = (lignes: Ligne[], cle: string, valeur: unknown, modifieLeClient?: number, appareil: Ligne['appareil'] = 'bureau'): Ligne[] =>
  appliquerEcriture(lignes, { cle, appareil, valeur, ...(modifieLeClient === undefined ? {} : { modifieLeClient }) }, ctx);

describe('préférences : fusion', () => {
  it('derniere-ecriture-gagne', () => {
    const a = ecrit([], 'menu_etat', 'ouvert', T - 2000);
    const b = ecrit(a, 'menu_etat', 'reduit', T - 1000);
    expect(b).toEqual([{ cle: 'menu_etat', appareil: 'bureau', valeur: 'reduit', origine: 'personne', modifieLe: T - 1000 }]);
    const c = ecrit(b, 'menu_etat', 'ouvert', T - 1000);
    expect(c[0]?.valeur).toBe('ouvert');
    expect(ecrit([], 'menu_etat', 'ouvert')[0]?.modifieLe).toBe(T);
  });

  it('ecriture-plus-ancienne-ignoree', () => {
    const a = ecrit([], 'menu_etat', 'reduit', T - 1000);
    const copie = structuredClone(a);
    const b = ecrit(a, 'menu_etat', 'ouvert', T - 2000);
    expect(b).toEqual(copie);
    expect(a).toEqual(copie);
  });

  it('horloge-client-en-avance-bornee', () => {
    const a = ecrit([], 'menu_etat', 'reduit', T + TOL + 10 ** 9);
    expect(a[0]?.modifieLe).toBe(T + TOL);
    expect(ecrit([], 'menu_etat', 'reduit', T + TOL)[0]?.modifieLe).toBe(T + TOL);
    expect(ecrit([], 'menu_etat', 'reduit', T + TOL - 1)[0]?.modifieLe).toBe(T + TOL - 1);
  });

  it('horloge-client-en-retard-bornee', () => {
    const a = ecrit([], 'menu_etat', 'reduit', T - TOL - 10 ** 5);
    expect(a[0]?.modifieLe).toBe(T - TOL);
    expect(ecrit([], 'menu_etat', 'reduit', T - TOL)[0]?.modifieLe).toBe(T - TOL);
    expect(ecrit([], 'menu_etat', 'reduit', T - TOL + 1)[0]?.modifieLe).toBe(T - TOL + 1);
  });

  it('cle-par-cle-independantes', () => {
    const a = ecrit([], 'menu_etat', 'reduit', T);
    const b = ecrit(a, 'chat_etat', 'plein', T - 1000);
    const c = ecrit(b, 'menu_etat', 'ouvert', T - 5000, 'mobile');
    expect(c).toHaveLength(3);
    expect(c.find((l) => l.cle === 'menu_etat' && l.appareil === 'bureau')?.valeur).toBe('reduit');
    expect(c.find((l) => l.cle === 'chat_etat')?.valeur).toBe('plein');
    expect(c.find((l) => l.appareil === 'mobile')?.valeur).toBe('ouvert');
  });

  it('lecture-appareil-puis-tous-puis-defaut', () => {
    const l = [ligne({ cle: 'menu_etat', valeur: 'reduit' }), ligne({ cle: 'menu_etat', appareil: 'mobile', valeur: 'ouvert' })];
    expect(lirePreferences(l, 'mobile', defauts)['menu_etat']?.valeur).toBe('ouvert');
    expect(lirePreferences(l, 'bureau', defauts)['menu_etat']?.valeur).toBe('reduit');
    expect(lirePreferences([], 'bureau', defauts)['menu_etat']).toEqual({ valeur: 'ouvert', origine: 'defaut' });
  });

  it('premier-lancement-elargi', () => {
    expect(lirePreferences([], 'bureau', defauts)['chat_etat']).toEqual({ valeur: 'elargi', origine: 'defaut' });
    const sansDefaut = lirePreferences([], 'bureau', {});
    expect(sansDefaut['chat_etat']).toEqual({ valeur: 'elargi', origine: 'defaut' });
    const fini = [ligne({ cle: 'premier_lancement', valeur: { termine: true }, origine: 'systeme' })];
    expect(lirePreferences(fini, 'bureau', defauts)['chat_etat']).toEqual({ valeur: 'reduit', origine: 'defaut' });
    const choisi = [ligne({ cle: 'chat_etat', valeur: 'plein' })];
    expect(lirePreferences(choisi, 'bureau', defauts)['chat_etat']).toEqual({ valeur: 'plein', origine: 'personne' });
  });

  it('fin-installation-normal-si-pas-choisi', () => {
    const r = terminerInstallation([], T);
    expect(r.find((l) => l.cle === 'premier_lancement')).toEqual({
      cle: 'premier_lancement', appareil: 'tous', valeur: { termine: true }, origine: 'systeme', modifieLe: T,
    });
    expect(r.find((l) => l.cle === 'chat_etat')).toEqual({
      cle: 'chat_etat', appareil: 'tous', valeur: 'normal', origine: 'systeme', modifieLe: T,
    });
    expect(lirePreferences(r, 'bureau', defauts)['chat_etat']?.valeur).toBe('normal');
    const deux = terminerInstallation(r, T + 1);
    expect(deux.filter((l) => l.cle === 'chat_etat')).toHaveLength(1);
    expect(deux.filter((l) => l.cle === 'premier_lancement')).toHaveLength(1);
  });

  it('choix-personne-jamais-ecrase', () => {
    const entree = [ligne({ cle: 'chat_etat', appareil: 'mobile', valeur: 'plein', modifieLe: 5 })];
    const copie = structuredClone(entree);
    const r = terminerInstallation(entree, T);
    expect(entree).toEqual(copie);
    expect(r.filter((l) => l.cle === 'chat_etat')).toEqual(copie);
    expect(r.find((l) => l.cle === 'premier_lancement')?.valeur).toEqual({ termine: true });
  });

  it('horodatages-invalides-refuses', () => {
    const code = (f: () => unknown): string | undefined => {
      try {
        f();
        return undefined;
      } catch (e) {
        return e instanceof ErreurFusion ? e.code : 'autre';
      }
    };
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5]) {
      expect(code(() => ecrit([], 'menu_etat', 'ouvert', v))).toBe('horodatage_invalide');
      expect(code(() => appliquerEcriture([], { cle: 'a', appareil: 'tous', valeur: 1 }, { maintenant: v, toleranceMs: TOL }))).toBe('horodatage_invalide');
      expect(code(() => appliquerEcriture([], { cle: 'a', appareil: 'tous', valeur: 1 }, { maintenant: T, toleranceMs: v }))).toBe('horodatage_invalide');
      expect(code(() => terminerInstallation([], v))).toBe('horodatage_invalide');
    }
    expect(code(() => appliquerEcriture([], { cle: 'a', appareil: 'tous', valeur: 1 }, { maintenant: T, toleranceMs: -1 }))).toBe('horodatage_invalide');
    expect(code(() => ecrit([], 'menu_etat', 'ouvert', 0))).toBeUndefined();
  });
});
