import { describe, expect, it } from 'vitest';
import { aRejouer, evenementRejeu, remiseEnServicePermise } from '../rejeu-effacements.js';
import { ErreurRgpd } from '../types.js';

const DUMP = '2026-03-10T02:00:00Z';
const e = (objet: string, faitLe: string, decisionId: string) => ({ objet, faitLe, decisionId });
const code = (action: () => unknown): string | undefined => {
  try {
    action();
  } catch (x) {
    return x instanceof ErreurRgpd ? x.code : 'autre';
  }
  return undefined;
};

describe('rejeu des effacements', () => {
  it('r12-trois-rejoues', () => {
    const liste = [e('c', '2026-03-12T08:00:00Z', 'd1'), e('a', '2026-03-10T09:00:00Z', 'd3'), e('b', '2026-03-11T09:00:00Z', 'd2')];
    const r = aRejouer(liste, DUMP);
    expect(r.map((x) => x.objet)).toEqual(['a', 'b', 'c']);
    expect(aRejouer([...liste].reverse(), DUMP)).toEqual(r);
    expect(aRejouer([], DUMP)).toEqual([]);
  });

  it('effacement-avant-le-dump-ignore', () => {
    expect(aRejouer([e('a', '2026-03-10T01:59:59Z', 'd1')], DUMP)).toEqual([]);
  });

  it('meme-seconde-rejoue', () => {
    expect(aRejouer([e('a', DUMP, 'd1')], DUMP)).toHaveLength(1);
  });

  it('un-objet-une-fois', () => {
    const r = aRejouer([e('a', '2026-03-11T00:00:00Z', 'd1'), e('a', '2026-03-10T05:00:00Z', 'd9'), e('b', '2026-03-10T06:00:00Z', 'd0')], DUMP);
    expect(r.map((x) => x.decisionId)).toEqual(['d9', 'd0']);
  });

  it('millisecondes-comparees-a-la-seconde', () => {
    expect(aRejouer([e('a', '2026-03-10T02:00:00.500Z', 'd1')], DUMP)).toHaveLength(1);
    expect(aRejouer([e('a', '2026-03-10T02:00:00Z', 'd1')], '2026-03-10T02:00:00.900Z')).toHaveLength(1);
    expect(aRejouer([e('a', '2026-03-10T01:59:59.999Z', 'd1')], '2026-03-10T02:00:00.500Z')).toEqual([]);
    expect(code(() => aRejouer([e('a', '2026-03-10T02:00:00.1234Z', 'd1')], DUMP))).toBe('horodatage_invalide');
  });

  it('remise-refusee-si-un-manque', () => {
    expect(remiseEnServicePermise(['a', 'b'], ['a'], [])).toEqual({ permise: false, manquants: ['b'], encoreVisibles: [] });
    expect(remiseEnServicePermise(['a', 'b'], ['b', 'a'], [])).toEqual({ permise: true, manquants: [], encoreVisibles: [] });
    expect(remiseEnServicePermise([], [], []).permise).toBe(true);
  });

  it('remise-refusee-si-encore-visible', () => {
    expect(remiseEnServicePermise(['a', 'b'], ['a', 'b'], ['b'])).toEqual({ permise: false, manquants: [], encoreVisibles: ['b'] });
  });

  it('entrees-invalides-refusees', () => {
    for (const mauvais of ['2026-03-11', '2026-02-30T00:00:00Z', '2026-03-11T25:00:00Z', 'x', '']) {
      expect(code(() => aRejouer([e('a', mauvais, 'd1')], DUMP))).toBe('horodatage_invalide');
      expect(code(() => aRejouer([], mauvais))).toBe('horodatage_invalide');
    }
    expect(code(() => aRejouer([e('a', DUMP, '')], DUMP))).toBe('objet_inconnu');
    expect(code(() => aRejouer([e('', DUMP, 'd1')], DUMP))).toBe('objet_inconnu');
    expect(code(() => aRejouer([e('a', DUMP, 'd1'), e('b', DUMP, 'd1')], DUMP))).toBe('doublon');
    expect(code(() => evenementRejeu(1.5, DUMP))).toBe('entier_invalide');
    expect(code(() => evenementRejeu(-1, DUMP))).toBe('entier_invalide');
    expect(code(() => evenementRejeu(Number.NaN, DUMP))).toBe('entier_invalide');
    expect(code(() => evenementRejeu(Infinity, DUMP))).toBe('entier_invalide');
    expect(code(() => evenementRejeu(1, 'x'))).toBe('horodatage_invalide');
    expect(evenementRejeu(3, DUMP)).toEqual({
      type: 'personne.effacements_rejoues', horodatage: DUMP, demandeId: null, donnees: { nombre: 3 },
    });
  });
});
