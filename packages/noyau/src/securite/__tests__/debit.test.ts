import { describe, expect, it } from 'vitest';
import { verifierDebits, type DemandeDebit, type EtatDebit } from '../debit.js';

const dem = (cle: string, limite: number, fenetreMs = 1000): DemandeDebit => ({ cle, limite, fenetreMs });
const vide: EtatDebit = {};
const tirer = (etat: EtatDebit, d: DemandeDebit[], t: number) => verifierDebits(etat, d, t);
function remplir(n: number, d: DemandeDebit, t0 = 0) {
  let etat: EtatDebit = vide;
  for (let i = 0; i < n; i++) {
    const r = tirer(etat, [d], t0 + i);
    if (!r.accepte) throw new Error('refus inattendu');
    etat = r.etat;
  }
  return etat;
}

describe('securite/debit', () => {
  it('limite-plus-un-refusee', () => {
    const d = dem('A:personne', 5);
    const etat = remplir(5, d);
    const r = tirer(etat, [d], 5);
    expect(r.accepte).toBe(false);
    expect(r.etat).toBe(etat);
    expect(etat['A:personne']).toHaveLength(5);
  });

  it('fenetre-glissante-libere', () => {
    const d = dem('A', 2, 100);
    const etat = remplir(2, d, 10);
    expect(tirer(etat, [d], 109).accepte).toBe(false);
    const r = tirer(etat, [d], 110);
    expect(r.accepte).toBe(true);
    expect(r.etat['A']).toEqual([11, 110]);
    let e: EtatDebit = vide;
    for (let t = 0; t < 50; t++) {
      const x = tirer(e, [d], t * 100);
      if (!x.accepte) throw new Error('refus inattendu');
      e = x.etat;
    }
    expect(e['A']!.length).toBeLessThanOrEqual(2);
  });

  it('reessayer-apres-exact', () => {
    const d = dem('A', 2, 100);
    const etat = remplir(2, d, 10);
    expect(tirer(etat, [d], 50)).toMatchObject({ accepte: false, reessayerApresMs: 60 });
    expect(tirer(etat, [d], 109)).toMatchObject({ accepte: false, reessayerApresMs: 1 });
    const longue = dem('B', 1, 500);
    const e2 = remplir(1, longue, 0);
    const r = tirer(e2, [longue, d], 20);
    expect(r).toMatchObject({ accepte: false, reessayerApresMs: 480 });
    const etatCourte = remplir(2, d, 10);
    expect(tirer(etatCourte, [d, dem('B', 1, 10)], 20)).toMatchObject({ reessayerApresMs: 90 });
  });

  it('tout-ou-rien-sans-consommation', () => {
    const libre = dem('A:societe', 3);
    const pleine = dem('A:depots', 1);
    const etat = remplir(1, pleine);
    const r = tirer(etat, [libre, pleine], 5);
    expect(r.accepte).toBe(false);
    expect(r.etat).toBe(etat);
    expect(r.etat['A:societe']).toBeUndefined();
    const ok = tirer(etat, [libre, dem('A:depots', 2)], 5);
    expect(ok.accepte).toBe(true);
    expect(ok.etat['A:societe']).toEqual([5]);
    expect(ok.etat['A:depots']).toEqual([0, 5]);
  });

  it('cles-independantes', () => {
    const a = dem('A', 1);
    const etat = remplir(1, a);
    expect(tirer(etat, [a], 1).accepte).toBe(false);
    const r = tirer(etat, [dem('B', 1)], 1);
    expect(r.accepte).toBe(true);
    expect(r.etat).toEqual({ A: [0], B: [1] });
    const doublons = tirer(vide, [dem('C', 2), dem('C', 1)], 7);
    expect(doublons.etat).toEqual({ C: [7] });
  });

  it('horloge-qui-recule-sans-remise-a-zero', () => {
    const d = dem('A', 2, 100);
    const etat = remplir(2, d, 50);
    const r = tirer(etat, [d], 0);
    expect(r).toMatchObject({ accepte: false, reessayerApresMs: 99 });
    const apres = tirer({ A: [10, 80] }, [dem('A', 3, 100)], 20);
    expect(apres.accepte).toBe(true);
    expect(apres.etat['A']).toEqual([10, 80, 80]);
    expect(tirer({ A: [70] }, [d], 0).etat['A']).toEqual([70, 70]);
  });

  it('limite-zero-toujours-refus', () => {
    const r = tirer(vide, [dem('A', 0, 250)], 0);
    expect(r).toMatchObject({ accepte: false, reessayerApresMs: 250 });
    expect(tirer(vide, [dem('B', 3), dem('A', 0)], 9).accepte).toBe(false);
  });

  it('arguments-invalides-refuses', () => {
    const ko = (d: unknown[], t: unknown) => () => verifierDebits(vide, d as DemandeDebit[], t as number);
    const mauvais = [Number.NaN, Infinity, -Infinity, -1, 1.5, '3', null, undefined];
    for (const v of mauvais) {
      expect(ko([dem('A', 1)], v)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
      expect(ko([{ cle: 'A', limite: v, fenetreMs: 10 }], 0)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
      expect(ko([{ cle: 'A', limite: 1, fenetreMs: v }], 0)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
    }
    expect(ko([dem('A', 1, 0)], 0)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
    expect(ko([dem('', 1)], 0)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
    expect(ko([{ cle: 4, limite: 1, fenetreMs: 10 }], 0)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
    expect(ko([], Number.NaN)).toThrow(expect.objectContaining({ code: 'argument_invalide' }));
    expect(verifierDebits(vide, [], 0)).toEqual({ accepte: true, etat: vide });
    const etat = { A: [1] };
    expect(verifierDebits(etat, [], 3).etat).toBe(etat);
  });

  it('etat-d-entree-non-modifie', () => {
    const interne = Object.freeze([1, 2]);
    const etat = Object.freeze({ A: interne, B: Object.freeze([3]) });
    const copie = JSON.stringify(etat);
    const ok = tirer(etat, [dem('A', 3), dem('C', 1)], 4);
    expect(ok.accepte).toBe(true);
    expect(JSON.stringify(etat)).toBe(copie);
    expect(ok.etat).not.toBe(etat);
    expect(ok.etat['B']).toBe(etat['B']);
    tirer(etat, [dem('A', 2)], 5);
    expect(JSON.stringify(etat)).toBe(copie);
  });
});
