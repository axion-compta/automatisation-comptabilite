import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import type { LignePiece, PieceControlee } from '../commun.js';
import { regleCCK05, regleCCK06, type Qualification } from '../pied-de-facture.js';

const c = (n: number): Centimes => centimes(n);
const ligne = (ht: number, tva: number, ttc: number): LignePiece => ({
  taux: 2000,
  nature: 'bien',
  ht: c(ht),
  tva: c(tva),
  ttc: c(ttc),
});
const piece = (lignes: LignePiece[], pied: [number, number, number], du?: number): PieceControlee => ({
  id: 'p1',
  sens: 'achat',
  date: '2026-01-10',
  lignes,
  totaux: { ht: c(pied[0]), tva: c(pied[1]), ttc: c(pied[2]) },
  mentions: [],
  ...(du === undefined ? {} : { montantDu: c(du) }),
});
const k5 = (p: PieceControlee, tolerance: number | undefined = 1) =>
  regleCCK05.evaluer({ piece: p, ...(tolerance === undefined ? {} : { tolerance: c(tolerance) }) });
const qual = (montant: number, motif: Qualification['motif'] = 'acompte_verse'): Qualification => ({
  motif,
  montant: c(montant),
});
const k6 = (p: PieceControlee, q: Qualification[] = []) => regleCCK06.evaluer({ piece: p, qualifications: q });
const OK = { resultat: 'OK' };
const alerte5 = (ecart: number, valeur: string) => ({ resultat: 'ALERTE', ecartCentimes: ecart, valeur });
const arith = (ecart: number) => ({ resultat: 'ALERTE', ecartCentimes: ecart, valeur: 'ARITH' });
const codeDe = (f: () => unknown): unknown => {
  try {
    f();
  } catch (e) {
    return (e as { code?: unknown }).code;
  }
  return undefined;
};
const META = { version: 1, gravite: 'M', bloque: [], actif: true };
const DECL = ['arrivee', 'continu', 'nocturne', 'a_la_demande'];
const ttc1200 = piece([ligne(1000, 200, 1200)], [1000, 200, 1200], 800);

describe('CC-K05 et CC-K06', () => {
  it('metadonnees', () => {
    expect(regleCCK05).toMatchObject({ id: 'CC-K05', ...META });
    expect(regleCCK06).toMatchObject({ id: 'CC-K06', ...META });
    expect(regleCCK05.declencheurs).toEqual(DECL);
    expect(regleCCK06.declencheurs).toEqual(DECL);
  });

  it('CT-06', () => {
    expect(k5(piece([ligne(9800, 1960, 11760)], [10000, 1960, 11760]))).toEqual(alerte5(200, 'ht'));
  });

  it('CT-07', () => {
    expect(k6(ttc1200)).toEqual(arith(400));
    expect(k6(ttc1200, [qual(400)])).toEqual(OK);
    expect(k6(ttc1200, [qual(100, 'avoir'), qual(300, 'remise')])).toEqual(OK);
  });

  it('pied-egal-ok', () => {
    const l = [ligne(1000, 200, 1200), ligne(500, 100, 600)];
    expect(k5(piece(l, [1500, 300, 1800]))).toEqual(OK);
    expect(k5(piece([...l].reverse(), [1500, 300, 1800]))).toEqual(OK);
    expect(k5(piece(l, [1501, 301, 1801]))).toEqual(OK);
    expect(k5(piece(l, [1499, 299, 1799]))).toEqual(OK);
    expect(k5(piece(l, [1502, 300, 1800]))).toEqual(alerte5(2, 'ht'));
    expect(k5(piece(l, [1498, 300, 1800]))).toEqual(alerte5(2, 'ht'));
  });

  it('ecart-tva-seul-detecte', () => {
    const l = [ligne(1000, 200, 1200)];
    expect(k5(piece(l, [1000, 205, 1200]))).toEqual(alerte5(5, 'tva'));
    expect(k5(piece(l, [1000, 200, 1195]))).toEqual(alerte5(5, 'ttc'));
    expect(k5(piece(l, [1000, 203, 1204]))).toEqual(alerte5(4, 'tva'));
    expect(k5(piece(l, [1000, 200, 1200]), 0)).toEqual(OK);
    expect(codeDe(() => regleCCK05.evaluer({ piece: piece(l, [1000, 200, 1200]) }))).toBe('parametre_absent');
    expect(codeDe(() => k5(piece(l, [1000, 200, 1200]), -1))).toBe('parametre_invalide');
    for (const t of [undefined, -1]) {
      const traces = executerControles([regleCCK05], [{ type: 'piece', id: 'p1', donnee: { piece: piece(l, [1000, 200, 1200]), ...(t === undefined ? {} : { tolerance: c(t) }) } }], 'arrivee', 'T');
      expect(traces.map((x) => x.resultat)).toEqual(['IMPOSSIBLE']);
    }
  });

  it('du-egal-ttc-ok', () => {
    expect(k6(piece([ligne(1000, 200, 1200)], [1000, 200, 1200]))).toEqual(OK);
    expect(k6(piece([ligne(1000, 200, 1200)], [1000, 200, 1200], 1200))).toEqual(OK);
    expect(k6(piece([ligne(1000, 200, 1200)], [1000, 200, 1200], 1200), [qual(50)])).toEqual(OK);
  });

  it('qualification-partielle-alerte', () => {
    expect(k6(ttc1200, [qual(300)])).toEqual(arith(100));
    expect(k6(ttc1200, [qual(400), qual(0)])).toEqual(OK);
    expect(k6(ttc1200, [qual(300, 'remise'), qual(100, 'avoir')])).toEqual(OK);
    expect(k6(ttc1200, [qual(401)])).toEqual(arith(1));
    expect(k6(ttc1200, [qual(399)])).toEqual(arith(1));
    expect(k6(ttc1200, [qual(500)])).toEqual(arith(100));
  });

  it('du-superieur-au-ttc-alerte', () => {
    const p = piece([ligne(1000, 200, 1200)], [1000, 200, 1200], 1300);
    expect(k6(p)).toEqual(arith(100));
    expect(k6(p, [qual(100)])).toEqual(arith(100));
  });

  it('piece-sans-ligne', () => {
    expect(k5(piece([], [100, 20, 120]))).toEqual(alerte5(120, 'ht'));
    expect(k5(piece([], [0, 0, 0]))).toEqual(OK);
  });

  it('montants-invalides', () => {
    for (const v of [NaN, Infinity, 1.5]) {
      const faux = v as Centimes;
      expect(codeDe(() => k5({ ...piece([ligne(1, 1, 1)], [1, 1, 1]), totaux: { ht: faux, tva: c(1), ttc: c(1) } }))).toBe('entree_invalide');
      expect(codeDe(() => k5(piece([{ ...ligne(1, 1, 1), tva: faux }], [1, 1, 1])))).toBe('entree_invalide');
      expect(codeDe(() => regleCCK05.evaluer({ piece: piece([], [0, 0, 0]), tolerance: faux }))).toBe('entree_invalide');
      expect(codeDe(() => k6({ ...ttc1200, montantDu: faux }))).toBe('entree_invalide');
      expect(codeDe(() => k6({ ...ttc1200, totaux: { ...ttc1200.totaux, ttc: faux } }))).toBe('entree_invalide');
      expect(codeDe(() => k6(ttc1200, [{ motif: 'avoir', montant: faux }]))).toBe('entree_invalide');
    }
    expect(codeDe(() => k6(ttc1200, [qual(-1)]))).toBe('entree_invalide');
  });
});
