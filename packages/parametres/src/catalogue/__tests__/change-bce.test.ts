import { describe, expect, it } from 'vitest';
import { parametreAuJour } from '../../au-jour.js';
import { verifierFrontieres } from '../../frontieres.js';
import { verifierCatalogue } from '../../source.js';
import { CATALOGUE_CHANGE_BCE as C } from '../change-bce.js';

describe('catalogue du change BCE', () => {
  it('catalogue-change-source', () => {
    expect(verifierCatalogue(C)).toEqual([]);
    expect(verifierFrontieres(C, 'FR')).toEqual([]);
    expect(C.map((l) => l.cle)).toEqual(['change.bce.regle']);
    const l = parametreAuJour(C, 'change.bce.regle', 'FR', '2027-03-01');
    expect(l.statut).toBe('a_verifier');
    expect(l.effet_debut).toBe('2026-01-01');
    expect(l.effet_fin).toBeNull();
    expect(l.source).toContain('BCE');
    expect(l.source).toContain('à confirmer');
    expect(JSON.parse(l.valeur)).toEqual({
      heurePublicationUtc: '15:00',
      arrondi: 'demi_loin_de_zero',
      jourSansCotation: 'veille_ouvree',
    });
    expect(() => parametreAuJour(C, 'change.bce.regle', 'FR', '2025-12-31')).toThrow();
  });
});
