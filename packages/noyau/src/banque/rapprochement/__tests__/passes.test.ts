import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { LigneBancaire, Moyen, PieceCandidate } from '../../types.js';
import type { Bareme } from '../score.js';
import { ErreurPasses, PASSES, rapprocher, type Reglage } from '../passes.js';

const c = (n: number): Centimes => n as Centimes;
const bareme: Bareme = {
  version: 'test-1', montantExact: 45, montantCentime: 43, contrepartieConnue: 25, contrepartieSimilaire: 15, referenceComplete: 20,
  referenceFin: 8, dateDansTolerance: 7, dateDouble: 3, sensEtMoyen: 3, regleApprise: 15, penalitePartielle: 10, penaliteEcartPeriode: 10,
  joursEcartPeriode: 60, plafond: 100, ecartAmbiguite: 5, plafondAmbigu: 79, seuils: { rapprochee: 95, proposee: 80, douteuse: 60 },
};
const tol = (n: number): Record<Moyen, number> => ({ carte: n, virement: n, prelevement: n, cheque: n, especes: n, frais: n, inconnu: n });
const reglage = (o: Partial<Reglage> = {}): Reglage => ({ bareme, toleranceJours: tol(5), maxAffectation: 20, ...o });
const ligne = (id: string, montant: number, o: Partial<LigneBancaire> = {}): LigneBancaire => ({
  id, societeId: 's1', compteId: 'c1', releveId: 'r1', rang: 0, dateOperation: '2026-03-10', montant: c(montant), devise: 'EUR',
  libelleBrut: 'PAIEMENT', contrepartieId: 'k1', certitudeContrepartie: 'connue', moyen: 'virement', etatTechnique: 'completee',
  etatRapprochement: 'A_QUALIFIER', ...o,
});
type P = PieceCandidate & { reste: Centimes };
const piece = (id: string, montant: number, o: Partial<P> = {}): P => ({
  id, societeId: 's1', montant: c(montant), reste: c(montant), devise: 'EUR', date: '2026-03-08', sens: 'achat', contrepartieId: 'k1', ...o,
});
const lignesJours = (jours: number[], montant = -60000): LigneBancaire[] =>
  jours.map((j, i) => ligne(`L${i + 1}`, montant, { dateOperation: `2026-03-${String(j).padStart(2, '0')}`, rang: i + 1 }));
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as ErreurPasses).code;
  }
  return undefined;
};

describe('rapprocher', () => {
  it('t05-1-reference-exacte-cent', () => {
    const r = rapprocher({ lignes: [ligne('L1', -60000, { libelleBrut: 'VIR FAC-0042 MERCI' })], pieces: [piece('P1', 60001, { numero: 'FAC-0042' })] }, reglage());
    expect(r.etats).toEqual({ L1: 'RAPPROCHEE' });
    expect(r.liens).toHaveLength(1);
    expect(r.liens[0]).toMatchObject({ ligneId: 'L1', pieceId: 'P1', montantAffecte: 60000, passe: PASSES.reference_exacte, codeRaison: 'reference_exacte' });
  });
  it('t05-2-carte-quatre-vingts', () => {
    const r = rapprocher({ lignes: [ligne('L1', -4500, { moyen: 'carte' })], pieces: [piece('P1', 4500)] }, reglage());
    expect(r.etats).toEqual({ L1: 'PROPOSEE' });
    expect(r.liens[0]).toMatchObject({ pieceId: 'P1', score: 80, passe: PASSES.exacte, codeRaison: 'exacte' });
  });
  it('t05-3-regle-apprise', () => {
    const l = ligne('L1', -4501, { regleApprise: true, dateOperation: '2026-03-16' });
    const r = rapprocher({ lignes: [l], pieces: [piece('P1', 4500)] }, reglage());
    expect(r.etats).toEqual({ L1: 'PROPOSEE' });
    expect(r.liens[0]).toMatchObject({ passe: PASSES.tolerante, codeRaison: 'tolerante', montantAffecte: 4500 });
    const sans = rapprocher({ lignes: [{ ...l, regleApprise: false }], pieces: [piece('P1', 4500)] }, reglage());
    expect(sans).toEqual({ liens: [], etats: { L1: 'DOUTEUSE' }, options: { L1: ['P1'] } });
  });
  it('t06-1-deux-factures-douteuse', () => {
    const pieces = [piece('P1', 60000), piece('P2', 60000, { date: '2026-03-09' })];
    const r = rapprocher({ lignes: [ligne('L1', -60000)], pieces }, reglage());
    expect(r).toEqual({ liens: [], etats: { L1: 'DOUTEUSE' }, options: { L1: ['P1', 'P2'] } });
  });
  it('egalite-meme-montant-meme-date-jamais-un-choix', () => {
    const b = { ...bareme, ecartAmbiguite: 0, plafondAmbigu: 100 };
    const r = rapprocher({ lignes: [ligne('L1', -60000)], pieces: [piece('P2', 60000), piece('P1', 60000)] }, reglage({ bareme: b }));
    expect(r).toEqual({ liens: [], etats: { L1: 'DOUTEUSE' }, options: { L1: ['P1', 'P2'] } });
  });
  it('t06-2-affectation-globale', () => {
    const pieces = [piece('P1', 60000, { date: '2026-03-09' }), piece('P2', 60000, { date: '2026-03-12' })];
    const r = rapprocher({ lignes: lignesJours([10, 11]), pieces }, reglage());
    expect(r.liens.map((l) => [l.ligneId, l.pieceId, l.passe, l.codeRaison])).toEqual([
      ['L1', 'P1', PASSES.affectation, 'affectation'],
      ['L2', 'P2', PASSES.affectation, 'affectation'],
    ]);
    expect(r.etats).toEqual({ L1: 'PROPOSEE', L2: 'PROPOSEE' });
  });
  it('affectation-non-unique-douteuse', () => {
    const r = rapprocher({ lignes: lignesJours([10, 10]), pieces: [piece('P1', 60000), piece('P2', 60000)] }, reglage());
    expect(r).toEqual({ liens: [], etats: { L1: 'DOUTEUSE', L2: 'DOUTEUSE' }, options: { L1: ['P1', 'P2'], L2: ['P1', 'P2'] } });
  });
  it('plus-de-lignes-que-de-pieces', () => {
    const pieces = [piece('P1', 60000, { date: '2026-03-09' }), piece('P2', 60000, { date: '2026-03-13' })];
    const r = rapprocher({ lignes: lignesJours([10, 11, 12]), pieces }, reglage());
    expect(r.liens.map((l) => [l.ligneId, l.pieceId])).toEqual([['L1', 'P1'], ['L3', 'P2']]);
    expect(r.etats.L2).toBe('DOUTEUSE');
    expect(r.options.L2).toEqual(['P1', 'P2']);
  });
  it('piece-consommee-par-une-autre-ligne', () => {
    const r = rapprocher({ lignes: lignesJours([9, 20]), pieces: [piece('P1', 60000)] }, reglage());
    expect(r.liens.map((l) => l.ligneId)).toEqual(['L1']);
    expect(r.etats.L2).toBe('DOUTEUSE');
  });
  it('devise-pointee-sur-origine', () => {
    const l = ligne('L1', -55000, { montantOrigine: c(-60000), deviseOrigine: 'USD' });
    const p = piece('P1', 54000, { montantOrigine: c(60000), deviseOrigine: 'USD' });
    const r = rapprocher({ lignes: [l], pieces: [p] }, reglage());
    expect(r.etats).toEqual({ L1: 'PROPOSEE' });
    expect(r.liens[0]).toMatchObject({ pieceId: 'P1', montantAffecte: 54000, passe: PASSES.exacte });
    expect(rapprocher({ lignes: [{ ...l, deviseOrigine: 'GBP' }], pieces: [p] }, reglage()).liens).toEqual([]);
  });
  it('t09-2-sans-origine-douteuse', () => {
    const p = piece('P1', 55000, { montantOrigine: c(60000), deviseOrigine: 'USD' });
    const r = rapprocher({ lignes: [ligne('L1', -55000)], pieces: [p] }, reglage());
    expect(r).toEqual({ liens: [], etats: { L1: 'DOUTEUSE' }, options: { L1: ['P1'] } });
  });
  it('lien-jamais-valide', () => {
    const r = rapprocher({ lignes: [ligne('L1', -60000, { libelleBrut: 'FAC-1' })], pieces: [piece('P1', 60000, { numero: 'FAC-1' })] }, reglage());
    expect(r.etats.L1).toBe('RAPPROCHEE');
    expect(r.liens.every((l) => l.etat === 'propose' && l.proposePar === 'regle' && l.version === 1)).toBe(true);
  });
  it('meme-entree-meme-sortie', () => {
    const lignes = [ligne('L2', -60000, { rang: 2 }), ligne('L1', -60000, { rang: 1, dateOperation: '2026-03-11' })];
    const pieces = [piece('P2', 60000, { date: '2026-03-12' }), piece('P1', 60000), piece('P3', 123)];
    const avant = structuredClone({ lignes, pieces });
    const a = rapprocher({ lignes, pieces }, reglage());
    expect(a.liens).toHaveLength(2);
    expect(rapprocher({ lignes: [...lignes].reverse(), pieces: [...pieces].reverse() }, reglage())).toEqual(a);
    expect({ lignes, pieces }).toEqual(avant);
  });
  it('sens-incompatible-et-reste-respecte', () => {
    const vide = { liens: [], etats: {}, options: {} };
    expect(rapprocher({ lignes: [ligne('L1', -60000)], pieces: [piece('P1', 60000, { sens: 'vente' })] }, reglage())).toEqual(vide);
    expect(rapprocher({ lignes: [ligne('L1', -60000)], pieces: [piece('P1', 60000, { reste: c(25000) })] }, reglage()).liens).toEqual([]);
    const encaisse = rapprocher({ lignes: [ligne('L1', 60000)], pieces: [piece('P1', 60000, { sens: 'vente' })] }, reglage());
    expect(encaisse.liens[0]?.montantAffecte).toBe(60000);
  });
  it('aucune-ligne-aucune-piece', () => {
    expect(rapprocher({ lignes: [], pieces: [piece('P1', 1)] }, reglage())).toEqual({ liens: [], etats: {}, options: {} });
    expect(rapprocher({ lignes: [ligne('L1', -1)], pieces: [] }, reglage()).liens).toEqual([]);
  });
  it.each([[Number.NaN], [-1], [1.5], [Infinity]])('tolerance-et-max-affectation-invalides-%s', (n) => {
    const entree = { lignes: [ligne('L1', -1)], pieces: [piece('P1', 1)] };
    expect(code(() => rapprocher(entree, reglage({ toleranceJours: { ...tol(5), carte: n } })))).toBe('tolerance_invalide');
    for (const m of [n, 0]) expect(code(() => rapprocher(entree, reglage({ maxAffectation: m })))).toBe('reglage_invalide');
  });
  it('affectation-trop-grande-douteuse', () => {
    const pieces = [piece('P1', 60000), piece('P2', 60000), piece('P3', 60000), piece('P4', 777, { sens: 'vente' })];
    const r = rapprocher({ lignes: [...lignesJours([10, 10, 10]), ligne('L4', 777, { rang: 4 })], pieces }, reglage({ maxAffectation: 2 }));
    expect(r.etats).toMatchObject({ L1: 'DOUTEUSE', L2: 'DOUTEUSE', L3: 'DOUTEUSE' });
    expect(r.options.L1).toEqual(['P1', 'P2', 'P3']);
    expect(r.liens.filter((l) => ['L1', 'L2', 'L3'].includes(l.ligneId))).toEqual([]);
  });
  it('date-invalide-refusee', () => {
    const entree = { lignes: [ligne('L1', -60000, { dateOperation: '2026-02-30' })], pieces: [piece('P1', 60000)] };
    expect(code(() => rapprocher(entree, reglage()))).toBe('date_invalide');
  });
});
