import { describe, expect, it } from 'vitest';
import { lireBaremeIk, ligneDePuissance } from '../bareme-ik.js';
import { montantProvisoire } from '../ik-provisoire.js';
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
const p4 = { cv: 4, tranches: [tr(4000, '0,500', '0'), tr(16000, '0,300', '800'), tr(null, '0,360', '0')] };
const p6 = { cv: 6, tranches: [tr(4000, '0,617', '0'), tr(16000, '0,370', '988'), tr(null, '0,430', '0')] };
const bareme = lireBaremeIk(JSON.stringify({ puissances: [p4, p6] }));
const L4 = ligneDePuissance(bareme, 4);
const L6 = ligneDePuissance(bareme, 6);
const MAJORATION = 10;
const dix = (km: number) => km * 10;

function calcul(km: number, cumul: number, ligne = L4, electrique = false) {
  return montantProvisoire({ kmRetenusDixiemes: km, cumulAvantDixiemes: cumul, ligne, majorationPourcent: MAJORATION, electrique });
}

describe('montantProvisoire (barème inventé)', () => {
  it('premier-trajet-tranche-1', () => {
    const r = calcul(dix(120), 0);
    expect(r.montant).toBe(6000);
    expect(r.parts).toEqual([{ kmDixiemes: 1200, tauxMilliemes: 500 }]);
  });

  it('electrique-majore', () => {
    expect(calcul(dix(100), 0, L4, true).montant).toBe(5500);
    expect(calcul(dix(100), 0, L4, false).montant).toBe(5000);
  });

  it('arrondi-demi-vers-le-haut', () => {
    expect(calcul(dix(15), 0, L6).montant).toBe(926);
  });

  it('aller-retour-arrondi', () => {
    expect(calcul(dix(74), 0, L6).montant).toBe(4566);
  });

  it('trajet-a-cheval-sur-une-borne', () => {
    const r = calcul(dix(100), dix(3950));
    expect(r.montant).toBe(4000);
    expect(r.parts).toEqual([
      { kmDixiemes: 500, tauxMilliemes: 500 },
      { kmDixiemes: 500, tauxMilliemes: 300 },
    ]);
  });

  it('trajet-sur-deux-bornes', () => {
    const r = calcul(dix(12200), dix(3900));
    expect(r.parts).toEqual([
      { kmDixiemes: 1000, tauxMilliemes: 500 },
      { kmDixiemes: 120000, tauxMilliemes: 300 },
      { kmDixiemes: 1000, tauxMilliemes: 360 },
    ]);
    expect(r.montant).toBe(5000 + 360000 + 3600);
  });

  it('fin-exacte-sur-la-borne-une-part', () => {
    const r = calcul(dix(50), dix(3950));
    expect(r.parts).toEqual([{ kmDixiemes: 500, tauxMilliemes: 500 }]);
    expect(r.montant).toBe(2500);
    expect(calcul(dix(10), dix(4000)).parts).toEqual([{ kmDixiemes: 100, tauxMilliemes: 300 }]);
  });

  it('partie-fixe-jamais-appliquee', () => {
    expect(calcul(dix(10), dix(5000)).montant).toBe(300);
    expect(calcul(dix(10), dix(5000), L6).montant).toBe(370);
  });

  it('un-seul-arrondi', () => {
    // 0,3 km à la tranche 1 puis 0,1 km à la tranche 2 : 19 + 4 centimes par part, 22 en un seul arrondi.
    const r = calcul(4, dix(4000) - 3, L6);
    expect(r.parts).toHaveLength(2);
    expect(r.montant).toBe(22);
  });

  it('entrees-invalides', () => {
    const invalides = [0, -10, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER];
    for (const km of invalides) expect(code(() => calcul(km, 0))).toBe('entree_invalide');
    for (const cumul of [-1, 0.5, Number.NaN, Infinity]) expect(code(() => calcul(10, cumul))).toBe('entree_invalide');
    for (const m of [-1, 1.5, Number.NaN, Infinity]) {
      expect(code(() => montantProvisoire({ kmRetenusDixiemes: 10, cumulAvantDixiemes: 0, ligne: L4, majorationPourcent: m, electrique: true }))).toBe('entree_invalide');
    }
    expect(code(() => calcul(10, Number.MAX_SAFE_INTEGER))).toBe('entree_invalide');
  });
});
