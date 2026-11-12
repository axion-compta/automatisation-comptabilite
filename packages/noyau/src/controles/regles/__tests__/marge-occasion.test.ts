import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import type { PieceControlee } from '../commun.js';
import { montantsVidesLegitimes, regleMargeOccasion, tvaDeductibleMarge } from '../marge-occasion.js';

const c = (n: number): Centimes => centimes(n);
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

  it('bien-neuf-non-applicable', () => {
    expect(regle.evaluer({ piece: piece([], 80000, 0, 'bien_neuf') })).toEqual({ resultat: 'NON_APPLICABLE' });
    expect(regleMargeOccasion(MENTIONS, []).evaluer({ piece: piece([], 80000, 0) })).toEqual({ resultat: 'NON_APPLICABLE' });
  });
});
