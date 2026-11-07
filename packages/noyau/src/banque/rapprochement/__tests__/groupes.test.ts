import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { LigneBancaire, PieceCandidate } from '../../types.js';
import { resteLigne } from '../sommes.js';
import { groupeNPourUn, groupeUnPourN, liensNPourUn, liensUnPourN } from '../groupes.js';

const c = (n: number): Centimes => n as Centimes;
const ligne = (id: string, montant: number, date = '2026-03-10', o: Partial<LigneBancaire> = {}): LigneBancaire => ({
  id, societeId: 's1', compteId: 'c1', releveId: 'r1', rang: 0, dateOperation: date, montant: c(montant), devise: 'EUR',
  libelleBrut: 'X', contrepartieId: 'k1', moyen: 'virement', etatTechnique: 'completee', etatRapprochement: 'A_QUALIFIER', ...o,
});
type P = PieceCandidate & { reste: Centimes };
const piece = (id: string, montant: number, o: Partial<P> = {}): P => ({
  id, societeId: 's1', montant: c(montant), reste: c(montant), devise: 'EUR', date: '2026-03-01', sens: 'achat', contrepartieId: 'k1', ...o,
});
const B = { maxPieces: 8, fenetreJours: 60 };
const base = [piece('P1', 50000), piece('P2', 53000), piece('P3', 50000), piece('P4', 47000)];
const L = ligne('L1', -153000);

describe('groupeUnPourN', () => {
  it('t06-5-une-combinaison', () => {
    expect(groupeUnPourN(L, base, B)).toEqual({ type: 'proposee', pieces: ['P1', 'P2', 'P3'] });
  });
  it('t06-5-variante-trois-combinaisons-douteuse', () => {
    const r = groupeUnPourN(L, [...base, piece('P5', 103000)], B);
    expect(r).toEqual({ type: 'douteuse', combinaisons: [['P1', 'P5'], ['P3', 'P5']] });
  });
  it('t06-6-facture-moins-avoir', () => {
    const ps = [piece('F1', 100000), piece('A1', 20000, { avoir: true })];
    expect(groupeUnPourN(ligne('L2', -80000), ps, B)).toEqual({ type: 'proposee', pieces: ['A1', 'F1'] });
  });
  it('au-dela-de-max-pieces-aucun', () => {
    expect(groupeUnPourN(L, base, { ...B, maxPieces: 2 })).toEqual({ type: 'aucun' });
    expect(groupeUnPourN(L, base, { ...B, maxPieces: 3 })).toEqual({ type: 'proposee', pieces: ['P1', 'P2', 'P3'] });
  });
  it('hors-fenetre-ignoree', () => {
    const ps = [piece('P1', 50000), piece('P2', 53000), piece('P3', 50000, { date: '2025-12-01' }), piece('P4', 47000)];
    expect(groupeUnPourN(L, ps, B)).toEqual({ type: 'aucun' });
    expect(groupeUnPourN(L, ps, { ...B, fenetreJours: 200 })).toEqual({ type: 'proposee', pieces: ['P3', 'P1', 'P2'] });
    const bord = [piece('P1', 153000, { date: '2026-01-09' })];
    expect(groupeUnPourN(L, bord, B)).toEqual({ type: 'proposee', pieces: ['P1'] });
    expect(groupeUnPourN(L, [piece('P1', 153000, { date: '2026-01-08' })], B)).toEqual({ type: 'aucun' });
  });
  it('autre-contrepartie-ignoree', () => {
    expect(groupeUnPourN(L, base.map((p) => (p.id === 'P2' ? { ...p, contrepartieId: 'k2' } : p)), B)).toEqual({ type: 'aucun' });
  });
  it('ordre-des-pieces-sans-effet', () => {
    const attendu = groupeUnPourN(L, base, B);
    expect(groupeUnPourN(L, [...base].reverse(), B)).toEqual(attendu);
    expect(groupeUnPourN(L, [base[2]!, base[0]!, base[3]!, base[1]!], B)).toEqual(attendu);
  });
  it('bornes-et-cas-limites', () => {
    for (const maxPieces of [0, NaN, Infinity, 1.5, -1, 13]) expect(() => groupeUnPourN(L, base, { ...B, maxPieces })).toThrow('bornes_invalides');
    for (const fenetreJours of [NaN, -1, 1.5]) expect(() => groupeUnPourN(L, base, { ...B, fenetreJours })).toThrow('bornes_invalides');
    expect(groupeUnPourN(L, base, { ...B, maxPieces: 12 }).type).toBe('proposee');
    expect(() => groupeUnPourN(ligne('L0', 0), base, B)).toThrow('montant_nul');
    expect(groupeUnPourN(L, [], B)).toEqual({ type: 'aucun' });
    expect(groupeUnPourN(L, [piece('P1', 153000, { reste: c(0) })], B)).toEqual({ type: 'aucun' });
    const p0 = piece('P0', 50000, { reste: c(0), date: '2026-02-01' });
    expect(groupeUnPourN(L, [p0, ...base], B)).toEqual({ type: 'proposee', pieces: ['P1', 'P2', 'P3'] });
  });
  it('charge-bornee-explosion-combinatoire', () => {
    const tas = Array.from({ length: 60 }, (_, i) => piece(`Q${String(i).padStart(2, '0')}`, 1));
    const debut = Date.now();
    expect(() => groupeUnPourN(ligne('LC', -100), tas, B)).toThrow('explosion_combinatoire');
    expect(Date.now() - debut).toBeLessThan(5000);
    expect(() => groupeUnPourN(ligne('LC', -100), [...tas, piece('AV', 1, { avoir: true })], B)).toThrow('explosion_combinatoire');
  });
});

describe('groupeNPourUn', () => {
  const p = piece('V40', 300000);
  it('t06-4-deux-paiements-une-facture', () => {
    const ls = [ligne('L2', -200000, '2026-03-20'), ligne('L1', -100000, '2026-03-05')];
    expect(groupeNPourUn(p, ls.slice(1))).toEqual({ lignes: [ls[1]], resteApres: 200000 });
    const r = groupeNPourUn(p, ls);
    expect(r.lignes.map((l) => l.id)).toEqual(['L1', 'L2']);
    expect(r.resteApres).toBe(0);
  });
  it('limites-du-cumul', () => {
    const ls = [ligne('L1', -200000, '2026-03-05'), ligne('L2', -200000, '2026-03-06')];
    expect(groupeNPourUn(p, ls)).toEqual({ lignes: [ls[0]], resteApres: 100000 });
    expect(groupeNPourUn(p, [ligne('L3', -100000, '2026-03-05', { contrepartieId: 'k2' }), ligne('L4', 0)]).lignes).toEqual([]);
    expect(groupeNPourUn(piece('V0', 100000, { reste: c(0) }), ls)).toEqual({ lignes: [], resteApres: 0 });
  });
});

describe('liens', () => {
  it('un-pour-n-propose-meme-groupe', () => {
    const l2 = ligne('L2', -80000);
    const ls = liensUnPourN('g1', l2, [piece('F1', 50000), piece('F2', 30000)], []);
    expect(ls.map((l) => [l.pieceId, l.montantAffecte, l.etat, l.groupeId])).toEqual([['F1', 50000, 'propose', 'g1'], ['F2', 30000, 'propose', 'g1']]);
    expect(resteLigne(l2, ls)).toBe(0);
  });
  it('un-pour-n-refuse-avoir-ligne-sur-affectee', () => {
    expect(() => liensUnPourN('g1', ligne('L2', -80000), [piece('F1', 100000), piece('A1', 20000, { avoir: true })], [])).toThrow('lien_invalide');
  });
  it('un-pour-n-refuse-somme-differente', () => {
    expect(() => liensUnPourN('g1', ligne('L2', -70000), [piece('F1', 100000), piece('A1', 20000, { avoir: true })], [])).toThrow('lien_invalide');
  });
  it('n-pour-un-propose-et-verifie', () => {
    const p = piece('V40', 300000);
    const ls = liensNPourUn('g2', p, [ligne('L1', -100000), ligne('L2', -200000, '2026-03-20')], []);
    expect(ls.map((l) => [l.ligneId, l.montantAffecte, l.groupeId])).toEqual([['L1', 100000, 'g2'], ['L2', 200000, 'g2']]);
    expect(() => liensNPourUn('g2', p, [ligne('L1', -400000)], [])).toThrow('lien_invalide');
  });
});
