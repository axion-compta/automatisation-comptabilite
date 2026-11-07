import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ligneDePuissance, lireBaremeIk } from '../bareme-ik.js';
import { montantAnnuel, regularisation } from '../ik-annuel.js';
import { ErreurFrais } from '../types.js';

const tr = (jusqua: number | null, taux: string, fixe: string) => ({ jusqua_km: jusqua, taux, fixe });
const bareme = lireBaremeIk(
  JSON.stringify({
    puissances: [
      { cv: 4, tranches: [tr(4000, '0,500', '0'), tr(16000, '0,300', '800'), tr(null, '0,360', '0')] },
      { cv: 6, tranches: [tr(4000, '0,617', '0'), tr(16000, '0,370', '988'), tr(null, '0,430', '0')] },
    ],
  }),
);
const p4 = ligneDePuissance(bareme, 4);
const p6 = ligneDePuissance(bareme, 6);
const annuel = (km: number, ligne = p4, maj = 0, electrique = false) =>
  montantAnnuel({ cumulDixiemes: km * 10, ligne, majorationPourcent: maj, electrique });
const c = (n: number) => centimes(n);

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurFrais) return e.code;
    throw e;
  }
  return 'aucune';
}

describe('IK annuelles (barème inventé)', () => {
  it('nf10-continu-a-la-premiere-borne', () => {
    const a = annuel(4050);
    expect(a).toBe(201500);
    expect(regularisation(a, [c(197500), c(4000)])).toBe(0);
  });

  it('nf11-saut-a-la-seconde-borne', () => {
    const a = annuel(17000);
    expect(a).toBe(612000);
    expect(regularisation(a, [c(596000)])).toBe(16000);
  });

  it('borne-incluse', () => {
    expect(annuel(4000)).toBe(200000);
    expect(montantAnnuel({ cumulDixiemes: 40001, ligne: p4, majorationPourcent: 0, electrique: false })).toBe(200003);
    expect(annuel(16000)).toBe(560000);
    expect(montantAnnuel({ cumulDixiemes: 160001, ligne: p4, majorationPourcent: 0, electrique: false })).toBe(576004);
  });

  it('ecart-negatif', () => {
    const a = annuel(17000, p6);
    expect(a).toBe(731000);
    expect(regularisation(a, [c(740000), c(10000)])).toBe(-19000);
  });

  it('electrique-majore-sur-le-total', () => {
    expect(annuel(4050, p4, 20, true)).toBe(241800);
    expect(annuel(4050, p4, 20, false)).toBe(201500);
    expect(annuel(3, p4, 50, true)).toBe(225);
  });

  it('cumul-nul-zero', () => {
    expect(annuel(0)).toBe(0);
    expect(annuel(0, p4, 20, true)).toBe(0);
  });

  it('liste-de-provisoires-vide', () => {
    expect(regularisation(c(201500), [])).toBe(201500);
    expect(regularisation(c(0), [])).toBe(0);
  });

  it('entrees-invalides', () => {
    const base = { ligne: p4, majorationPourcent: 0, electrique: false };
    for (const cumulDixiemes of [-1, 1.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 2]) {
      expect(code(() => montantAnnuel({ ...base, cumulDixiemes }))).toBe('entree_invalide');
    }
    for (const majorationPourcent of [-1, Number.NaN, Infinity]) {
      expect(code(() => montantAnnuel({ ...base, cumulDixiemes: 10, majorationPourcent }))).toBe('entree_invalide');
    }
  });
});
