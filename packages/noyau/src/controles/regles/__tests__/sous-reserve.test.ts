import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { LigneTvaAchat } from '../../../tva/sous-reserve.js';
import { executerControles } from '../../moteur.js';
import {
  regleCCT03,
  regleCCT03A,
  regleCCT04,
  troisMontants,
  type LigneSousReserve,
} from '../sous-reserve.js';

const ATTENTE = 'C-ATTENTE';
const DEDUCTIBLE = 'C-DEDUCT';
const ctx = (lignes: LigneSousReserve[]) => ({ lignes, compteAttente: ATTENTE, compteDeductible: DEDUCTIBLE });
const ligne = (o: Partial<LigneSousReserve> = {}): LigneSousReserve => ({
  pieceId: 'p1',
  montant: centimes(4000),
  compteDebit: ATTENTE,
  priseDActe: true,
  dansDeclaration: false,
  ...o,
});
const achat = (id: string, tva: number, certitude: LigneTvaAchat['certitude']): LigneTvaAchat => ({
  id,
  pieceId: 'p' + id,
  tvaCentimes: tva,
  certitude,
});
const mt = (solide: number, sousReserve: number, perdue: number, tvaLue: number) => ({
  tvaLue: centimes(tvaLue),
  solide: centimes(solide),
  sousReserve: centimes(sousReserve),
  perdue: centimes(perdue),
});
const MAUVAIS = [Number.NaN, Number.POSITIVE_INFINITY, 1.5];

describe('controles sous reserve', () => {
  it('CT-20', () => {
    expect(regleCCT03.evaluer(ctx([ligne()]))).toEqual({ resultat: 'OK' });
    expect(regleCCT03A.evaluer(ctx([ligne()]))).toEqual({ resultat: 'OK', valeur: 0 });
  });

  it('CT-21', () => {
    const m = troisMontants([achat('1', 180000, 'solide'), achat('2', 4000, 'sous_reserve'), achat('3', 1200, 'perdue')]);
    expect(m).toEqual({ solide: 180000, sousReserve: 4000, perdue: 1200 });
    expect(regleCCT04.evaluer({ tvaLue: centimes(185200), ...m })).toEqual({ resultat: 'OK' });
    expect(regleCCT04.evaluer({ tvaLue: centimes(185201), ...m })).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
  });

  it('compte-deductible-interdit', () => {
    const r = regleCCT03.evaluer(ctx([ligne(), ligne({ pieceId: 'p2', compteDebit: DEDUCTIBLE })]));
    expect(r).toEqual({ resultat: 'ALERTE', valeur: 1 });
    expect(regleCCT03.evaluer(ctx([ligne({ compteDebit: 'C-AUTRE' })])).resultat).toBe('ALERTE');
  });

  it('ligne-dans-la-declaration-interdite', () => {
    expect(regleCCT03.evaluer(ctx([ligne({ dansDeclaration: true })]))).toEqual({ resultat: 'ALERTE', valeur: 1 });
    const deux = ctx([ligne({ dansDeclaration: true }), ligne({ dansDeclaration: true, compteDebit: DEDUCTIBLE })]);
    expect(regleCCT03.evaluer(deux)).toEqual({ resultat: 'ALERTE', valeur: 2 });
  });

  it('sans-prise-d-acte-bloque', () => {
    expect(regleCCT03A.evaluer(ctx([ligne(), ligne({ priseDActe: false })]))).toEqual({ resultat: 'ALERTE', valeur: 1 });
    expect(regleCCT03A.gravite).toBe('B');
    expect(regleCCT03A.bloque).toEqual(['tva']);
    expect(regleCCT03.gravite).toBe('M');
    expect(regleCCT03.bloque).toEqual([]);
    expect(regleCCT03.declencheurs).toEqual(['continu', 'avant_tva', 'a_la_demande']);
    expect(regleCCT03A.id).toBe('CC-T03A');
    expect(regleCCT04.gravite).toBe('B');
    expect(regleCCT04.bloque).toEqual(['tva']);
    expect(regleCCT04.id).toBe('CC-T04');
    expect(regleCCT03.version).toBe(1);
  });

  it('trois-montants-toujours-presents', () => {
    const m = troisMontants([]);
    expect(Object.keys(m).sort()).toEqual(['perdue', 'solide', 'sousReserve']);
    expect(m).toEqual({ solide: 0, sousReserve: 0, perdue: 0 });
    expect(regleCCT04.evaluer({ tvaLue: centimes(0), ...m })).toEqual({ resultat: 'OK' });
    const inverse = troisMontants([achat('2', 5, 'perdue'), achat('1', 7, 'solide')]);
    expect(inverse).toEqual(troisMontants([achat('1', 7, 'solide'), achat('2', 5, 'perdue')]));
  });

  it('ecart-negatif-signe', () => {
    expect(regleCCT04.evaluer(mt(100, 20, 3, 122))).toEqual({ resultat: 'ALERTE', ecartCentimes: -1 });
    expect(regleCCT04.evaluer(mt(100, 20, 3, 124))).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(regleCCT04.evaluer(mt(100, 20, 3, 123))).toEqual({ resultat: 'OK' });
  });

  it('aucune-ligne-ok', () => {
    expect(regleCCT03.evaluer(ctx([]))).toEqual({ resultat: 'OK' });
    expect(regleCCT03A.evaluer(ctx([]))).toEqual({ resultat: 'OK', valeur: 0 });
    const objets = [{ type: 'lot', id: 'x', donnee: ctx([]) }];
    expect(executerControles([regleCCT03], objets, 'avant_tva', '2026-01-15T10:00:00Z')[0]?.resultat).toBe('OK');
  });

  it('montants-invalides', () => {
    for (const v of MAUVAIS) {
      const l = ligne({ montant: v as never });
      expect(() => regleCCT03.evaluer(ctx([l]))).toThrow();
      expect(() => regleCCT03A.evaluer(ctx([l]))).toThrow();
      expect(() => troisMontants([achat('1', v, 'solide')])).toThrow();
      expect(() => regleCCT04.evaluer({ ...mt(1, 1, 1, 3), tvaLue: v as never })).toThrow();
      expect(() => regleCCT04.evaluer({ ...mt(1, 1, 1, 3), perdue: v as never })).toThrow();
    }
    expect(() => regleCCT03.evaluer({ lignes: [], compteAttente: ATTENTE, compteDeductible: ATTENTE })).toThrow();
    expect(() => regleCCT03.evaluer({ lignes: [], compteAttente: '', compteDeductible: DEDUCTIBLE })).toThrow();
    const traces = executerControles([regleCCT04], [{ type: 'o', id: '1', donnee: { ...mt(1, 1, 1, 3), tvaLue: Number.NaN as never } }], 'avant_tva', '2026-01-15T10:00:00Z');
    expect(traces[0]?.resultat).toBe('IMPOSSIBLE');
  });
});
