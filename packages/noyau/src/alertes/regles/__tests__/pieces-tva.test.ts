import { describe, expect, it } from 'vitest';
import { alr02, alr05, alr06, alr07, ErreurRegle } from '../pieces-tva.js';

const L = (id: string, date: string, pieceId?: string) => ({ id, date, ...(pieceId ? { pieceId } : {}) });
const P = (id: string, lectureDouteuse: boolean, periodeTva?: string) => ({ id, lectureDouteuse, ...(periodeTva ? { periodeTva } : {}) });
const N = { joursSansPiece: 4 };

describe('alertes pièces et TVA', () => {
  it('alr02-se-declenche', () => {
    expect(alr02([L('b1', '2026-03-01')], '2026-03-20', N)).toEqual([
      { regle: 'ALR-02', objetType: 'ligne_bancaire', objetId: 'b1', gravite: 'a_faire' },
    ]);
    expect(alr02([L('b1', '2026-03-01', 'p1'), L('b2', '2026-03-01')], '2026-03-20', N).map((c) => c.objetId)).toEqual(['b2']);
  });

  it('alr02-ne-se-declenche-pas', () => {
    expect(alr02([L('b1', '2026-03-01', 'p1')], '2026-03-20', N)).toEqual([]);
    expect(alr02([L('b1', '2026-03-20')], '2026-03-20', N)).toEqual([]);
    expect(alr02([L('b1', '2026-03-25')], '2026-03-20', N)).toEqual([]);
    expect(alr02([], '2026-03-20', N)).toEqual([]);
  });

  it('alr02-seuil-exact', () => {
    expect(alr02([L('b1', '2026-03-17')], '2026-03-20', N)).toEqual([]);
    expect(alr02([L('b1', '2026-03-16')], '2026-03-20', N)).toHaveLength(1);
    expect(alr02([L('b1', '2026-03-15')], '2026-03-20', N)).toHaveLength(1);
    expect(alr02([L('b1', '2026-03-20')], '2026-03-20', { joursSansPiece: 0 })).toHaveLength(1);
  });

  it('alr02-parametre-invalide-refuse', () => {
    for (const v of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => alr02([], '2026-03-20', { joursSansPiece: v })).toThrow(ErreurRegle);
    }
  });

  it('alr05-a-faire-hors-tva', () => {
    expect(alr05([P('p1', true)])).toEqual([{ regle: 'ALR-05', objetType: 'piece', objetId: 'p1', gravite: 'a_faire' }]);
  });

  it('alr05-bloquant-si-periode-tva', () => {
    expect(alr05([P('p1', true, '2026-T1')])).toEqual([
      { regle: 'ALR-05', objetType: 'piece', objetId: 'p1', periode: '2026-T1', gravite: 'bloquant' },
    ]);
  });

  it('alr05-lecture-sure-rien', () => {
    expect(alr05([P('p1', false), P('p2', false, '2026-T1')])).toEqual([]);
    expect(alr05([])).toEqual([]);
  });

  it('alr06-toujours-bloquant', () => {
    expect(alr06([{ id: 'p1', tauxConnu: false, natureConnue: false }])).toEqual([
      { regle: 'ALR-06', objetType: 'piece', objetId: 'p1', gravite: 'bloquant' },
    ]);
  });

  it('alr06-taux-et-nature-connus-rien', () => {
    expect(alr06([{ id: 'p1', tauxConnu: true, natureConnue: true }])).toEqual([]);
    expect(alr06([])).toEqual([]);
  });

  it('alr06-un-seul-manquant-suffit', () => {
    const c = alr06([
      { id: 'p1', tauxConnu: false, natureConnue: true },
      { id: 'p2', tauxConnu: true, natureConnue: false },
    ]);
    expect(c.map((x) => [x.objetId, x.gravite])).toEqual([['p1', 'bloquant'], ['p2', 'bloquant']]);
  });

  it('alr07-vrai-bloquant', () => {
    expect(alr07(true, 's1')).toEqual([{ regle: 'ALR-07', objetType: 'societe', objetId: 's1', gravite: 'bloquant' }]);
  });

  it('alr07-faux-rien', () => {
    expect(alr07(false, 's1')).toEqual([]);
  });

  it('alr07-absent-rien', () => {
    expect(alr07(undefined, 's1')).toEqual([]);
  });
});
