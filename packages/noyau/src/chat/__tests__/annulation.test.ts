import { describe, expect, it } from 'vitest';
import { annuler, empreinteCanonique, modeAnnulation } from '../annulation.js';
import { ErreurChat } from '../types.js';

const T0 = '2030-01-01T00:00:00.000Z';
const TOAST = 10_000;
const HISTO = 900_000;
const apres = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();
const mode = (ms: number, extra: Record<string, unknown> = {}) =>
  modeAnnulation({ appliqueLe: T0, maintenant: apres(ms), objetValideOuEnvoye: false, toastMs: TOAST, historiqueMs: HISTO, ...extra } as never);
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurChat);
    return (e as ErreurChat).code;
  }
  return 'aucune_erreur';
};

describe('annulation du chat', () => {
  it('dans-le-toast', () => {
    expect(mode(0)).toBe('toast');
    expect(mode(TOAST - 1)).toBe('toast');
  });

  it('borne-du-toast', () => {
    expect(mode(TOAST)).toBe('historique');
    expect(modeAnnulation({ appliqueLe: T0, maintenant: apres(5), objetValideOuEnvoye: false, toastMs: 5, historiqueMs: 5 })).toBe('contre_passation');
    expect(mode(0, { toastMs: 0 })).toBe('historique');
  });

  it('dans-l-historique', () => {
    expect(mode(TOAST + 1)).toBe('historique');
    expect(mode(HISTO - 1)).toBe('historique');
  });

  it('borne-de-l-historique', () => {
    expect(mode(HISTO)).toBe('contre_passation');
    expect(mode(HISTO + 1)).toBe('contre_passation');
  });

  it('objet-valide-contre-passation', () => {
    for (const ms of [0, TOAST, HISTO - 1]) expect(mode(ms, { objetValideOuEnvoye: true })).toBe('contre_passation');
  });

  it('horloge-reculee-refusee', () => {
    expect(code(() => mode(-1))).toBe('parametre_invalide');
    expect(code(() => mode(0, { maintenant: 'pas une date' }))).toBe('parametre_invalide');
    expect(code(() => mode(0, { appliqueLe: 'pas une date' }))).toBe('parametre_invalide');
  });

  it('reglages-invalides', () => {
    const mauvais: Record<string, unknown>[] = [
      { toastMs: Number.NaN }, { toastMs: Infinity }, { toastMs: -1 }, { toastMs: 1.5 },
      { historiqueMs: Number.NaN }, { historiqueMs: Infinity }, { historiqueMs: -1 }, { historiqueMs: 1.5 },
      { toastMs: HISTO + 1 },
    ];
    for (const m of mauvais) expect(code(() => mode(0, m))).toBe('parametre_invalide');
    expect(code(() => mode(0, { toastMs: 0, historiqueMs: 0 }))).toBe('aucune_erreur');
  });

  it('empreinte-independante-de-l-ordre-des-cles', () => {
    const a = { z: 1, a: { y: [1, { q: 1, b: 2 }], x: null }, m: 'x' };
    const b = { m: 'x', a: { x: null, y: [1, { b: 2, q: 1 }] }, z: 1 };
    expect(empreinteCanonique(a)).toBe(empreinteCanonique(b));
    expect(empreinteCanonique([1, 2])).not.toBe(empreinteCanonique([2, 1]));
    expect(empreinteCanonique({ a: 1 })).not.toBe(empreinteCanonique({ a: '1' }));
    expect(empreinteCanonique({ a: 1, b: 2 })).not.toBe(empreinteCanonique({ a: 2, b: 1 }));
    for (const v of [undefined, () => 1, Number.NaN, Infinity, -Infinity, { a: undefined }, [undefined], { a: { b: Number.NaN } }, 1n, Symbol('s')]) {
      expect(code(() => empreinteCanonique(v))).toBe('parametre_invalide');
    }
    const boucle: Record<string, unknown> = {};
    boucle.moi = boucle;
    expect(code(() => empreinteCanonique(boucle))).toBe('parametre_invalide');
  });

  it('retour-exact', () => {
    const avant = { lignes: [{ compte: '601000', debit: 100 }, { compte: '401000', credit: 100 }], statut: 'brouillon' };
    const modifie = { lignes: [{ compte: '601000', debit: 250 }], statut: 'brouillon' };
    const rendu = annuler(structuredClone(modifie), modifie, avant);
    expect(empreinteCanonique(rendu)).toBe(empreinteCanonique(avant));
    expect(rendu).not.toBe(avant);
    (rendu as typeof avant).lignes[0]!.debit = 999;
    expect(avant.lignes[0]!.debit).toBe(100);
    expect(code(() => annuler(modifie, modifie, { a: undefined }))).toBe('parametre_invalide');
  });

  it('objet-change-depuis-refuse', () => {
    const modifie = { total: 250, lignes: [1, 2] };
    expect(code(() => annuler({ ...modifie, total: 251 }, modifie, { total: 100 }))).toBe('annulation_expiree');
    expect(code(() => annuler({ ...modifie, lignes: [2, 1] }, modifie, { total: 100 }))).toBe('annulation_expiree');
    expect(code(() => annuler({ ...modifie, en_plus: true }, modifie, { total: 100 }))).toBe('annulation_expiree');
    expect(code(() => annuler({ lignes: [1, 2], total: 250 }, modifie, { total: 100 }))).toBe('aucune_erreur');
  });
});
