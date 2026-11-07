import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurLot, recapitulatifLot, regrouper, validerLot, type Acteur, type PieceLot } from '../lot.js';

const marie: Acteur = { type: 'personne', id: 'marie-exemple' };
const robot: Acteur = { type: 'agent', id: 'agent-exemple' };
const piece = (i: number, ttc = 1000, couleur: PieceLot['couleur'] = 'VERT'): PieceLot => ({ id: 'p' + String(i), couleur, ttc: centimes(ttc) });
const lot = (n: number): PieceLot[] => Array.from({ length: n }, (_, i) => piece(i, 1000 + i));
const codeErreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurLot ? e.code : 'autre';
  }
  return undefined;
};
const VIDE = { nombre: 0, total: centimes(0) };
const demande = (pieces: PieceLot[], acteur: Acteur, vu = recapitulatifLot(pieces)) => ({ pieces, acteur, niveau: 'A0' as const, recapitulatifVu: vu });

describe('lot VERT (C2) et regroupement (C3)', () => {
  it('CT-36', () => {
    const pieces = lot(20);
    const recap = recapitulatifLot(pieces);
    expect(recap).toEqual({ nombre: 20, total: 20 * 1000 + 190 });
    const r = validerLot(demande(pieces, marie, { nombre: 20, total: centimes(20190) }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ecritures).toHaveLength(20);
      expect(r.ecritures.every((e) => e.valide_par === 'marie-exemple')).toBe(true);
      expect(r.ecritures.map((e) => e.id)).toEqual(pieces.map((p) => p.id));
    }
    expect(validerLot(demande(pieces, robot))).toEqual({ ok: false, code: 'geste_humain_requis' });
  });

  it('agent-refuse', () => {
    expect(validerLot(demande([piece(1)], robot))).toEqual({ ok: false, code: 'geste_humain_requis' });
    expect(validerLot(demande([piece(1)], robot, { nombre: 9, total: centimes(9) }))).toEqual({ ok: false, code: 'geste_humain_requis' });
    expect(validerLot(demande([piece(1, 1, 'JAUNE')], robot, VIDE))).toEqual({ ok: false, code: 'geste_humain_requis' });
    expect(validerLot(demande([], robot, VIDE))).toEqual({ ok: false, code: 'geste_humain_requis' });
  });

  it('recapitulatif-perime', () => {
    const p = lot(3);
    const vrai = recapitulatifLot(p);
    const perime = { ok: false, code: 'recapitulatif_perime' };
    expect(validerLot(demande(p, marie, { ...vrai, nombre: vrai.nombre + 1 }))).toEqual(perime);
    expect(validerLot(demande(p, marie, { ...vrai, nombre: vrai.nombre - 1 }))).toEqual(perime);
    expect(validerLot(demande(p, marie, { ...vrai, total: centimes(vrai.total + 1) }))).toEqual(perime);
    expect(validerLot(demande(p, marie, { ...vrai, total: centimes(vrai.total - 1) }))).toEqual(perime);
    expect(validerLot(demande(p, marie, vrai)).ok).toBe(true);
  });

  it('piece-jaune-refusee', () => {
    for (const couleur of ['JAUNE', 'ROUGE'] as const) {
      const pieces = [piece(1), piece(2, 5, couleur)];
      expect(codeErreur(() => recapitulatifLot(pieces))).toBe('piece_non_verte');
      expect(codeErreur(() => validerLot({ ...demande([piece(1)], marie), pieces }))).toBe('piece_non_verte');
    }
  });

  it('lot-vide-refuse', () => {
    expect(codeErreur(() => recapitulatifLot([]))).toBe('lot_vide');
    expect(codeErreur(() => validerLot(demande([], marie, VIDE)))).toBe('lot_vide');
  });

  it('regroupement-20-cas-1-groupe', () => {
    const cas = Array.from({ length: 20 }, (_, i) => ({ id: 'c' + String(i).padStart(2, '0'), motif: 'tva_incertaine', fournisseurId: 'fournisseur-bleu' }));
    const groupes = regrouper([...cas].reverse());
    expect(groupes).toHaveLength(1);
    expect(groupes[0]).toEqual({ motif: 'tva_incertaine', fournisseurId: 'fournisseur-bleu', ids: cas.map((x) => x.id) });
    expect(regrouper([])).toEqual([]);
    const deux = regrouper([
      { id: 'b', motif: 'm2', fournisseurId: 'f1' },
      { id: 'a', motif: 'm1', fournisseurId: 'f2' },
      { id: 'c', motif: 'm1', fournisseurId: 'f1' },
    ]);
    expect(deux.map((g) => [g.motif, g.fournisseurId])).toEqual([['m1', 'f1'], ['m1', 'f2'], ['m2', 'f1']]);
  });

  it('regroupement-sans-perte', () => {
    let graine = 12345;
    const suivant = (n: number): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % n;
    };
    const cas = Array.from({ length: 1000 }, (_, i) => ({ id: 'c' + String(i), motif: 'm' + String(suivant(7)), fournisseurId: 'f' + String(suivant(11)) }));
    const groupes = regrouper(cas);
    const tous = groupes.flatMap((g) => g.ids);
    expect(tous).toHaveLength(1000);
    expect(new Set(tous).size).toBe(1000);
    for (const g of groupes) {
      for (const id of g.ids) {
        const origine = cas.find((x) => x.id === id);
        expect([origine?.motif, origine?.fournisseurId]).toEqual([g.motif, g.fournisseurId]);
      }
      expect(g.ids).toEqual([...g.ids].sort());
    }
    expect(groupes.map((g) => g.motif + '|' + g.fournisseurId)).toEqual(groupes.map((g) => g.motif + '|' + g.fournisseurId).sort());
    expect(regrouper([...cas].reverse())).toEqual(groupes);
    expect(codeErreur(() => regrouper([cas[0] as never, cas[0] as never]))).toBe('cas_en_double');
  });

  it('niveau-v1-exception', () => {
    for (const niveau of ['A1', 'A2', 'A3', '']) {
      expect(codeErreur(() => validerLot({ ...demande([piece(1)], marie), niveau: niveau as never }))).toBe('niveau_v1');
      expect(codeErreur(() => validerLot({ ...demande([piece(1)], robot), niveau: niveau as never }))).toBe('niveau_v1');
    }
  });

  it('montants invalides', () => {
    for (const ttc of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(codeErreur(() => recapitulatifLot([{ id: 'x', couleur: 'VERT', ttc: ttc as never }]))).toBe('entree_invalide');
    }
    expect(recapitulatifLot([piece(1, -300), piece(2, 100)])).toEqual({ nombre: 2, total: -200 });
  });
});
