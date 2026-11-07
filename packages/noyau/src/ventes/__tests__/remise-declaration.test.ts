import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { controleAnnuel, ventesDeLaPeriode } from '../remise-declaration.js';
import type { LigneTvaVente } from '../types.js';

const T6 = 600;
const T9 = 900;
const T19 = 1900;
const COLL = 'C-COLLECTEE';
const ATTENTE = 'C-ATTENTE';
type L = LigneTvaVente & { statutEcriture: 'brouillon' | 'propose' | 'valide' };
const ligne = (pieceId: string, date: string | null, base: number, tva: number, o: Partial<L> = {}): L => ({
  compte: COLL, tauxPdb: T6, baseCentimes: centimes(base), tvaCentimes: centimes(tva), codeTva: 'COLLECTEE', cas: 'A',
  sens: 'vente', dateExigibilite: date, pieceId, statutEcriture: 'valide', ...o,
});
const rem = (lignesTva: L[], debut = '2031-10-01', fin = '2031-10-31') => ventesDeLaPeriode({ lignesTva, debut, fin, compteCollectee: COLL });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('remise à la déclaration de TVA', () => {
  it('v01-v16-octobre-ventes-et-avoirs-separes', () => {
    const lignes = [
      ligne('V16', '2031-10-20', 2000, 120, { tauxPdb: T19 }), ligne('V01', '2031-10-05', 1000, 60), ligne('V01b', '2031-10-06', 500, 30),
      ligne('A1', '2031-10-10', 300, 18, { sens: 'avoir' }),
    ];
    const r = rem(lignes);
    expect(r.ventes).toEqual([{ tauxPdb: T6, base: 1500, tva: 90, pieces: ['V01', 'V01b'] }, { tauxPdb: T19, base: 2000, tva: 120, pieces: ['V16'] }]);
    expect(r.avoirs).toEqual([{ tauxPdb: T6, base: 300, tva: 18, pieces: ['A1'] }]);
    expect(r.aVerifier).toEqual([]);
    expect(r.ignorees).toBe(0);
    expect(rem([...lignes].reverse())).toEqual(r);
  });
  it('v28-exigibilite-d-octobre', () => {
    const l = ligne('V28', '2031-10-31', 1000, 60);
    expect(rem([l]).ventes).toHaveLength(1);
    expect(rem([ligne('V28', '2031-10-01', 1000, 60)]).ventes).toHaveLength(1);
    const hors = rem([ligne('V28', '2031-11-01', 1000, 60), ligne('V28', '2031-09-30', 1000, 60), ligne('V28', null, 1000, 60)]);
    expect(hors).toEqual({ ventes: [], avoirs: [], aVerifier: [], ignorees: 3 });
  });
  it('v04-cas-b-novembre-et-decembre', () => {
    const l = [ligne('V04', '2031-11-15', 600, 36, { cas: 'B', sens: 'acompte' }), ligne('V04', '2031-12-15', 400, 24, { cas: 'B' })];
    expect(rem(l, '2031-11-01', '2031-11-30').ventes).toEqual([{ tauxPdb: T6, base: 600, tva: 36, pieces: ['V04'] }]);
    expect(rem(l, '2031-12-01', '2031-12-31').ventes).toEqual([{ tauxPdb: T6, base: 400, tva: 24, pieces: ['V04'] }]);
  });
  it('compte-d-attente-ignore', () => {
    const r = rem([ligne('V1', '2031-10-05', 1000, 60, { compte: ATTENTE }), ligne('V2', '2031-10-05', 100, 6)]);
    expect(r.ventes).toEqual([{ tauxPdb: T6, base: 100, tva: 6, pieces: ['V2'] }]);
    expect(r.ignorees).toBe(1);
  });
  it('brouillon-ignore', () => {
    const r = rem([ligne('V1', '2031-10-05', 1000, 60, { statutEcriture: 'brouillon' }), ligne('V2', '2031-10-05', 1000, 60, { statutEcriture: 'propose' })]);
    expect(r).toEqual({ ventes: [], avoirs: [], aVerifier: [], ignorees: 2 });
  });
  it('pieces-renvoyees-par-case', () => {
    const r = rem([ligne('Z', '2031-10-05', 1, 0, { tauxPdb: T9 }), ligne('B', '2031-10-05', 1, 0), ligne('A', '2031-10-06', 1, 0), ligne('B', '2031-10-07', 1, 0)]);
    expect(r.ventes.map((v) => v.pieces)).toEqual([['A', 'B'], ['Z']]);
    expect(r.ventes[0]?.base).toBe(3);
  });
  it('taux-net-negatif-a-verifier', () => {
    const r = rem([ligne('V1', '2031-10-05', 1000, 60), ligne('V1', '2031-10-08', -1500, -90), ligne('V2', '2031-10-09', 500, 30, { tauxPdb: T9 }), ligne('V3', '2031-10-09', 100, 6, { tauxPdb: T19 }), ligne('V3', '2031-10-10', -100, -7, { tauxPdb: T19 })]);
    expect(r.ventes).toEqual([{ tauxPdb: T9, base: 500, tva: 30, pieces: ['V2'] }]);
    expect(r.aVerifier).toEqual([{ tauxPdb: T6, base: -500, tva: -30, pieces: ['V1'] }, { tauxPdb: T19, base: 0, tva: -1, pieces: ['V3'] }]);
    const net = rem([ligne('V1', '2031-10-05', 1000, 60), ligne('V1', '2031-10-08', -400, -24)]);
    expect(net.ventes).toEqual([{ tauxPdb: T6, base: 600, tva: 36, pieces: ['V1'] }]);
    expect(rem([ligne('V1', '2031-10-05', 1000, 60), ligne('V1', '2031-10-08', -1000, -60)]).ventes).toEqual([{ tauxPdb: T6, base: 0, tva: 0, pieces: ['V1'] }]);
    expect(rem([ligne('A', '2031-10-05', 100, 6, { sens: 'avoir' }), ligne('A', '2031-10-06', -300, -18, { sens: 'avoir' })]).avoirs).toEqual([]);
    expect(rem([ligne('N', '2031-10-05', 100, 6, { tauxPdb: null })]).aVerifier).toEqual([{ tauxPdb: null, base: 100, tva: 6, pieces: ['N'] }]);
  });
  it('jamais-de-base-negative', () => {
    let s = 7;
    const alea = (n: number): number => {
      s = (s * 1103 + 12345) % 65536;
      return s % n;
    };
    for (let essai = 0; essai < 50; essai++) {
      const ls: L[] = [];
      for (let i = 0; i < 12; i++) {
        const signe = alea(3) === 0 ? -1 : 1;
        ls.push(ligne(`P${alea(4)}`, '2031-10-15', signe * alea(900), signe * alea(90), { tauxPdb: [T6, T9, T19][alea(3)] ?? T6, sens: alea(4) === 0 ? 'acompte' : 'vente' }));
      }
      const r = rem(ls);
      for (const v of [...r.ventes, ...r.avoirs]) {
        expect(v.base).toBeGreaterThanOrEqual(0);
        expect(v.tva).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('controle-annuel-seuil', () => {
    const c = (ca: number, tot: number, seuil?: number) => controleAnnuel({ caDeclare: centimes(ca), totalProduits: centimes(tot), seuil: seuil === undefined ? undefined : centimes(seuil) });
    expect(c(10100, 10000, 100)).toEqual({ ecart: 100, bloquant: false, parametreAbsent: false });
    expect(c(10101, 10000, 100)).toEqual({ ecart: 101, bloquant: true, parametreAbsent: false });
    expect(c(9899, 10000, 100)).toEqual({ ecart: -101, bloquant: true, parametreAbsent: false });
    expect(c(9900, 10000, 100).bloquant).toBe(false);
    expect(c(10000, 10000, 0)).toEqual({ ecart: 0, bloquant: false, parametreAbsent: false });
    expect(c(10000, 10000)).toEqual({ ecart: 0, bloquant: true, parametreAbsent: true });
    expect(code(() => c(1, 1, -1))).toBe('seuil_invalide');
    expect(code(() => controleAnnuel({ caDeclare: Number.NaN as never, totalProduits: centimes(1), seuil: centimes(1) }))).toBe('montant_invalide');
    expect(code(() => controleAnnuel({ caDeclare: centimes(1), totalProduits: Infinity as never, seuil: centimes(1) }))).toBe('montant_invalide');
    expect(code(() => controleAnnuel({ caDeclare: centimes(1), totalProduits: centimes(1), seuil: 1.5 as never }))).toBe('seuil_invalide');
  });
  it('periode-inversee-refusee', () => {
    expect(code(() => rem([], '2031-10-31', '2031-10-01'))).toBe('periode_inversee');
    expect(rem([], '2031-10-05', '2031-10-05')).toEqual({ ventes: [], avoirs: [], aVerifier: [], ignorees: 0 });
    expect(code(() => rem([], 'x', '2031-10-01'))).toBe('date_invalide');
    expect(code(() => rem([ligne('V', '2031-13-40', 1, 0)]))).toBe('date_invalide');
    expect(code(() => rem([ligne('V', '2031-10-05', 1, 0, { baseCentimes: Number.NaN as never })]))).toBe('montant_invalide');
    for (const t of [1.5, -600, Number.NaN, Infinity]) expect(code(() => rem([ligne('V', '2031-10-05', 1, 0, { tauxPdb: t })]))).toBe('taux_invalide');
    expect(code(() => rem([ligne('V', '2031-10-05', 1, 0, { tvaCentimes: Infinity as never })]))).toBe('montant_invalide');
  });
});
