import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { LigneBancaire, Lien, PieceCandidate } from '../../types.js';
import { neutraliser, preparer } from '../preparation.js';

const c = (n: number): Centimes => n as Centimes;
const ligne = (id: string, montant: number, o: Partial<LigneBancaire> = {}): LigneBancaire => ({
  id, societeId: 's1', compteId: 'c1', releveId: 'r1', rang: Number(id.replace(/\D/g, '')) || 0, dateOperation: '2026-03-10',
  montant: c(montant), devise: 'EUR', libelleBrut: 'X', contrepartieId: 'k1', moyen: 'virement', etatTechnique: 'completee',
  etatRapprochement: 'A_QUALIFIER', ...o,
});
const piece = (id: string, montant: number, o: Partial<PieceCandidate> = {}): PieceCandidate => ({
  id, societeId: 's1', montant: c(montant), devise: 'EUR', date: '2026-03-01', sens: 'achat', ...o,
});
const lien = (ligneId: string, pieceId: string, m: number, etat: Lien['etat'] = 'valide'): Lien => ({
  id: `${ligneId}-${pieceId}-${etat}`, groupeId: 'g', ligneId, pieceId, montantAffecte: c(m), score: 0, facteurs: [], passe: 1,
  codeRaison: 'x', proposePar: 'regle', etat, version: 1,
});

describe('preparer', () => {
  it('t05-8-autre-societe-ecartee', () => {
    const r = preparer('s1', [ligne('l1', -100, { societeId: 's2' }), ligne('l2', -100)], [piece('p1', 100, { societeId: 's2' }), piece('p2', 100)], []);
    expect(r.lignes.map((l) => l.id)).toEqual(['l2']);
    expect(r.pieces.map((p) => p.id)).toEqual(['p2']);
    expect(r.ecartees).toEqual([{ id: 'l1', motif: 'autre_societe' }, { id: 'p1', motif: 'autre_societe' }]);
  });
  it('en-attente-ecartee', () => {
    const r = preparer('s1', [ligne('l1', -100, { etatTechnique: 'en_attente' }), ligne('l2', -100, { etatTechnique: 'refusee' })], [], []);
    expect(r.lignes).toEqual([]);
    expect(r.ecartees).toEqual([{ id: 'l1', motif: 'non_comptable' }, { id: 'l2', motif: 'non_comptable' }]);
  });
  it('deja-validee-ecartee', () => {
    const liens = [lien('l1', 'p1', 100), lien('l2', 'p1', 40), lien('l3', 'p1', 100, 'propose')];
    const r = preparer('s1', [ligne('l1', -100), ligne('l2', -100), ligne('l3', -100)], [piece('p1', 500)], liens);
    expect(r.lignes.map((l) => l.id)).toEqual(['l2', 'l3']);
    expect(r.ecartees).toEqual([{ id: 'l1', motif: 'deja_validee' }]);
  });
  it('piece-soldee-ecartee', () => {
    const r = preparer('s1', [], [piece('p1', 300), piece('p2', 300), piece('p3', 300)], [lien('l1', 'p1', 300), lien('l1', 'p2', 100, 'propose')]);
    expect(r.pieces.map((p) => [p.id, p.reste])).toEqual([['p2', 200], ['p3', 300]]);
    expect(r.ecartees).toEqual([{ id: 'p1', motif: 'piece_soldee' }]);
    const s = preparer('s1', [], [piece('p1', 100)], [lien('l1', 'p1', 150)]);
    expect(s.pieces).toEqual([]);
    expect(s.ecartees).toEqual([{ id: 'p1', motif: 'piece_soldee' }]);
  });
  it('cas-limites', () => {
    expect(() => preparer('', [], [], [])).toThrow('societe_absente');
    expect(preparer('s1', [], [], [])).toEqual({ lignes: [], pieces: [], ecartees: [] });
    const r = preparer('s1', [], [piece('p1', 100)], [lien('l1', 'p1', 100, 'refuse'), lien('l1', 'p1', 100, 'defait')]);
    expect(r.pieces.map((p) => p.reste)).toEqual([100]);
  });
});

describe('neutraliser', () => {
  it('aller-retour-neutralise', () => {
    expect(neutraliser([ligne('l1', -500), ligne('l2', 500)])).toEqual([{ debitId: 'l1', creditId: 'l2' }]);
  });
  it('contrepartie-differente-non-neutralise', () => {
    expect(neutraliser([ligne('l1', -500), ligne('l2', 500, { contrepartieId: 'k2' })])).toEqual([]);
    expect(neutraliser([ligne('l1', -500), ligne('l2', 500, { dateOperation: '2026-03-11' })])).toEqual([]);
    expect(neutraliser([ligne('l1', -500), ligne('l2', 500, { compteId: 'c2' })])).toEqual([]);
    expect(neutraliser([ligne('l1', -500), ligne('l2', 501)])).toEqual([]);
  });
  it('trois-debits-deux-credits-deux-paires', () => {
    const ls = [ligne('l1', -500), ligne('l2', -500), ligne('l3', -500), ligne('l4', 500), ligne('l5', 500)];
    expect(neutraliser(ls)).toEqual([{ debitId: 'l1', creditId: 'l4' }, { debitId: 'l2', creditId: 'l5' }]);
  });
  it('ordre-d-entree-sans-effet', () => {
    const ls = [ligne('l1', -500), ligne('l2', -500), ligne('l3', -500), ligne('l4', 500), ligne('l5', 500)];
    expect(neutraliser([...ls].reverse())).toEqual(neutraliser(ls));
    expect(neutraliser([ls[2]!, ls[4]!, ls[0]!, ls[3]!, ls[1]!])).toEqual(neutraliser(ls));
  });
  it('jamais-sans-contrepartie-ni-montant-nul', () => {
    const sans = (id: string, m: number): LigneBancaire => {
      const l: Partial<LigneBancaire> = ligne(id, m);
      delete l.contrepartieId;
      return l as LigneBancaire;
    };
    const vide = { contrepartieId: '' };
    expect(neutraliser([sans('l1', -500), sans('l2', 500)])).toEqual([]);
    expect(neutraliser([ligne('l1', -500, vide), ligne('l2', 500, vide)])).toEqual([]);
    expect(neutraliser([ligne('l1', 0), ligne('l2', 0)])).toEqual([]);
    expect(neutraliser([ligne('l1', -Infinity), ligne('l2', NaN)])).toEqual([]);
    expect(neutraliser([ligne('l1', -Infinity), ligne('l2', Infinity)])).toEqual([]);
    expect(neutraliser([ligne('l1', -1.5), ligne('l2', 1.5)])).toEqual([]);
    expect(neutraliser([])).toEqual([]);
  });
});
