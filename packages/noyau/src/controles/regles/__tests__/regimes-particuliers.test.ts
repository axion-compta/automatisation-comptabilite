import { describe, expect, it } from 'vitest';
import { centimes, type Arrondi, type Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import type { LignePiece, PieceControlee } from '../commun.js';
import {
  autoliquidationBatiment,
  normaliser,
  regleCCT10,
  regleCCT11,
  regleCCT15,
  type MentionsReconnues,
} from '../regimes-particuliers.js';

const c = (n: number): Centimes => centimes(n);
const M: MentionsReconnues = {
  marge: ['TVA sur la marge'],
  autoliquidation: ['Autoliquidation'],
  exoneration: ['Exonération de TVA'],
};
const ligne = (ht: number, tva: number, taux = 2000): LignePiece => ({
  taux,
  nature: 'bien',
  ht: c(ht),
  tva: c(tva),
  ttc: c(ht + tva),
});
const piece = (mentions: string[], tva: number, taux = 2000, sens: 'achat' | 'vente' = 'achat'): PieceControlee => ({
  id: 'p1',
  sens,
  date: '2026-01-10',
  lignes: [ligne(300000, tva, taux)],
  totaux: { ht: c(300000), tva: c(tva), ttc: c(300000 + tva) },
  mentions,
});
const t10 = regleCCT10(M);
const t11 = regleCCT11(M);
const t15 = regleCCT15(M);
const invalide = expect.objectContaining({ code: 'entree_invalide' });

describe('CC-T10, CC-T11 et CC-T15 régimes particuliers', () => {
  it('CT-27', () => {
    const marge = piece(['Véhicule d’occasion - TVA sur la marge'], 0);
    expect(t10.evaluer({ piece: marge, confirme: false })).toEqual({ resultat: 'ALERTE', valeur: 'A_VERIFIER' });
    expect(t10.evaluer({ piece: marge, confirme: true })).toEqual({ resultat: 'OK', valeur: 'MARGE' });
    expect(t10).toMatchObject({ id: 'CC-T10', version: 1, gravite: 'M', bloque: [], actif: true });
    const exoneree = piece(['Exonération de TVA'], 2000);
    expect(t15.evaluer({ piece: exoneree })).toEqual({ resultat: 'ALERTE', valeur: 'exoneration_avec_tva' });
    expect(t15.evaluer({ piece: piece(['Exonération de TVA'], 0, 0) })).toEqual({ resultat: 'OK' });
    expect(t15).toMatchObject({ id: 'CC-T15', version: 1, gravite: 'M', bloque: [], actif: true });
    for (const r of [t10, t11, t15]) expect(r.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
  });

  it('CT-28', () => {
    const taux = 2000;
    expect(autoliquidationBatiment(c(300000), taux, 'demi-superieur')).toEqual({
      collectee: c(60000),
      deductible: c(60000),
      net: 0,
    });
    expect(autoliquidationBatiment(c(1), taux, 'superieur')).toEqual({ collectee: c(1), deductible: c(1), net: 0 });
    expect(autoliquidationBatiment(c(1), taux, 'inferieur').collectee).toBe(0);
    expect(autoliquidationBatiment(c(0), 0, 'demi-pair')).toEqual({ collectee: c(0), deductible: c(0), net: 0 });
    expect(autoliquidationBatiment(c(-300000), taux, 'demi-superieur').collectee).toBe(-60000);
  });

  it('mention-normalisee', () => {
    expect(normaliser('  ÉxonérAtion DE TVA ')).toBe('exoneration de tva');
    expect(t10.evaluer({ piece: piece(['TVA SUR LA MARGE'], 0), confirme: false }).resultat).toBe('ALERTE');
    expect(t10.evaluer({ piece: piece(['tva sur la marge (art. fictif)'], 0), confirme: false }).resultat).toBe(
      'ALERTE',
    );
    expect(t11.evaluer({ piece: piece(['AUTOLIQUIDATION'], 100) }).resultat).toBe('ALERTE');
    expect(t15.evaluer({ piece: piece(['EXONERATION DE TVA'], 100) }).resultat).toBe('ALERTE');
    const sansListe = regleCCT10({ marge: ['', '  '], autoliquidation: [], exoneration: [] });
    expect(sansListe.evaluer({ piece: piece(['TVA sur la marge'], 0), confirme: false }).resultat).toBe(
      'NON_APPLICABLE',
    );
  });

  it('sans-mention-non-applicable', () => {
    expect(t10.evaluer({ piece: piece([], 0), confirme: false })).toEqual({ resultat: 'NON_APPLICABLE' });
    expect(t10.evaluer({ piece: piece(['autre'], 0), confirme: true })).toEqual({ resultat: 'NON_APPLICABLE' });
    expect(t11.evaluer({ piece: piece([], 0) })).toEqual({ resultat: 'OK' });
    expect(t11.evaluer({ piece: piece([], 100) })).toEqual({ resultat: 'OK' });
    expect(t15.evaluer({ piece: piece([], 100) })).toEqual({ resultat: 'OK' });
  });

  it('autoliquidation-avec-tva-facturee', () => {
    expect(t11.evaluer({ piece: piece(['Autoliquidation'], 60000) })).toEqual({ resultat: 'ALERTE', valeur: 'TVA-C03' });
    expect(t11.evaluer({ piece: piece(['Autoliquidation'], 1) })).toEqual({ resultat: 'ALERTE', valeur: 'TVA-C03' });
    expect(t11.evaluer({ piece: piece(['Autoliquidation'], 0) })).toEqual({ resultat: 'OK' });
    expect(t11).toMatchObject({ id: 'CC-T11', version: 1, gravite: 'M', bloque: [], actif: true });
    const bad = { ...piece(['Autoliquidation'], 0), totaux: { ht: c(1), tva: Number.NaN as Centimes, ttc: c(1) } };
    expect(() => t11.evaluer({ piece: bad })).toThrow(invalide);
    const trace = executerControles([t11], [{ type: 'achat', id: 'x', donnee: { piece: bad } }], 'arrivee', 'h');
    expect(trace[0]?.resultat).toBe('IMPOSSIBLE');
  });

  it('taux-zero-sans-mention', () => {
    expect(t15.evaluer({ piece: piece([], 0, 0) })).toEqual({ resultat: 'ALERTE', valeur: 'taux_zero_sans_mention' });
    expect(t15.evaluer({ piece: piece(['Exonération de TVA'], 0, 0) })).toEqual({ resultat: 'OK' });
    expect(t15.evaluer({ piece: piece([], 0, 1) })).toEqual({ resultat: 'OK' });
    for (const mention of ['Autoliquidation', 'TVA sur la marge']) {
      expect(t15.evaluer({ piece: piece([mention], 0, 0) })).toEqual({ resultat: 'OK' });
    }
    const mixte = piece([], 0);
    const deux = { ...mixte, lignes: [ligne(1, 0, 2000), ligne(1, 0, 0)] };
    expect(t15.evaluer({ piece: deux }).valeur).toBe('taux_zero_sans_mention');
    expect(t15.evaluer({ piece: { ...deux, lignes: [...deux.lignes].reverse() } }).valeur).toBe('taux_zero_sans_mention');
    expect(t15.evaluer({ piece: { ...deux, lignes: [] } })).toEqual({ resultat: 'OK' });
    const taux = { ...mixte, lignes: [ligne(1, 0, 1.5)] };
    expect(() => t15.evaluer({ piece: taux })).toThrow(invalide);
    const ttcBad = { ...mixte, lignes: [{ ...ligne(1, 0), tva: Number.POSITIVE_INFINITY as Centimes }] };
    expect(() => t15.evaluer({ piece: ttcBad })).toThrow(invalide);
  });

  it('client-ue-numero-valide', () => {
    const vente = (tva: number) => piece([], tva, 2000, 'vente');
    expect(t15.evaluer({ piece: vente(100), clientUeNumeroValide: true })).toEqual({
      resultat: 'ALERTE',
      valeur: 'tva_francaise_client_ue',
    });
    expect(t15.evaluer({ piece: vente(100), clientUeNumeroValide: false })).toEqual({ resultat: 'OK' });
    expect(t15.evaluer({ piece: vente(100) })).toEqual({ resultat: 'OK' });
    expect(t15.evaluer({ piece: vente(0), clientUeNumeroValide: true })).toEqual({ resultat: 'OK' });
    expect(t15.evaluer({ piece: piece([], 100), clientUeNumeroValide: true })).toEqual({ resultat: 'OK' });
  });

  it('autoliquidation-taux-invalide', () => {
    for (const taux of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => autoliquidationBatiment(c(100), taux, 'demi-superieur')).toThrow(invalide);
    }
    for (const ht of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(() => autoliquidationBatiment(ht as Centimes, 2000, 'demi-superieur')).toThrow(invalide);
    }
    expect(autoliquidationBatiment(c(100), 0, 'demi-superieur').collectee).toBe(0);
  });

  it('net-toujours-nul', () => {
    const modes: Arrondi[] = ['demi-superieur', 'demi-pair', 'inferieur', 'superieur'];
    let graine = 12345;
    const suivant = (): number => {
      graine = (graine * 48271) % 2147483647;
      return graine;
    };
    for (let i = 0; i < 1000; i++) {
      const ht = c((suivant() % 20000001) - 10000000);
      const taux = suivant() % 10001;
      const r = autoliquidationBatiment(ht, taux, modes[i % modes.length] as Arrondi);
      expect(r.net).toBe(0);
      expect(r.collectee).toBe(r.deductible);
    }
  });
});
