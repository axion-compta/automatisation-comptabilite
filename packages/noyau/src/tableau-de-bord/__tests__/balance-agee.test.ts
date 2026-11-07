import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { balanceAgee, plusGrosRetards, type Facture } from '../balance-agee.js';

const BORNES = [10, 20, 50];
const JOUR = '2026-06-30';
let compteur = 0;
const f = (echeance: string, reste: number, sens: Facture['sens'] = 'a_recevoir', id = `F${(compteur += 1)}`): Facture => ({
  id,
  tiersCode: 'T1',
  sens,
  resteCentimes: centimes(reste),
  echeance,
});
const totaux = (r: ReturnType<typeof balanceAgee>, sens: Facture['sens']) => r[sens].tranches.map((t) => t.totalCentimes);
const nombres = (r: ReturnType<typeof balanceAgee>, sens: Facture['sens']) => r[sens].tranches.map((t) => t.nombre);

describe('balance âgée', () => {
  it('non-echu-dans-la-premiere-tranche', () => {
    const r = balanceAgee([f('2026-06-30', 100), f('2026-07-15', 200)], JOUR, BORNES);
    expect(totaux(r, 'a_recevoir')).toEqual([300, 0, 0, 0, 0]);
  });

  it('limite-exacte-dans-la-tranche-basse', () => {
    const r = balanceAgee([f('2026-06-20', 1), f('2026-06-19', 10), f('2026-06-10', 100), f('2026-06-09', 1000), f('2026-05-10', 7)], JOUR, BORNES);
    expect(nombres(r, 'a_recevoir')).toEqual([0, 1, 2, 1, 1]);
    expect(totaux(r, 'a_recevoir')).toEqual([0, 1, 110, 1000, 7]);
  });

  it('au-dela-de-la-derniere-borne', () => {
    const r = balanceAgee([f('2026-05-10', 5), f('2025-01-01', 6)], JOUR, BORNES);
    expect(totaux(r, 'a_recevoir')).toEqual([0, 0, 0, 0, 11]);
  });

  it('reste-nul-ignore', () => {
    const r = balanceAgee([f('2026-01-01', 0), f('2026-07-01', 0)], JOUR, BORNES);
    expect(nombres(r, 'a_recevoir')).toEqual([0, 0, 0, 0, 0]);
    expect(() => balanceAgee([f('2026-01-01', -5)], JOUR, BORNES)).toThrow();
  });

  it('bornes-invalides', () => {
    for (const b of [[], [0], [20, 10], [10, 10], [1.5], [Number.NaN], [-3], [Number.POSITIVE_INFINITY]]) {
      expect(() => balanceAgee([], JOUR, b)).toThrow('bornes_invalides');
    }
  });

  it('somme-des-tranches-egale-au-total', () => {
    const liste: Facture[] = [];
    for (let i = 0; i < 500; i += 1) {
      const jours = (i * 7) % 120;
      const echeance = `2026-0${1 + (i % 6)}-${String(1 + ((i * 3) % 28)).padStart(2, '0')}`;
      liste.push(f(echeance, (i * 37) % 9973, i % 3 === 0 ? 'a_payer' : 'a_recevoir', `G${i}-${jours}`));
    }
    const r = balanceAgee(liste, JOUR, BORNES);
    for (const sens of ['a_recevoir', 'a_payer'] as const) {
      const attendu = liste.filter((x) => x.sens === sens).reduce((t, x) => t + x.resteCentimes, 0);
      expect(totaux(r, sens).reduce((t, x) => t + x, 0)).toBe(attendu);
      expect(r[sens].totalCentimes).toBe(attendu);
    }
  });

  it('plus-gros-retards-tri-et-egalites', () => {
    const liste = [
      f('2026-06-01', 500, 'a_recevoir', 'b'),
      f('2026-05-01', 500, 'a_payer', 'c'),
      f('2026-05-01', 500, 'a_recevoir', 'a'),
      f('2026-06-02', 900, 'a_recevoir', 'z'),
      f('2026-07-30', 9999, 'a_recevoir', 'futur'),
      f('2026-06-30', 9999, 'a_recevoir', 'aujourdhui'),
      f('2026-05-01', 0, 'a_recevoir', 'nul'),
    ];
    expect(plusGrosRetards(liste, JOUR, 10).map((x) => x.id)).toEqual(['z', 'a', 'c', 'b']);
    expect(plusGrosRetards(liste, JOUR, 2).map((x) => x.id)).toEqual(['z', 'a']);
  });

  it('n-zero-liste-vide', () => {
    expect(plusGrosRetards([f('2026-01-01', 5)], JOUR, 0)).toEqual([]);
    for (const n of [-1, 1.5, Number.NaN]) expect(() => plusGrosRetards([], JOUR, n)).toThrow();
  });

  it('sens-separes', () => {
    const r = balanceAgee([f('2026-06-25', 100, 'a_recevoir'), f('2026-06-25', 40, 'a_payer')], JOUR, BORNES);
    expect(totaux(r, 'a_recevoir')).toEqual([0, 100, 0, 0, 0]);
    expect(totaux(r, 'a_payer')).toEqual([0, 40, 0, 0, 0]);
    expect(r.a_recevoir.totalCentimes).toBe(100);
    expect(r.a_payer.totalCentimes).toBe(40);
  });
});
