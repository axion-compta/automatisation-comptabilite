import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { restePiece, resteLigne, verifierNouveauLien } from '../sommes.js';

type L = Parameters<typeof restePiece>[1][number];
const lien = (ligneId: string, pieceId: string | undefined, m: number, etat: L['etat'] = 'valide'): L => ({
  ligneId, ...(pieceId === undefined ? {} : { pieceId }), montantAffecte: m as Centimes, etat,
});
const piece = { id: 'p1', montant: 60000 };
const ligne = { id: 'l1', montant: -100000 };
const nouveau = (m: number, pieceId: string | undefined = 'p1') => ({ ligneId: 'l1', pieceId, montantAffecte: m });

describe('sommes', () => {
  it('t06-7-sept-cents-sur-six-cents', () => {
    expect(verifierNouveauLien(nouveau(70000), ligne, piece, [])).toEqual({ ok: false, code: 'depasse_piece', maximum: 60000 });
  });
  it('reste-apres-deux-liens', () => {
    const liens = [lien('l1', 'p1', 10000), lien('l2', 'p1', 20000, 'propose')];
    expect(restePiece(piece, liens)).toBe(30000);
    expect(restePiece(piece, [])).toBe(60000);
    expect(resteLigne(ligne, [lien('l1', 'p9', 25000)])).toBe(75000);
    expect(verifierNouveauLien(nouveau(30001), ligne, piece, liens)).toEqual({ ok: false, code: 'depasse_piece', maximum: 30000 });
    expect(verifierNouveauLien(nouveau(30000), ligne, piece, [...liens].reverse())).toEqual({ ok: true });
  });
  it('liens-refuses-et-defaits-ignores', () => {
    const liens = [lien('l1', 'p1', 50000, 'refuse'), lien('l1', 'p1', 50000, 'defait')];
    expect(restePiece(piece, liens)).toBe(60000);
    expect(resteLigne(ligne, liens)).toBe(100000);
    expect(verifierNouveauLien(nouveau(60000), ligne, piece, liens)).toEqual({ ok: true });
  });
  it('ligne-negative-valeur-absolue', () => {
    expect(resteLigne(ligne, [])).toBe(100000);
    expect(resteLigne({ id: 'l1', montant: 100000 }, [])).toBe(100000);
    const liens = [lien('l1', undefined, 90000)];
    expect(verifierNouveauLien(nouveau(10001, undefined), ligne, undefined, liens)).toEqual({ ok: false, code: 'depasse_ligne', maximum: 10000 });
    expect(verifierNouveauLien(nouveau(10000, undefined), ligne, undefined, [])).toEqual({ ok: true });
    expect(verifierNouveauLien(nouveau(10001, undefined), ligne, piece, [lien('l1', 'p2', 90000)])).toEqual({ ok: false, code: 'depasse_ligne', maximum: 10000 });
  });
  it('exactement-le-reste-accepte', () => {
    expect(verifierNouveauLien(nouveau(60000), ligne, piece, [])).toEqual({ ok: true });
    expect(verifierNouveauLien(nouveau(100000, undefined), ligne, undefined, [])).toEqual({ ok: true });
    expect(verifierNouveauLien(nouveau(1), { id: 'l1', montant: 0 }, undefined, [])).toEqual({ ok: false, code: 'depasse_ligne', maximum: 0 });
  });
  it('un-centime-de-trop-refuse', () => {
    expect(verifierNouveauLien(nouveau(60001), ligne, piece, [])).toEqual({ ok: false, code: 'depasse_piece', maximum: 60000 });
    expect(verifierNouveauLien(nouveau(100001, undefined), ligne, undefined, [])).toEqual({ ok: false, code: 'depasse_ligne', maximum: 100000 });
    for (const m of [0, -5, Number.NaN, Infinity, 1.5])
      expect(verifierNouveauLien(nouveau(m), ligne, piece, [])).toEqual({ ok: false, code: 'montant_invalide' });
    expect(verifierNouveauLien(nouveau(1), ligne, { id: 'p1', montant: -100 }, [])).toEqual({ ok: false, code: 'piece_invalide' });
    expect(verifierNouveauLien(nouveau(1), ligne, { id: 'p1', montant: Number.NaN }, [])).toEqual({ ok: false, code: 'piece_invalide' });
  });
  it('autre-piece-sans-effet', () => {
    const liens = [lien('l2', 'p2', 60000), lien('l2', 'p3', 5000)];
    expect(restePiece(piece, liens)).toBe(60000);
    expect(resteLigne(ligne, liens)).toBe(100000);
    expect(verifierNouveauLien(nouveau(60000), ligne, piece, liens)).toEqual({ ok: true });
  });
  it('propriete-somme-jamais-depassee', () => {
    let graine = 12345;
    const alea = (n: number) => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % n;
    };
    for (let cas = 0; cas < 500; cas++) {
      const pieces = [0, 1, 2].map((i) => ({ id: `p${i}`, montant: alea(5000) }));
      const lignes = [0, 1].map((i) => ({ id: `l${i}`, montant: alea(10000) - 5000 }));
      const liens: L[] = [];
      for (let t = 0; t < 20; t++) {
        const p = pieces[alea(3)]!;
        const l = lignes[alea(2)]!;
        const m = alea(3000) + 1;
        if (verifierNouveauLien({ ligneId: l.id, pieceId: p.id, montantAffecte: m }, l, p, liens).ok) liens.push(lien(l.id, p.id, m));
      }
      for (const p of pieces) expect(liens.filter((x) => x.pieceId === p.id).reduce((s, x) => s + x.montantAffecte, 0)).toBeLessThanOrEqual(p.montant);
      for (const l of lignes) expect(liens.filter((x) => x.ligneId === l.id).reduce((s, x) => s + x.montantAffecte, 0)).toBeLessThanOrEqual(Math.abs(l.montant));
    }
  });
});
