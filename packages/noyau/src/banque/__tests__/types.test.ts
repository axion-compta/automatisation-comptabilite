import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { estComptable, ETATS_RAPPROCHEMENT, verifierLigneBancaire } from '../types.js';
import type { EtatTechnique, LigneBancaire } from '../types.js';

const c = (n: number): Centimes => n as Centimes;
const base: LigneBancaire = {
  id: 'l1', societeId: 's1', compteId: 'c1', releveId: 'r1', rang: 0, dateOperation: '2026-02-28', montant: c(-1250), devise: 'EUR',
  libelleBrut: 'CARTE ATELIER DUPONT', moyen: 'carte', etatTechnique: 'completee', etatRapprochement: 'SANS_PIECE',
};
const codes = (m: Partial<LigneBancaire>): string[] => verifierLigneBancaire({ ...base, ...m });

describe('types communs du bloc banque', () => {
  it('seule-completee-est-comptable', () => {
    const etats: Array<[EtatTechnique, boolean]> = [['completee', true], ['en_attente', false], ['refusee', false], ['annulee', false], ['extournee', false], ['rejetee', false]];
    for (const [etat, attendu] of etats) expect(estComptable({ etatTechnique: etat })).toBe(attendu);
  });

  it('neuf-etats-sans-ok', () => {
    expect([...ETATS_RAPPROCHEMENT]).toEqual(['RAPPROCHEE', 'PROPOSEE', 'DOUTEUSE', 'SANS_PIECE', 'A_QUALIFIER', 'SANS_PIECE_REQUISE', 'NEUTRALISEE', 'PERSO', 'IGNOREE']);
    expect(ETATS_RAPPROCHEMENT.map((e) => e.toLowerCase())).not.toContain('ok');
    expect(ETATS_RAPPROCHEMENT.map((e) => e.toLowerCase())).not.toContain('valide');
  });

  it('ligne-valide-aucun-code', () => {
    expect(codes({})).toEqual([]);
    expect(codes({ montant: c(0), rang: 0, dateValeur: '2026-03-01', montantOrigine: c(1100), deviseOrigine: 'USD' })).toEqual([]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5, 2 ** 53, -(2 ** 53)])('montant-invalide %s', (m) => {
    expect(codes({ montant: c(m) })).toEqual(['montant_invalide']);
  });

  it.each(['eur', 'EURO', '', 'EU', 'E1R'])('devise-invalide %j', (d) => {
    expect(codes({ devise: d })).toEqual(['devise_invalide']);
  });

  it.each(['2026-02-30', '2026-13-01', ''])('date-invalide %j', (d) => {
    expect(codes({ dateOperation: d })).toEqual(['date_invalide']);
    expect(codes({ dateValeur: d })).toEqual(['date_invalide']);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rang-invalide %s', (r) => {
    expect(codes({ rang: r })).toEqual(['rang_invalide']);
  });

  it('origine-incomplete', () => {
    expect(codes({ montantOrigine: c(100) })).toEqual(['origine_incomplete']);
    expect(codes({ deviseOrigine: 'USD' })).toEqual(['origine_incomplete']);
  });

  it('codes-cumules', () => {
    expect(codes({ montant: c(Number.NaN), devise: 'x', dateOperation: '', rang: -1, deviseOrigine: 'USD' })).toEqual([
      'montant_invalide', 'devise_invalide', 'date_invalide', 'rang_invalide', 'origine_incomplete',
    ]);
  });
});
