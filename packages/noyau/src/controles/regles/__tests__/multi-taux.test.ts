import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import type { CodeTraitement } from '../../../tva/traitement.js';
import type { LignePiece, PieceControlee } from '../commun.js';
import { regleCCT06, regleCCT16, type HistoriqueCode } from '../multi-taux.js';

const c = (n: number): Centimes => centimes(n);
const ligne = (taux: number, nature: string, ht: number, tva: number, compte?: string): LignePiece => ({
  taux, nature, ht: c(ht), tva: c(tva), ttc: c(ht + tva), ...(compte === undefined ? {} : { compte }),
});
const piece = (lignes: LignePiece[], pied: [number, number, number]): PieceControlee => ({
  id: 'p1', sens: 'achat', date: '2026-01-10', lignes, mentions: [],
  totaux: { ht: c(pied[0]), tva: c(pied[1]), ttc: c(pied[2]) },
});
const COMPTES = ['275000'];
const NATURES = ['depot'];
const t06 = (p: PieceControlee, comptes: readonly string[] = COMPTES, natures: readonly string[] = NATURES) =>
  regleCCT06.evaluer({ piece: p, comptesDepot: comptes, naturesCaution: natures });
const loyer = ligne(2000, 'loyer', 100000, 20000, '613200');
const depot = ligne(0, 'depot', 200000, 0, '275000');
const OK = { resultat: 'OK' };
const alerte = (valeur: string, ecart?: number) => ({ resultat: 'ALERTE', valeur, ...(ecart === undefined ? {} : { ecartCentimes: ecart }) });
const codeDe = (f: () => unknown): unknown => {
  try { f(); } catch (e) { return (e as { code?: unknown }).code; }
  return undefined;
};

const EX = { debut: '2026-01-01', fin: '2026-12-31' };
const h = (date: string, code: CodeTraitement, fournisseurId = 'f1', nature = 'loyer'): HistoriqueCode => ({ fournisseurId, nature, code, date });
const t16 = (code: CodeTraitement, historique: readonly HistoriqueCode[], exercice = EX, fournisseurId = 'f1') =>
  regleCCT16.evaluer({ ligne: { fournisseurId, nature: 'loyer', code }, historique, exercice });

describe('CC-T06 et CC-T16', () => {
  it('metadonnees', () => {
    expect(regleCCT06).toMatchObject({
      id: 'CC-T06',
      version: 1,
      gravite: 'M',
      bloque: [],
      actif: true,
    });
    expect(regleCCT06.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    expect(regleCCT16).toMatchObject({
      id: 'CC-T16',
      version: 1,
      gravite: 'm',
      bloque: [],
      actif: true,
    });
  });

  it('CT-23', () => {
    expect(t06(piece([loyer, depot], [300000, 20000, 320000]))).toEqual(OK);
    const fev = [h('2026-01-05', 'DEDUCTIBLE')];
    expect(t16('NON_DEDUCTIBLE_NATURE', fev)).toEqual(alerte('code_different'));
    expect(t16('DEDUCTIBLE', fev)).toEqual(OK);
  });

  it('doublon-de-couple', () => {
    const l2 = ligne(2000, 'loyer', 50000, 10000, '613200');
    const p = piece([loyer, l2], [150000, 30000, 180000]);
    expect(t06(p)).toEqual(alerte('doublon_couple'));
    expect(t06({ ...p, lignes: [l2, loyer] })).toEqual(alerte('doublon_couple'));
    const autreTaux = ligne(1000, 'loyer', 50000, 5000, '613200');
    expect(t06(piece([loyer, autreTaux], [150000, 25000, 175000]))).toEqual(OK);
    const autreNature = ligne(2000, 'charges', 50000, 10000, '613200');
    expect(t06(piece([loyer, autreNature], [150000, 30000, 180000]))).toEqual(OK);
  });

  it('somme-differente', () => {
    const l = [loyer, depot];
    expect(t06(piece(l, [300001, 20000, 320000]))).toEqual(alerte('somme', 1));
    expect(t06(piece(l, [299999, 20000, 320000]))).toEqual(alerte('somme', 1));
    expect(t06(piece(l, [300000, 20001, 320000]))).toEqual(alerte('somme', 1));
    expect(t06(piece(l, [300000, 20000, 319998]))).toEqual(alerte('somme', 2));
    expect(t06(piece([...l].reverse(), [300000, 20000, 320000]))).toEqual(OK);
    expect(t06(piece([], [0, 0, 0]))).toEqual(OK);
    expect(t06(piece([], [0, 0, 1]))).toEqual(alerte('somme', 1));
  });

  it('caution-en-charge', () => {
    const enCharge = ligne(0, 'depot', 200000, 0, '613200');
    expect(t06(piece([loyer, enCharge], [300000, 20000, 320000]))).toEqual(alerte('caution_en_charge'));
    const sansCompte = ligne(0, 'depot', 200000, 0);
    expect(t06(piece([loyer, sansCompte], [300000, 20000, 320000]))).toEqual(alerte('caution_en_charge'));
    expect(t06(piece([loyer, enCharge], [300000, 20000, 320000]), ['613200'])).toEqual(OK);
    expect(t06(piece([loyer, enCharge], [300000, 20000, 320000]), COMPTES, [])).toEqual(OK);
    expect(t06(piece([loyer, depot], [300000, 20000, 320000]), [], NATURES)).toEqual(alerte('caution_en_charge'));
  });

  it('historique-hors-exercice-ignore', () => {
    const hors = [h('2025-12-31', 'SANS_TVA'), h('2027-01-01', 'SANS_TVA')];
    expect(t16('DEDUCTIBLE', hors)).toEqual(OK);
    expect(t16('DEDUCTIBLE', [h('2026-01-01', 'SANS_TVA')])).toEqual(alerte('code_different'));
    expect(t16('DEDUCTIBLE', [h('2026-12-31', 'SANS_TVA')])).toEqual(alerte('code_different'));
    expect(t16('DEDUCTIBLE', [h('2026-03-01', 'DEDUCTIBLE'), h('2027-01-01', 'SANS_TVA')])).toEqual(OK);
    expect(t16('DEDUCTIBLE', [h('2025-12-31', 'SANS_TVA'), h('2026-03-01', 'DEDUCTIBLE')])).toEqual(OK);
  });

  it('premier-achat-ok', () => {
    expect(t16('DEDUCTIBLE', [])).toEqual(OK);
    expect(t16('DEDUCTIBLE', [h('2026-02-01', 'SANS_TVA', 'f2')])).toEqual(OK);
    expect(t16('DEDUCTIBLE', [h('2026-02-01', 'SANS_TVA', 'f1', 'charges')])).toEqual(OK);
  });

  it('ordre-historique-sans-effet', () => {
    const a = h('2026-02-01', 'SANS_TVA');
    const b = h('2026-05-01', 'DEDUCTIBLE');
    const d = h('2026-03-01', 'MARGE');
    expect(t16('DEDUCTIBLE', [a, b, d])).toEqual(OK);
    expect(t16('DEDUCTIBLE', [d, b, a])).toEqual(OK);
    expect(t16('DEDUCTIBLE', [b, a, d])).toEqual(OK);
    expect(t16('SANS_TVA', [a, b, d])).toEqual(alerte('code_different'));
    expect(t16('SANS_TVA', [b, d, a])).toEqual(alerte('code_different'));
    const m1 = h('2026-06-01', 'MARGE');
    const m2 = h('2026-06-01', 'SANS_TVA');
    expect(t16('MARGE', [m1, m2])).toEqual(alerte('code_different'));
    expect(t16('MARGE', [m2, m1])).toEqual(alerte('code_different'));
  });

  it('montants-invalides', () => {
    const l = (ht: number) => ({ ...loyer, ht: ht as Centimes });
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(codeDe(() => t06(piece([l(mauvais)], [0, 0, 0])))).toBe('entree_invalide');
      expect(
        codeDe(() =>
          t06({
            ...piece([loyer], [0, 0, 0]),
            totaux: { ht: mauvais as Centimes, tva: c(0), ttc: c(0) },
          }),
        ),
      ).toBe('entree_invalide');
      expect(codeDe(() => t06(piece([{ ...loyer, tva: mauvais as Centimes }], [0, 0, 0])))).toBe('entree_invalide');
      expect(codeDe(() => t06(piece([{ ...loyer, ttc: mauvais as Centimes }], [0, 0, 0])))).toBe('entree_invalide');
    }
    expect(codeDe(() => t16('DEDUCTIBLE', [], { debut: '2026-12-31', fin: '2026-01-01' }))).toBe('entree_invalide');
    expect(codeDe(() => t16('DEDUCTIBLE', [], { debut: '2026-1-1', fin: '2026-12-31' }))).toBe('entree_invalide');
    expect(codeDe(() => t16('DEDUCTIBLE', [h('26-02-01', 'SANS_TVA')]))).toBe('entree_invalide');
    expect(
      t06(piece([{ ...loyer, ht: c(-100000), tva: c(-20000), ttc: c(-120000) }], [-100000, -20000, -120000])),
    ).toEqual(OK);
  });
});
