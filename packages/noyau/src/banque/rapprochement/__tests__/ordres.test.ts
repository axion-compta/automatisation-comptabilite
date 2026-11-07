import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { Lien, LigneBancaire, Moyen, PieceCandidate } from '../../types.js';
import { CODE_DEPEND_ORDRE, ErreurOrdres, melanger, rapprocherEnTroisOrdres, type Graines, type Moteur } from '../ordres.js';
import { rapprocher, type Reglage } from '../passes.js';

const c = (n: number): Centimes => n as Centimes;
const bareme = {
  version: 'test-1', montantExact: 45, montantCentime: 43, contrepartieConnue: 25, contrepartieSimilaire: 15, referenceComplete: 20,
  referenceFin: 8, dateDansTolerance: 7, dateDouble: 3, sensEtMoyen: 3, regleApprise: 15, penalitePartielle: 10, penaliteEcartPeriode: 10,
  joursEcartPeriode: 60, plafond: 100, ecartAmbiguite: 5, plafondAmbigu: 79, seuils: { rapprochee: 95, proposee: 80, douteuse: 60 },
};
const tol = (n: number): Record<Moyen, number> => ({ carte: n, virement: n, prelevement: n, cheque: n, especes: n, frais: n, inconnu: n });
const reglage: Reglage = { bareme, toleranceJours: tol(5), maxAffectation: 20 };
const ligne = (id: string, montant: number, rang: number): LigneBancaire => ({
  id, societeId: 's1', compteId: 'c1', releveId: 'r1', rang, dateOperation: '2026-03-10', montant: c(montant), devise: 'EUR',
  libelleBrut: `VIR REF-${id}`, reference: `REF-${id}`, contrepartieId: 'k1', certitudeContrepartie: 'connue', moyen: 'virement',
  etatTechnique: 'completee', etatRapprochement: 'A_QUALIFIER',
});
const piece = (id: string, montant: number): PieceCandidate & { reste: Centimes } => ({
  id, societeId: 's1', montant: c(montant), reste: c(montant), devise: 'EUR', date: '2026-03-08', sens: 'achat', contrepartieId: 'k1', numero: `REF-${id.replace('P', 'L')}`,
});
const GRAINES: Graines = [11, 22, 33];
const lignes50 = Array.from({ length: 50 }, (_, i) => ligne(`L${i + 1}`, -(10000 + i * 137), i + 1));
const pieces50 = Array.from({ length: 50 }, (_, i) => piece(`P${i + 1}`, 10000 + i * 137));
// Moteur fabriqué : prend la première pièce reçue, donc dépend de l'ordre.
const moteurOrdre: Moteur = (entree) => {
  const p = entree.pieces[0];
  const l = entree.lignes[0];
  if (p === undefined || l === undefined) return { liens: [], etats: {}, options: {} };
  const lien: Lien = {
    id: `lien:${l.id}:${p.id}`, groupeId: 'g', ligneId: l.id, pieceId: p.id, montantAffecte: c(1), score: 100, facteurs: [], passe: 5,
    codeRaison: 'exacte', proposePar: 'regle', etat: 'propose', version: 1,
  };
  return { liens: [lien], etats: { [l.id]: 'RAPPROCHEE' }, options: {} };
};
// Moteur fabriqué rejoué : au n-ième appel, rend les couples [ligne, pièce] de la n-ième liste.
const sequence = (appels: string[][][]): Moteur => {
  let n = 0;
  return () => {
    const couples = appels[n++] ?? [];
    const liens = couples.map(([l, p]) => moteurOrdre({ lignes: [ligne(l as string, -1, 1)], pieces: [piece(p as string, 1)] }, reglage).liens[0] as Lien);
    return { liens, etats: Object.fromEntries(couples.map(([l]) => [l as string, 'RAPPROCHEE' as const])), options: {} };
  };
};
const erreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as ErreurOrdres).code;
  }
  return undefined;
};

describe('rapprocherEnTroisOrdres', () => {
  it('t05-5-trois-ordres-memes-liens', () => {
    const entree = { lignes: lignes50, pieces: pieces50 };
    const r = rapprocherEnTroisOrdres(entree, reglage, GRAINES);
    const direct = rapprocher(entree, reglage);
    expect(r.liens).toEqual(direct.liens);
    expect(r.liens).toHaveLength(50);
    expect(r.etats).toEqual(direct.etats);
    expect(r.execution.ecartEntreOrdres).toBe(false);
    expect(r.liens.every((l) => l.etat === 'propose' && l.codeRaison !== CODE_DEPEND_ORDRE)).toBe(true);
  });
  it('cas-fabrique-depend-de-l-ordre', () => {
    const entree = { lignes: [ligne('L1', -100, 1)], pieces: [piece('P1', 100), piece('P2', 100), piece('P3', 100)] };
    const r = rapprocherEnTroisOrdres(entree, reglage, GRAINES, moteurOrdre);
    expect(r.execution.ecartEntreOrdres).toBe(true);
    expect(r.etats.L1).toBe('DOUTEUSE');
    expect(r.options.L1?.length).toBeGreaterThan(1);
    expect(r.liens.length).toBeGreaterThan(1);
    for (const l of r.liens) {
      expect(l).toMatchObject({ codeRaison: 'depend_de_l_ordre', etat: 'propose', score: bareme.plafondAmbigu });
    }
  });
  it('graines-dans-l-execution', () => {
    const r = rapprocherEnTroisOrdres({ lignes: lignes50, pieces: pieces50 }, reglage, [5, 6, 7]);
    expect(r.execution.graines).toEqual([5, 6, 7]);
    expect(r.execution.empreinteResultat).toMatch(/^[0-9a-f]{64}$/);
  });
  it('empreinte-stable', () => {
    const entree = { lignes: lignes50, pieces: pieces50 };
    const a = rapprocherEnTroisOrdres(entree, reglage, GRAINES);
    const b = rapprocherEnTroisOrdres(entree, reglage, [1, 2, 3]);
    expect(b.execution.empreinteResultat).toBe(a.execution.empreinteResultat);
    const moins = rapprocherEnTroisOrdres({ lignes: lignes50.slice(1), pieces: pieces50 }, reglage, GRAINES);
    expect(moins.execution.empreinteResultat).not.toBe(a.execution.empreinteResultat);
  });
  it('melange-deterministe', () => {
    const t = Array.from({ length: 30 }, (_, i) => i);
    const copie = [...t];
    expect(melanger(t, 42)).toEqual(melanger(t, 42));
    expect(t).toEqual(copie);
    expect(melanger(t, 42)).not.toEqual(melanger(t, 43));
    expect([...melanger(t, 42)].sort((x, y) => x - y)).toEqual(t);
    expect(melanger(t, 0)).toEqual(melanger(t, 0));
    expect(melanger(t, -7)).toEqual(melanger(t, -7));
    expect(melanger([], 1)).toEqual([]);
  });
  it('graine-invalide', () => {
    for (const g of [Number.NaN, Infinity, -Infinity, 1.5]) {
      expect(erreur(() => melanger([1, 2], g))).toBe('graine_invalide');
      expect(erreur(() => rapprocherEnTroisOrdres({ lignes: [], pieces: [] }, reglage, [1, g, 3]))).toBe('graine_invalide');
    }
  });
  it('entree-vide-et-graines-identiques', () => {
    const vide = rapprocherEnTroisOrdres({ lignes: [], pieces: [] }, reglage, [0, -1, 2]);
    expect(vide).toMatchObject({ liens: [], etats: {}, execution: { ecartEntreOrdres: false, notes: [] } });
    const memes = rapprocherEnTroisOrdres({ lignes: lignes50, pieces: pieces50 }, reglage, [9, 9, 9]);
    expect(memes.execution.notes).toEqual(['graines_identiques']);
    expect(memes.execution.ecartEntreOrdres).toBe(false);
  });
  it('un-seul-ordre-sur-trois-differe', () => {
    const m = sequence([[['L1', 'P1']], [['L1', 'P1']], [['L1', 'P2']]]);
    const r = rapprocherEnTroisOrdres({ lignes: [], pieces: [] }, reglage, GRAINES, m);
    expect(r.etats.L1).toBe('DOUTEUSE');
    expect(r.execution.ecartEntreOrdres).toBe(true);
    expect(r.options.L1).toEqual(['P1', 'P2']);
  });
  it('ordre-de-sortie-et-empreinte-de-reference', () => {
    const m = sequence([[['L2', 'P2'], ['L1', 'P2']], [['L2', 'P1'], ['L1', 'P1']], [['L2', 'P1'], ['L1', 'P1']]]);
    const r = rapprocherEnTroisOrdres({ lignes: [], pieces: [] }, reglage, GRAINES, m);
    expect(r.liens.map((l) => `${l.ligneId}${l.pieceId}`)).toEqual(['L1P1', 'L1P2', 'L2P1', 'L2P2']);
    expect(r.execution.empreinteResultat).toBe('750f102683cfb7d6ce136a83a8fecd6d8c13fbc8c6a83614e44bdab97ae3a720');
  });
});
