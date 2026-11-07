import { describe, expect, it } from 'vitest';
import { deplacerPiece, ErreurRattachement, type Rattachement } from '../rattachement.js';

// Pièces et personnes INVENTÉES pour les tests.
const ENTREE: readonly Rattachement[] = Object.freeze([
  Object.freeze({ pieceId: 'p-1', mois: '2026-10' }),
  Object.freeze({ pieceId: 'p-2', mois: '2026-10' }),
]);
const DEMANDE = { pieceId: 'p-1', nouveauMois: '2026-11', par: 'Camille Exemple', le: '2026-11-03' };

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurRattachement) return e.code;
    throw e;
  }
  return undefined;
}

describe('deplacerPiece', () => {
  it('d4-octobre-vers-novembre-une-ligne-de-journal', () => {
    const r = deplacerPiece(ENTREE, DEMANDE, []);
    expect(r.journal).toEqual({
      pieceId: 'p-1',
      ancienMois: '2026-10',
      nouveauMois: '2026-11',
      par: 'Camille Exemple',
      le: '2026-11-03',
    });
    expect(r.rattachements).toEqual([{ pieceId: 'p-1', mois: '2026-11' }, { pieceId: 'p-2', mois: '2026-10' }]);
  });

  it('d4-deux-periodes-a-recalculer', () => {
    expect(deplacerPiece(ENTREE, DEMANDE, []).periodesARecalculer).toEqual(['2026-10', '2026-11']);
    // Période sans rapport déposée : sans effet.
    expect(deplacerPiece(ENTREE, DEMANDE, ['2026-09']).periodesARecalculer).toEqual(['2026-10', '2026-11']);
  });

  it('entree-non-modifiee', () => {
    const r = deplacerPiece(ENTREE, DEMANDE, []);
    expect(ENTREE).toEqual([{ pieceId: 'p-1', mois: '2026-10' }, { pieceId: 'p-2', mois: '2026-10' }]);
    expect(r.rattachements).not.toBe(ENTREE);
  });

  it('meme-mois-refuse', () => {
    expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, nouveauMois: '2026-10' }, []))).toBe('mois_identique');
  });

  it('periode-deposee-refusee', () => {
    expect(code(() => deplacerPiece(ENTREE, DEMANDE, ['2026-10']))).toBe('periode_deposee');
    expect(code(() => deplacerPiece(ENTREE, DEMANDE, ['2026-11']))).toBe('periode_deposee');
  });

  it('piece-inconnue-refusee', () => {
    expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, pieceId: 'p-9' }, []))).toBe('piece_inconnue');
    expect(code(() => deplacerPiece([], DEMANDE, []))).toBe('piece_inconnue');
  });

  it('entrees-invalides-refusees', () => {
    for (const m of ['2026-13', '2026-1', '2026-00', '', '26-11', '2026-11-01']) {
      expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, nouveauMois: m }, []))).toBe('mois_invalide');
    }
    expect(code(() => deplacerPiece([{ pieceId: 'p-1', mois: '2026-1' }], DEMANDE, []))).toBe('mois_invalide');
    expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, par: '' }, []))).toBe('trace_invalide');
    expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, par: '  ' }, []))).toBe('trace_invalide');
    expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, pieceId: '' }, []))).toBe('trace_invalide');
    for (const le of ['', '3/11/2026', '2026-02-30', '2026-11']) {
      expect(code(() => deplacerPiece(ENTREE, { ...DEMANDE, le }, []))).toBe('date_invalide');
    }
  });

  it('rattachement-ambigu-refuse', () => {
    const doublon = [...ENTREE, { pieceId: 'p-1', mois: '2026-09' }];
    expect(code(() => deplacerPiece(doublon, DEMANDE, []))).toBe('rattachement_ambigu');
    // Doublon sur une autre pièce : refusé aussi.
    expect(code(() => deplacerPiece([...ENTREE, { pieceId: 'p-2', mois: '2026-09' }], DEMANDE, []))).toBe(
      'rattachement_ambigu',
    );
  });
});
