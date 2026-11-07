import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import type { LignePiece, PieceControlee } from '../commun.js';
import { ecartsArithmetiques, regleCCK04, type ObjetArithmetique } from '../arithmetique.js';

const c = (n: number): Centimes => centimes(n);
const ligne = (taux: number, ht: number, tva: number, ttc: number): LignePiece => ({
  taux,
  nature: 'bien',
  ht: c(ht),
  tva: c(tva),
  ttc: c(ttc),
});
const piece = (lignes: LignePiece[]): PieceControlee => ({
  id: 'p1',
  sens: 'achat',
  date: '2026-01-10',
  lignes,
  totaux: { ht: c(0), tva: c(0), ttc: c(0) },
  mentions: [],
});
const objet = (lignes: LignePiece[], tt = 1, tp = 5): ObjetArithmetique => ({
  piece: piece(lignes),
  toleranceTaux: c(tt),
  tolerancePiece: c(tp),
});
const OK = { resultat: 'OK' };
const ARITH = (ecart: number) => ({ resultat: 'ALERTE', ecartCentimes: ecart, valeur: 'ARITH' });

describe('CC-K04', () => {
  it('CT-04', () => {
    expect(regleCCK04.evaluer(objet([ligne(2000, 8333, 1667, 10000)]))).toEqual(OK);
    expect(regleCCK04.evaluer(objet([ligne(2000, 8333, 1666, 10000)]))).toEqual(OK);
  });

  it('CT-05', () => {
    const trois = [ligne(2000, 1000, 200, 1201), ligne(1000, 1000, 100, 1099), ligne(550, 1000, 55, 1056)];
    expect(regleCCK04.evaluer(objet(trois, 1, 5))).toEqual(OK);
    expect(regleCCK04.evaluer(objet([ligne(2000, 10000, 2000, 12030)]))).toEqual(ARITH(30));
  });

  it('tolerance-taux-exacte-ok', () => {
    expect(regleCCK04.evaluer(objet([ligne(2000, 1000, 200, 1203)], 3, 3))).toEqual(OK);
    expect(regleCCK04.evaluer(objet([ligne(2000, 1000, 200, 1197)], 3, 3))).toEqual(OK);
    expect(regleCCK04.evaluer(objet([ligne(2000, 1000, 200, 1200)], 0, 0))).toEqual(OK);
  });

  it('tolerance-taux-plus-un-alerte', () => {
    expect(regleCCK04.evaluer(objet([ligne(2000, 1000, 200, 1204)], 3, 99))).toEqual(ARITH(4));
    expect(regleCCK04.evaluer(objet([ligne(2000, 1000, 200, 1196)], 3, 99))).toEqual(ARITH(4));
  });

  it('total-piece-depasse-alerte', () => {
    const l = [ligne(2000, 1000, 200, 1201), ligne(1000, 1000, 100, 1101), ligne(550, 1000, 55, 1056)];
    expect(regleCCK04.evaluer(objet(l, 1, 3))).toEqual(OK);
    expect(regleCCK04.evaluer(objet(l, 1, 2))).toEqual(ARITH(3));
  });

  it('tolerance-absente-impossible', () => {
    const l = [ligne(2000, 1000, 200, 1200)];
    const cas: ObjetArithmetique[] = [
      { piece: piece(l), tolerancePiece: c(5) },
      { piece: piece(l), toleranceTaux: c(1) },
      { piece: piece(l), toleranceTaux: c(-1), tolerancePiece: c(5) },
      { piece: piece(l), toleranceTaux: c(1), tolerancePiece: c(-1) },
    ];
    for (const o of cas) {
      const traces = executerControles([regleCCK04], [{ type: 'piece', id: 'p1', donnee: o }], 'arrivee', 'T');
      expect(traces.map((t) => t.resultat)).toEqual(['IMPOSSIBLE']);
    }
  });

  it('montants-invalides', () => {
    for (const v of [NaN, Infinity, 1.5]) {
      const faux = (champ: 'ht' | 'tva' | 'ttc') => ({ ...ligne(2000, 1000, 200, 1200), [champ]: v as Centimes });
      for (const champ of ['ht', 'tva', 'ttc'] as const) {
        expect(() => ecartsArithmetiques(piece([faux(champ)]))).toThrow();
      }
    }
    expect(() => ecartsArithmetiques(piece([{ ...ligne(2000, 1, 1, 1), taux: 1.5 }]))).toThrow();
    expect(ecartsArithmetiques(piece([]))).toEqual({ parTaux: [], total: 0 });
    expect(regleCCK04.evaluer(objet([]))).toEqual(OK);
  });

  it('ordre-des-lignes-sans-effet', () => {
    const l = [ligne(2000, 1000, 200, 1202), ligne(1000, 1000, 100, 1099), ligne(2000, 500, 100, 600)];
    const direct = ecartsArithmetiques(piece(l));
    expect(ecartsArithmetiques(piece([...l].reverse()))).toEqual(direct);
    expect(direct).toEqual({
      parTaux: [
        { taux: 1000, ecart: 1 },
        { taux: 2000, ecart: 2 },
      ],
      total: 3,
    });
    expect(regleCCK04.evaluer(objet([...l].reverse(), 2, 3))).toEqual(regleCCK04.evaluer(objet(l, 2, 3)));
  });

  it('metadonnees', () => {
    expect(regleCCK04).toMatchObject({ id: 'CC-K04', version: 1, gravite: 'M', bloque: [], actif: true });
    expect(regleCCK04.declencheurs).toEqual(['arrivee', 'continu', 'nocturne', 'a_la_demande']);
  });
});
