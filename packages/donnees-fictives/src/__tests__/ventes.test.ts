import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { genererVentes, serialiserVentes, type JeuVentes, type PieceVenteFictive } from '../ventes.js';

const EMPREINTE = '4a37e3421ee0e508660ee6e71d3bf0dd9f9229bc4d1da79cb7262f6b0dc21ae3';
const jeu = genererVentes();
const pleine = jeu.societes.find((s) => s.profil === 'pleine');
if (!pleine) throw new Error('profil pleine manquant');
const pieces = pleine.pieces;
const sha = (j: JeuVentes): string => createHash('sha256').update(serialiserVentes(j)).digest('hex');

// Miroir de la priorité de etatAffiche (L10-T22), sans importer le noyau.
function etat(p: PieceVenteFictive): string {
  if (p.statut === 'doublon') return 'doublon';
  if (p.statut === 'a_verifier') return 'a_relire';
  if (p.enLitige) return 'en_litige';
  if (p.statutEcriture !== 'valide') return 'proposee';
  if (p.resteDuCentimes === 0) return 'payee';
  if (p.echeance !== undefined && p.echeance < jeu.dateReference) return 'en_retard';
  return p.lettrage === 'partiel' ? 'payee_en_partie' : 'a_encaisser';
}

describe('données de ventes fictives', () => {
  it('meme-graine-meme-empreinte', () => {
    expect(sha(jeu)).toBe(EMPREINTE);
    expect(sha(genererVentes())).toBe(sha(jeu));
    expect(sha(genererVentes(1))).not.toBe(sha(jeu));
  });

  it('huit-etats-presents', () => {
    expect(pieces.length).toBeGreaterThanOrEqual(36);
    expect(new Set(pieces.map(etat))).toEqual(new Set(['a_relire', 'proposee', 'a_encaisser', 'payee_en_partie', 'en_retard', 'payee', 'en_litige', 'doublon']));
    expect(pieces.some((p) => p.type === 'avoir' && p.factureOrigineId !== undefined)).toBe(true);
    expect(pieces.some((p) => p.type === 'avoir' && p.factureOrigineId === undefined)).toBe(true);
    const acompte = pieces.find((p) => p.type === 'facture_acompte');
    expect(pieces.some((p) => p.factureOrigineId === acompte?.id)).toBe(true);
    expect(pieces.some((p) => p.statut === 'doublon' && p.origine === 'email')).toBe(true);
    expect(pieces.some((p) => p.lettrage === 'partiel' && p.resteDuCentimes > 0 && p.resteDuCentimes < p.ttcCentimes)).toBe(true);
  });

  it('ht-plus-tva-egal-ttc-sauf-cas-a1-voulu', () => {
    for (const p of pieces) {
      for (const n of [p.htCentimes, p.tvaCentimes, p.ttcCentimes, p.resteDuCentimes]) expect(Number.isInteger(n)).toBe(true);
      const somme = p.lignes.reduce((t, l) => t + l.htCentimes, 0);
      expect(somme).toBe(p.htCentimes);
      expect(p.ttcCentimes === p.htCentimes + p.tvaCentimes).toBe(!p.cartes.includes('A1'));
    }
    expect(pieces.filter((p) => p.cartes.includes('A1'))).toHaveLength(1);
  });

  it('numeros-de-clients-uniques', () => {
    const codes = pleine.clients.map((c) => c.code);
    expect(codes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(codes).size).toBe(codes.length);
    expect(pleine.clients.find((c) => c.nom === 'Immobilière Marceau')?.siren).toBe('987654324');
    expect(pleine.clients.find((c) => c.nom === 'Paul Marceau')?.nature).toBe('particulier');
    for (const p of pieces) if (p.clientCode !== undefined) expect(codes).toContain(p.clientCode);
  });

  it('trou-de-serie-present', () => {
    const nums = pieces.filter((p) => p.numero.startsWith('FA-2026-')).map((p) => Number(p.numero.slice(-4)));
    const max = Math.max(...nums);
    const manquants = Array.from({ length: max }, (_, i) => i + 1).filter((n) => !nums.includes(n));
    expect(manquants).toEqual([17]);
    const memeNumero = pieces.filter((p) => p.numero === 'FA-2026-0001');
    expect(new Set(memeNumero.map((p) => p.htCentimes)).size).toBeGreaterThanOrEqual(2);
  });

  it('profil-vide-sans-piece', () => {
    const vides = jeu.societes.filter((s) => s.profil === 'vide');
    expect(vides.length).toBeGreaterThanOrEqual(1);
    for (const s of vides) expect(s.pieces).toEqual([]);
    expect(jeu.societes.map((s) => s.nom)).toEqual(['Lemoine Rénovation', 'Boulangerie Rivoire', 'Atelier Bertin']);
  });

  it('aucun-taux-reel', () => {
    const taux = new Set(pieces.flatMap((p) => p.lignes.map((l) => l.tauxPdb)));
    expect([...taux].sort((a, b) => a - b)).toEqual([600, 900, 1900]);
    const texte = serialiserVentes(jeu);
    expect(texte).not.toMatch(/@(?!exemple\.fr)/);
    expect(texte).not.toMatch(/[A-Z]{2}\d{2}[ ]?\d{4}/);
  });

  it('date-de-reference-fixe', () => {
    expect(jeu.dateReference).toBe('2026-06-30');
    expect(genererVentes(7).dateReference).toBe(jeu.dateReference);
    expect(jeu.version).toBe(1);
  });
});
