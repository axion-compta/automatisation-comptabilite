import { describe, expect, it } from 'vitest';
import {
  aVerifier,
  classeNFoisSurM,
  dividendeGerantBloque,
  formaterCentimes,
  formaterDate,
  formaterTauxE8,
  libelleSens,
  liberationInsuffisante,
  modeleAFaireValider,
  phraseEcartChange,
  soldeBanqueImpossible,
} from '../messages.js';

const PIECE = { tauxE8: 92000000, source: 'taux de test, source fictive', date: '2026-10-07' };
const PAIEMENT = { tauxE8: 95000000, source: 'taux de test, source fictive', date: '2026-11-20' };
const NBSP = ' ';
const FINE = ' ';

// Mots interdits assemblés par morceaux, comme outils/gardes/textes.mjs.
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) =>
  p.join(''),
);

const phrases = (): string[] => [
  phraseEcartChange({ sens: 'perte', montant: 1800, tauxPiece: PIECE, tauxPaiement: PAIEMENT }),
  phraseEcartChange({ sens: 'gain', montant: 123456789, tauxPiece: PIECE, tauxPaiement: PAIEMENT }),
  phraseEcartChange({ sens: 'aucun', montant: 0, tauxPiece: PIECE, tauxPaiement: PAIEMENT }),
  libelleSens('gain'),
  libelleSens('perte'),
  dividendeGerantBloque,
  modeleAFaireValider,
  aVerifier,
  liberationInsuffisante(123456),
  classeNFoisSurM(3, 4),
  soldeBanqueImpossible(656000),
];

describe('messages du moteur', () => {
  it('phrase-perte-exacte', () => {
    expect(phraseEcartChange({ sens: 'perte', montant: 1800, tauxPiece: PIECE, tauxPaiement: PAIEMENT })).toBe(
      `Perte de change de 18,00${NBSP}€ : la facture a été enregistrée au taux de 0,92000000 (taux de test, source fictive, 07/10/2026) et payée à 0,95000000 (taux de test, source fictive, 20/11/2026).`,
    );
  });

  it('phrase-gain', () => {
    const base = { tauxPiece: PIECE, tauxPaiement: PAIEMENT };
    expect(phraseEcartChange({ sens: 'gain', montant: -1800, ...base })).toBe(
      `Gain de change de 18,00${NBSP}€ : la facture a été enregistrée au taux de 0,92000000 (taux de test, source fictive, 07/10/2026) et payée à 0,95000000 (taux de test, source fictive, 20/11/2026).`,
    );
    expect(phraseEcartChange({ sens: 'perte', montant: -1800, ...base })).toMatch(/^Perte de change de 18,00/);
    expect(phraseEcartChange({ sens: 'aucun', montant: 0, ...base })).toBe('Aucun écart de change.');
    expect(libelleSens('gain')).toBe('Gain de change');
    expect(libelleSens('perte')).toBe('Perte de change');
    expect(libelleSens('aucun')).toBe('Aucun écart de change');
  });

  it('taux-huit-decimales', () => {
    expect(formaterTauxE8(1)).toBe('0,00000001');
    expect(formaterTauxE8(123456789)).toBe('1,23456789');
    expect(formaterTauxE8(100000000)).toBe('1,00000000');
    expect(formaterTauxE8(0)).toBe('0,00000000');
    expect(formaterTauxE8(12345678901)).toBe('123,45678901');
  });

  it('date-reformatee', () => {
    expect(formaterDate('2026-10-07')).toBe('07/10/2026');
    expect(formaterDate('2028-02-29')).toBe('29/02/2028');
    expect(() => formaterDate('2026-02-29')).toThrow();
    expect(formaterCentimes(1800)).toBe(`18,00${NBSP}€`);
    expect(formaterCentimes(123456)).toBe(`1${FINE}234,56${NBSP}€`);
    expect(formaterCentimes(5)).toBe(`0,05${NBSP}€`);
    expect(formaterCentimes(-5)).toBe(`−0,05${NBSP}€`);
    expect(formaterCentimes(100000000)).toBe(`1${FINE}000${FINE}000,00${NBSP}€`);
  });

  it('classe-n-fois-sur-m', () => {
    expect(classeNFoisSurM(3, 4)).toBe('Classé 3 fois sur 4');
    expect(classeNFoisSurM(0, 1)).toBe('Classé 0 fois sur 1');
    expect(() => classeNFoisSurM(5, 4)).toThrow();
    expect(() => classeNFoisSurM(-1, 4)).toThrow();
    expect(() => classeNFoisSurM(0, 0)).toThrow();
    expect(liberationInsuffisante(123456)).toBe(`Libération insuffisante : il manque 1${FINE}234,56${NBSP}€.`);
    expect(aVerifier).toBe('À vérifier');
    expect(modeleAFaireValider).toBe('Modèle à faire valider');
    expect(dividendeGerantBloque).toContain(
      "cotisations sociales dues sur l'excédent : à voir avec votre expert-comptable",
    );
  });

  it('entrees-invalides', () => {
    for (const v of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => formaterTauxE8(v)).toThrow();
      expect(() => formaterCentimes(v)).toThrow();
      expect(() => liberationInsuffisante(v)).toThrow();
      expect(() => soldeBanqueImpossible(v)).toThrow();
      expect(() => classeNFoisSurM(v, 4)).toThrow();
      expect(() => classeNFoisSurM(1, v)).toThrow();
      expect(() => phraseEcartChange({ sens: 'perte', montant: v, tauxPiece: PIECE, tauxPaiement: PAIEMENT })).toThrow();
    }
    expect(() => formaterTauxE8(-1)).toThrow();
    for (const d of ['2026-13-01', '2026-00-10', '2026-01-32', '2026-1-1', '', '07/10/2026']) {
      expect(() => formaterDate(d)).toThrow();
    }
    expect(() =>
      phraseEcartChange({ sens: 'perte', montant: 1, tauxPiece: { ...PIECE, date: '2026-13-01' }, tauxPaiement: PAIEMENT }),
    ).toThrow();
    expect(() => phraseEcartChange({ sens: 'bizarre' as never, montant: 1, tauxPiece: PIECE, tauxPaiement: PAIEMENT })).toThrow();
  });

  it('aucun-mot-interdit', () => {
    for (const p of phrases()) {
      for (const mot of INTERDITS) expect(p.toLowerCase()).not.toContain(mot.toLowerCase());
      expect(p).not.toMatch(/%/);
    }
  });

  it('aucun-numero-de-compte', () => {
    for (const p of phrases()) expect(p).not.toMatch(/(?<![\d,])\d{6}(?![\d])/);
    expect(phrases()[1]).toContain(`1${FINE}234${FINE}567,89`);
  });
});
