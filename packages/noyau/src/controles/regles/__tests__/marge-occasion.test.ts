import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { PieceControlee } from '../commun.js';
import { montantsVidesLegitimes, regleMargeOccasion, tvaDeductibleMarge } from '../marge-occasion.js';

// Sans contrôle, pour pouvoir fabriquer des montants invalides (NaN, Infinity, 1.5).
const c = (n: number): Centimes => n as Centimes;
const MENTIONS = ['TVA sur la marge'];
const OCCASION = ['bien_occasion'];
const piece = (mentions: string[], ht: number, tva: number, nature = 'bien_occasion'): PieceControlee => ({
  id: 'p1',
  sens: 'achat',
  date: '2026-01-10',
  lignes: [{ taux: tva === 0 ? 0 : 2000, nature, ht: c(ht), tva: c(tva), ttc: c(ht + tva) }],
  totaux: { ht: c(ht), tva: c(tva), ttc: c(ht + tva) },
  mentions,
});
const regle = regleMargeOccasion(MENTIONS, OCCASION);

describe('TVA sur marge', () => {
  it('occasion-80000-sans-tva-ni-mention-carte', () => {
    expect(regle.evaluer({ piece: piece([], 80000, 0) })).toEqual({ resultat: 'ALERTE', valeur: 'marge_a_tort_ou_oubliee' });
    expect(regle).toMatchObject({ gravite: 'M', bloque: [], actif: true });
    // Mention sans rapport : toujours une carte.
    expect(regle.evaluer({ piece: piece(['Merci de votre confiance'], 80000, 0) })).toMatchObject({ resultat: 'ALERTE' });
    // Bien d'occasion avec TVA normale : pas de carte.
    expect(regle.evaluer({ piece: piece([], 80000, 16000) })).toEqual({ resultat: 'OK' });
  });

  it('occasion-avec-mention-zero-carte', () => {
    const p = piece(['Bien d’occasion - Tva sur la marge'], 80000, 0);
    expect(regle.evaluer({ piece: p })).toEqual({ resultat: 'OK', valeur: 'MARGE' });
    // Accents et casse ignorés.
    expect(regleMargeOccasion(['Régime de la marge'], OCCASION).evaluer({ piece: piece(['REGIME DE LA MARGE'], 80000, 0) })).toMatchObject({
      resultat: 'OK',
    });
  });

  it('mention-lue-tva-deductible-zero', () => {
    // TVA lue 16 000 malgré la mention : rien n'est déduit, la pièce reste à vérifier.
    const p = piece(['TVA sur la marge'], 80000, 16000);
    expect(tvaDeductibleMarge(p, MENTIONS)).toBe(0);
    expect(tvaDeductibleMarge(piece(['TVA sur la marge'], 80000, 0), MENTIONS)).toBe(0);
    // Sans mention lue, cette fonction ne décide rien.
    expect(tvaDeductibleMarge(piece([], 80000, 16000), MENTIONS)).toBeUndefined();
  });

  it('mention-lue-montants-vides-legitimes', () => {
    expect(montantsVidesLegitimes(piece(['TVA sur la marge'], 0, 0), MENTIONS)).toBe(true);
    expect(montantsVidesLegitimes(piece([], 0, 0), MENTIONS)).toBe(false);
    // Une mention vide dans la liste des mentions reconnues ne reconnaît rien.
    expect(montantsVidesLegitimes(piece(['x'], 0, 0), [''])).toBe(false);
  });

  it('facture-mixte-sans-mention-carte-quel-que-soit-lordre', () => {
    const occ = { taux: 0, nature: 'bien_occasion', ht: c(80000), tva: c(0), ttc: c(80000) };
    const neuf = { taux: 2000, nature: 'bien_neuf', ht: c(10000), tva: c(2000), ttc: c(12000) };
    const mixte = (lignes: PieceControlee['lignes']): PieceControlee => ({
      ...piece([], 90000, 2000),
      lignes,
    });
    const attendu = { resultat: 'ALERTE', valeur: 'marge_a_tort_ou_oubliee' };
    expect(regle.evaluer({ piece: mixte([occ, neuf]) })).toEqual(attendu);
    expect(regle.evaluer({ piece: mixte([neuf, occ]) })).toEqual(attendu);
    // Deux lignes d'occasion, une seule à 0 de TVA : carte (et non « toutes »).
    const occTva = { ...occ, taux: 2000, tva: c(16000), ttc: c(96000) };
    expect(regle.evaluer({ piece: mixte([occTva, occ]) })).toEqual(attendu);
    expect(regle.evaluer({ piece: mixte([occ, occTva]) })).toEqual(attendu);
  });

  it('nature-normalisee-casse-et-accents', () => {
    const r = regleMargeOccasion(MENTIONS, ['Bien d’Occasion Rénové']);
    expect(r.evaluer({ piece: piece([], 80000, 0, 'BIEN D’OCCASION RENOVE') })).toMatchObject({ resultat: 'ALERTE' });
    // Et côté pièce : nature reçue accentuée, nature réglée sans accent.
    expect(regleMargeOccasion(MENTIONS, ['bien renove']).evaluer({ piece: piece([], 80000, 0, 'Bien Rénové') })).toMatchObject({
      resultat: 'ALERTE',
    });
  });

  it('montants-invalides-levent-et-piece-sans-ligne-non-applicable', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(() => regle.evaluer({ piece: piece([], 80000, mauvais) })).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
      expect(() => regle.evaluer({ piece: piece(['TVA sur la marge'], 80000, mauvais) })).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
      expect(() => tvaDeductibleMarge(piece(['TVA sur la marge'], 80000, mauvais), MENTIONS)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
      expect(() => tvaDeductibleMarge(piece(['TVA sur la marge'], mauvais, 0), MENTIONS)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    }
    expect(regle.evaluer({ piece: { ...piece([], 0, 0), lignes: [] } })).toEqual({ resultat: 'NON_APPLICABLE' });
  });

  it('bien-neuf-non-applicable', () => {
    expect(regle.evaluer({ piece: piece([], 80000, 0, 'bien_neuf') })).toEqual({ resultat: 'NON_APPLICABLE' });
    expect(regleMargeOccasion(MENTIONS, []).evaluer({ piece: piece([], 80000, 0) })).toEqual({ resultat: 'NON_APPLICABLE' });
  });
});
