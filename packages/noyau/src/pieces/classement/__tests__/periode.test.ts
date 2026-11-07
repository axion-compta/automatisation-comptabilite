import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { statutPeriode, type DatesSociete } from '../periode.js';

const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPiece ? e.code : 'autre'; }
  return undefined;
};
const D: DatesSociete = {
  depotStatuts: '2025-03-01',
  immatriculation: '2025-04-01',
  exercices: [{ id: 'ex1', debut: '2025-06-01', fin: '2026-05-31' }, { id: 'ex2', debut: '2026-06-01', fin: '2027-05-31' }],
};

describe('statutPeriode', () => {
  it('dans-exercice', () => {
    expect(statutPeriode('2025-09-15', D)).toEqual({ statut: 'dans_exercice', exerciceId: 'ex1', anterieure: false });
    expect(statutPeriode('2026-06-01', D)).toEqual({ statut: 'dans_exercice', exerciceId: 'ex2', anterieure: false });
    expect(statutPeriode('2025-06-01', D)).toEqual({ statut: 'dans_exercice', exerciceId: 'ex1', anterieure: false });
  });
  it('borne-de-fin-incluse', () => {
    expect(statutPeriode('2026-05-31', D)).toEqual({ statut: 'dans_exercice', exerciceId: 'ex1', anterieure: false });
    expect(statutPeriode('2027-05-31', D).exerciceId).toBe('ex2');
    expect(statutPeriode('2027-06-01', D)).toEqual({ statut: 'hors_exercice', anterieure: false });
  });
  it('avant-depot', () => {
    expect(statutPeriode('2025-02-28', D)).toEqual({ statut: 'avant_depot', anterieure: true });
    expect(statutPeriode('2025-03-01', D).statut).toBe('formation');
  });
  it('formation', () => {
    expect(statutPeriode('2025-03-31', D)).toEqual({ statut: 'formation', anterieure: true });
    expect(statutPeriode('2025-04-01', D).statut).toBe('entre_immatriculation_et_exercice');
    expect(statutPeriode('2025-01-01', { exercices: D.exercices, immatriculation: '2025-04-01' }).statut).toBe('formation');
  });
  it('entre-immatriculation-et-exercice', () => {
    expect(statutPeriode('2025-05-31', D)).toEqual({ statut: 'entre_immatriculation_et_exercice', anterieure: true });
    expect(statutPeriode('2025-04-15', { exercices: D.exercices }).statut).toBe('entre_immatriculation_et_exercice');
    expect(statutPeriode('2025-04-15', { depotStatuts: '2025-03-01', exercices: D.exercices }).statut).toBe('entre_immatriculation_et_exercice');
  });
  it('hors-exercice-apres-le-dernier', () => {
    expect(statutPeriode('2030-01-01', D)).toEqual({ statut: 'hors_exercice', anterieure: false });
    expect(statutPeriode('2030-01-01', { exercices: [] })).toEqual({ statut: 'hors_exercice', anterieure: false });
    const trou: DatesSociete = { exercices: [{ id: 'a', debut: '2025-01-01', fin: '2025-12-31' }, { id: 'b', debut: '2027-01-01', fin: '2027-12-31' }] };
    expect(statutPeriode('2026-06-01', trou)).toEqual({ statut: 'hors_exercice', anterieure: false });
  });
  it('exercices-dans-le-desordre', () => {
    const inverse: DatesSociete = { ...D, exercices: [...D.exercices].reverse() };
    for (const d of ['2025-02-01', '2025-05-31', '2025-09-15', '2026-06-01', '2030-01-01']) expect(statutPeriode(d, inverse)).toEqual(statutPeriode(d, D));
    expect(D.exercices[0]?.id).toBe('ex1');
  });
  it('dates-invalides-refusees', () => {
    const ex = (debut: string, fin: string, id = 'x') => ({ id, debut, fin });
    const cas: [string, DatesSociete][] = [
      ['2026-02-30', D], ['', D], ['2026-2-3', D], ['2026-01-01x', D], ['x2026-01-01', D], ['2026-13-01', D], ['2026-00-10', D], ['2026-01-00', D],
      ['2026-01-01', { ...D, depotStatuts: '2025-02-30' }], ['2026-01-01', { ...D, immatriculation: '' }],
      ['2026-01-01', { exercices: [ex('2025-01-01', '2025-13-01')] }], ['2026-01-01', { exercices: [ex('2025-02-30', '2025-12-31')] }],
      ['2026-01-01', { exercices: [ex('2025-12-31', '2025-01-01')] }],
      ['2026-01-01', { exercices: [ex('2025-01-01', '2025-12-31', 'a'), ex('2025-12-31', '2026-12-30', 'b')] }],
      ['2026-01-01', { exercices: [ex('2025-01-01', '2025-12-31', 'a'), ex('2025-06-01', '2025-08-01', 'b')] }],
      ['2026-01-01', { exercices: [ex('2025-01-01', '2025-12-31', 'a'), ex('2025-01-01', '2025-12-31', 'b')] }],
    ];
    for (const [date, dates] of cas) expect(code(() => statutPeriode(date, dates))).toBe('dates_invalides');
    expect(code(() => statutPeriode(undefined as never, D))).toBe('dates_invalides');
    expect(code(() => statutPeriode('2026-01-01', { exercices: [ex('2025-01-01', '2025-01-01')] }))).toBeUndefined();
    expect(code(() => statutPeriode('2026-01-01', { exercices: [ex('2025-01-01', '2025-12-31', 'a'), ex('2026-01-01', '2026-12-31', 'b')] }))).toBeUndefined();
  });
  it('annee-bissextile', () => {
    expect(code(() => statutPeriode('2028-02-29', D))).toBeUndefined();
    expect(code(() => statutPeriode('2027-02-29', D))).toBe('dates_invalides');
  });
});
