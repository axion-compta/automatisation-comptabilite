import { describe, expect, it } from 'vitest';
import { type PieceDepot, MAX_CARTES, recapDepot } from '../depot-recap.js';

const piece = (n: number, o: Partial<PieceDepot> = {}): PieceDepot => ({
  id: `p${n}`,
  libelle: `Facture fictive ${n}`,
  lue: true,
  rangeeDans: 'Achats',
  proposition: `Achat ${n}`,
  confiance: 'sur',
  ...o,
});
const lot = (n: number): PieceDepot[] => Array.from({ length: n }, (_, i) => piece(i + 1));

describe('récapitulatif d’un dépôt de pièces', () => {
  it('cinq-pieces-une-douteuse-recap-de-5-une-question', () => {
    const pieces = lot(5);
    pieces[2] = piece(3, { confiance: 'douteux' });
    const r = recapDepot(pieces);
    expect(r.cartes).toEqual([]);
    expect(r.recapitulatif).toEqual({ total: 5, lues: 5, rangees: 5, proposees: 5 });
    expect(r.questions).toEqual([{ pieceId: 'p3', code: 'piece_douteuse', libelle: 'Facture fictive 3' }]);
    expect(r.message.code).toBe('bien_recu');
    const mixte = recapDepot([
      piece(1, { rangeeDans: '' }),
      piece(2, { proposition: '' }),
      piece(3, { rangeeDans: undefined, lue: false }),
      piece(4, { proposition: undefined }),
      piece(5, { proposition: undefined }),
    ]);
    expect(mixte.recapitulatif).toEqual({ total: 5, lues: 4, rangees: 3, proposees: 2 });
    const quatre = recapDepot(lot(4));
    expect(quatre.recapitulatif?.total).toBe(4);
    expect(quatre.questions).toEqual([]);
  });

  it('trois-pieces-trois-cartes', () => {
    expect(MAX_CARTES).toBe(3);
    const pieces = [piece(1), piece(2, { rangeeDans: undefined }), piece(3, { proposition: undefined, lue: false })];
    const r = recapDepot(pieces);
    expect(r.recapitulatif).toBeUndefined();
    expect(r.cartes).toEqual([
      { pieceId: 'p1', libelle: 'Facture fictive 1', lue: true, rangee: true, proposee: true },
      { pieceId: 'p2', libelle: 'Facture fictive 2', lue: true, rangee: false, proposee: true },
      { pieceId: 'p3', libelle: 'Facture fictive 3', lue: false, rangee: true, proposee: false },
    ]);
    expect(recapDepot([piece(1)]).cartes).toHaveLength(1);
    const q = recapDepot([piece(1), piece(2, { lue: false })]);
    expect(q.questions.map((x) => x.pieceId)).toEqual(['p2']);
    expect(q.message.aValider).toBe(1);
  });

  it('compteur-a-valider-plus-n', () => {
    const r = recapDepot([...lot(2), piece(3, { confiance: 'douteux' }), piece(4, { lue: false }), piece(5, { confiance: 'a_verifier' })]);
    expect(r.message).toEqual({ code: 'bien_recu', aValider: 4 });
    expect(recapDepot([piece(1)]).message).toEqual({ code: 'bien_recu', aValider: 1 });
    expect(recapDepot([piece(1, { lue: false })]).message.aValider).toBe(0);
    expect(JSON.stringify(r)).not.toMatch(/valide[^r]/);
  });

  it('refus-depot-vide-et-doublons', () => {
    expect(() => recapDepot([])).toThrow('depot_vide');
    expect(() => recapDepot([piece(1), piece(1)])).toThrow('piece_en_double');
  });
});
