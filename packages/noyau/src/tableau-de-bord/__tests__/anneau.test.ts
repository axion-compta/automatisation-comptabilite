import { describe, expect, it } from 'vitest';
import { calculerAnneau, couleurDe, type SousIndicateur } from '../anneau.js';

const S = { vertPourCent: 70, orangePourCent: 40 };
const si = (nombre: number, sur: number): SousIndicateur => ({ code: 'x', nombre, sur });
const absent = (code: string): SousIndicateur => ({ code, absent: true });
const ok = (code: string, nombre: number, sur: number): SousIndicateur => ({ code, nombre, sur });
const reg = (pieces: string[], banque: string[], tva: string[]) => ({ pieces, banque, tva });

describe('anneau de santé', () => {
  it('vert-a-la-limite-exacte', () => {
    expect(couleurDe(si(7, 10), S)).toBe('vert');
    expect(couleurDe(si(14, 20), S)).toBe('vert');
    expect(couleurDe(si(10, 10), S)).toBe('vert');
  });

  it('orange-juste-sous-le-vert', () => {
    expect(couleurDe(si(69, 100), S)).toBe('orange');
    expect(couleurDe(si(4, 10), S)).toBe('orange');
  });

  it('rouge-sous-l-orange', () => {
    expect(couleurDe(si(39, 100), S)).toBe('rouge');
    expect(couleurDe(si(0, 10), S)).toBe('rouge');
  });

  it('sur-zero-pointille', () => {
    expect(couleurDe(si(0, 0), S)).toBe('pointille');
    expect(couleurDe(absent('a'), S)).toBe('pointille');
  });

  it('valeurs-invalides-refusees', () => {
    for (const [n, s] of [[-1, 10], [1.5, 10], [NaN, 10], [Infinity, 10], [11, 10], [1, -1], [1, 2.5], [1, NaN], [1, Infinity], [1, 0]] as const) {
      expect(() => couleurDe(si(n, s), S), `${n}/${s}`).toThrow('valeur_invalide');
    }
  });

  it('arc-prend-la-pire-couleur', () => {
    const r = calculerAnneau([ok('a', 10, 10), ok('b', 5, 10), ok('c', 1, 10), ok('d', 9, 10), ok('e', 10, 10)], reg(['a', 'b'], ['c', 'd'], ['e']), S);
    expect(r.arcs.map((a) => [a.code, a.couleur])).toEqual([['pieces', 'orange'], ['banque', 'rouge'], ['tva', 'vert']]);
    expect(r.global).toBe('rouge');
    expect(r.arcs[0]!.sous).toEqual([{ code: 'a', couleur: 'vert' }, { code: 'b', couleur: 'orange' }]);
    expect(r.centre).toEqual({ mot: 'rouge', nombre: 35, sur: 50 });
  });

  it('absent-ignore-dans-la-pire-couleur', () => {
    const r = calculerAnneau([ok('a', 10, 10), absent('b'), absent('c'), ok('e', 1, 10), ok('f', 0, 0)], reg(['a', 'b'], ['c'], ['e', 'f']), S);
    expect(r.arcs.map((a) => a.couleur)).toEqual(['vert', 'pointille', 'rouge']);
    expect(r.arcs[0]!.sous[1]).toEqual({ code: 'b', couleur: 'pointille' });
    expect(r.global).toBe('rouge');
    expect(r.centre).toEqual({ mot: 'rouge', nombre: 11, sur: 20 });
  });

  it('tout-absent-anneau-pointille', () => {
    const r = calculerAnneau([absent('a'), absent('b'), ok('c', 0, 0)], reg(['a'], ['b'], ['c']), S);
    expect(r.arcs.every((a) => a.couleur === 'pointille')).toBe(true);
    expect(r.global).toBe('pointille');
    expect(r.centre).toEqual({ mot: 'donnees_absentes' });
    expect(calculerAnneau([], reg([], [], []), S).global).toBe('pointille');
    expect(() => calculerAnneau([ok('a', 1, 1)], reg(['inconnu'], [], []), S)).toThrow('regroupement_invalide');
    expect(() => calculerAnneau([ok('a', 2, 1)], reg(['a'], [], []), S)).toThrow('valeur_invalide');
  });

  it('aucun-champ-pourcentage', () => {
    const r = calculerAnneau([ok('a', 3, 4), absent('b')], reg(['a'], ['b'], []), S);
    const cles = (v: unknown): string[] =>
      Array.isArray(v) ? v.flatMap(cles) : v !== null && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...cles(x)]) : [];
    const toutes = cles(r);
    expect(toutes.length).toBeGreaterThan(8);
    expect(toutes.filter((k) => /pourcent/i.test(k))).toEqual([]);
  });

  it('seuils-invalides-refuses', () => {
    for (const s of [{ vertPourCent: 40, orangePourCent: 70 }, { vertPourCent: 101, orangePourCent: 40 }, { vertPourCent: 70, orangePourCent: -1 }, { vertPourCent: 70.5, orangePourCent: 40 }, { vertPourCent: NaN, orangePourCent: 0 }]) {
      expect(() => couleurDe(si(5, 10), s)).toThrow('seuils_invalides');
      expect(() => calculerAnneau([], reg([], [], []), s)).toThrow('seuils_invalides');
    }
    expect(couleurDe(si(0, 10), { vertPourCent: 100, orangePourCent: 100 })).toBe('rouge');
    expect(couleurDe(si(10, 10), { vertPourCent: 0, orangePourCent: 0 })).toBe('vert');
  });
});
