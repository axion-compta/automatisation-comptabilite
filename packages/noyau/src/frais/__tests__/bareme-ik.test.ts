import { describe, expect, it } from 'vitest';
import { ligneDePuissance, lireBaremeIk, lireMajoration, lireMontantCentimes, lireTauxMilliemes } from '../bareme-ik.js';
import { ErreurFrais } from '../types.js';

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurFrais) return e.code;
    throw e;
  }
  return 'aucune';
}

const tr = (jusqua: number | null, taux: string, fixe: string) => ({ jusqua_km: jusqua, taux, fixe });
const inventeEnLigne = (puissances: unknown) => JSON.stringify({ puissances });
const p4 = { cv: 4, tranches: [tr(4000, '0,500', '0'), tr(16000, '0,300', '800'), tr(null, '0,360', '0')] };
const p6 = { cv: 6, tranches: [tr(4000, '0.617', '0'), tr(16000, '0,370', '988'), tr(null, '0,430', '0')] };
const invente = inventeEnLigne([p4, p6]);

describe('barème IK (valeurs inventées)', () => {
  it('taux-virgule-ou-point', () => {
    expect(lireTauxMilliemes('0,636')).toBe(636);
    expect(lireTauxMilliemes('0.636')).toBe(636);
    expect(lireTauxMilliemes('0,5')).toBe(500);
    expect(lireTauxMilliemes('2')).toBe(2000);
    expect(lireTauxMilliemes('0')).toBe(0);
    expect(lireTauxMilliemes('0,05')).toBe(50);
  });

  it('taux-quatre-decimales-refuse', () => {
    expect(code(() => lireTauxMilliemes('0,6361'))).toBe('entree_invalide');
    expect(code(() => lireTauxMilliemes('0.5000'))).toBe('entree_invalide');
  });

  it('taux-mal-formes-refuses', () => {
    for (const t of ['', '-0,1', '1e3', 'NaN', 'Infinity', ' 0,5', '0,5 ', '0,', ',5', '0,5,1', 'abc']) {
      expect(code(() => lireTauxMilliemes(t))).toBe('entree_invalide');
    }
    expect(code(() => lireTauxMilliemes(5 as unknown as string))).toBe('entree_invalide');
  });

  it('montant-fixe-avec-espaces', () => {
    expect(lireMontantCentimes('1395')).toBe(139500);
    expect(lireMontantCentimes('1 395,00')).toBe(139500);
    expect(lireMontantCentimes('1 395,5')).toBe(139550);
    expect(lireMontantCentimes('12.34')).toBe(1234);
    expect(lireMontantCentimes('0')).toBe(0);
    for (const t of ['1,234', '', '-5', '1 39', ' 12', '1e2', 'NaN']) {
      expect(code(() => lireMontantCentimes(t))).toBe('entree_invalide');
    }
  });

  it('bareme-invente-lu', () => {
    const b = lireBaremeIk(invente);
    expect(b.puissances.map((p) => p.cleCv)).toEqual([4, 6]);
    expect(b.puissances[0]?.tranches).toEqual([
      { jusquaKmDixiemes: 40000, tauxMilliemes: 500, fixeCentimes: 0 },
      { jusquaKmDixiemes: 160000, tauxMilliemes: 300, fixeCentimes: 80000 },
      { jusquaKmDixiemes: null, tauxMilliemes: 360, fixeCentimes: 0 },
    ]);
    expect(b.puissances[1]?.tranches[1]).toEqual({ jusquaKmDixiemes: 160000, tauxMilliemes: 370, fixeCentimes: 98800 });
    expect(lireBaremeIk(JSON.stringify([p4])).puissances).toHaveLength(1);
    const desordre = lireBaremeIk(inventeEnLigne([p6, { cv: 4, tranches: [p4.tranches[2], p4.tranches[1], p4.tranches[0]] }]));
    expect(desordre.puissances.map((p) => p.cleCv)).toEqual([4, 6]);
    expect(desordre.puissances[0]?.tranches.map((t) => t.tauxMilliemes)).toEqual([500, 300, 360]);
  });

  it('bornes-non-croissantes-refusees', () => {
    const avec = (tranches: unknown[]) => () => lireBaremeIk(inventeEnLigne([{ cv: 4, tranches }]));
    expect(code(avec([tr(4000, '0,5', '0'), tr(4000, '0,3', '0'), tr(null, '0,4', '0')]))).toBe('entree_invalide');
    expect(code(avec([tr(4000, '0,5', '0'), tr(16000, '0,3', '0')]))).toBe('entree_invalide');
    expect(code(avec([tr(4000, '0,5', '0'), tr(null, '0,3', '0'), tr(null, '0,4', '0')]))).toBe('entree_invalide');
    expect(code(avec([tr(0, '0,5', '0'), tr(null, '0,3', '0')]))).toBe('entree_invalide');
    expect(code(avec([tr(1.5, '0,5', '0'), tr(null, '0,3', '0')]))).toBe('entree_invalide');
    expect(code(avec([]))).toBe('entree_invalide');
    expect(code(avec([tr(null, '0,6361', '0')]))).toBe('entree_invalide');
    expect(code(avec([tr(null, '0,6', '1,234')]))).toBe('entree_invalide');
    expect(code(avec([null]))).toBe('entree_invalide');
  });

  it('json-invalide-refuse', () => {
    for (const v of ['', '{', 'null', '[]', '{}', '{"puissances":[]}', '{"puissances":{}}', '42']) {
      expect(code(() => lireBaremeIk(v))).toBe('entree_invalide');
    }
    expect(code(() => lireBaremeIk(inventeEnLigne([p4, p4])))).toBe('entree_invalide');
    expect(code(() => lireBaremeIk(inventeEnLigne([{ cv: 0, tranches: p4.tranches }])))).toBe('entree_invalide');
    expect(code(() => lireBaremeIk(inventeEnLigne([{ cv: 4 }])))).toBe('entree_invalide');
    expect(code(() => lireBaremeIk(inventeEnLigne([null])))).toBe('entree_invalide');
  });

  it('puissance-au-dela-de-la-plus-grande', () => {
    const b = lireBaremeIk(invente);
    expect(ligneDePuissance(b, 7).cleCv).toBe(6);
    expect(ligneDePuissance(b, 50).cleCv).toBe(6);
  });

  it('puissance-sous-la-plus-petite', () => {
    const b = lireBaremeIk(invente);
    expect(ligneDePuissance(b, 1).cleCv).toBe(4);
    expect(ligneDePuissance(b, 4).cleCv).toBe(4);
  });

  it('puissance-intermediaire-arrondie-au-dessus', () => {
    const b = lireBaremeIk(invente);
    expect(ligneDePuissance(b, 5).cleCv).toBe(6);
    expect(ligneDePuissance(b, 6).cleCv).toBe(6);
    for (const v of [0, -3, 4.5, Number.NaN, Infinity]) {
      expect(code(() => ligneDePuissance(b, v))).toBe('entree_invalide');
    }
    expect(code(() => ligneDePuissance({ puissances: [] }, 5))).toBe('entree_invalide');
  });

  it('majoration-entiere-seulement', () => {
    expect(lireMajoration('10')).toBe(10);
    expect(lireMajoration('0')).toBe(0);
    for (const v of ['2,5', '2.5', '-5', '', ' 5', '1e1', 'NaN']) {
      expect(code(() => lireMajoration(v))).toBe('entree_invalide');
    }
  });
});
