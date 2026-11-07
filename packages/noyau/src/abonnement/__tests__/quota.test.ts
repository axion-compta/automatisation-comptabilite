import { describe, expect, it } from 'vitest';
import { etatQuota, libererAttenteVolume, plafondTechniqueAtteint } from '../quota.js';
import type { PieceEnAttente } from '../pieces.js';
import { ErreurAbonnement } from '../types.js';

const COMPRIS = 100;
const emp = (c: string): string => c.repeat(64);
const piece = (id: string, c: string, heure: number): PieceEnAttente => ({
  id,
  societe: 'Societe Test',
  empreinte: emp(c),
  recueLe: '2030-01-01T' + String(heure).padStart(2, '0') + ':00:00Z',
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement ? e.code : 'autre';
  }
  return undefined;
};

describe('quota atteint et plafond technique', () => {
  it('cent-unieme-continuer-traitee-et-choix', () => {
    const r = etatQuota({ dejaTraitees: COMPRIS, compris: COMPRIS, comportement: 'continuer' });
    expect(r).toEqual({ depasse: true, enAttenteVolume: false, proposerChoix: true });
  });

  it('cent-unieme-attente-en-attente-de-volume', () => {
    const r = etatQuota({ dejaTraitees: COMPRIS, compris: COMPRIS, comportement: 'attente' });
    expect(r).toEqual({ depasse: true, enAttenteVolume: true, proposerChoix: true });
  });

  it('centieme-pas-encore-depasse', () => {
    for (const comportement of ['continuer', 'attente'] as const) {
      const r = etatQuota({ dejaTraitees: COMPRIS - 1, compris: COMPRIS, comportement });
      expect(r).toEqual({ depasse: false, enAttenteVolume: false, proposerChoix: false });
    }
  });

  it('comportement-inconnu-continuer', () => {
    const attendu = { depasse: true, enAttenteVolume: false, proposerChoix: true };
    expect(etatQuota({ dejaTraitees: COMPRIS, compris: COMPRIS })).toEqual(attendu);
    expect(etatQuota({ dejaTraitees: COMPRIS, compris: COMPRIS, comportement: 'autre' })).toEqual(attendu);
  });

  it('plafond-atteint-egal-et-au-dessus', () => {
    const plafond = 5000;
    expect(plafondTechniqueAtteint(plafond - 1, plafond)).toBe(false);
    expect(plafondTechniqueAtteint(plafond, plafond)).toBe(true);
    expect(plafondTechniqueAtteint(plafond + 1, plafond)).toBe(true);
  });

  it('plafond-zero-tout-arrete', () => {
    expect(plafondTechniqueAtteint(0, 0)).toBe(true);
    expect(plafondTechniqueAtteint(1, 0)).toBe(true);
  });

  it('liberation-ordre-d-arrivee', () => {
    const file = [piece('c', 'c', 12), piece('a', 'a', 8), piece('b', 'b', 10), piece('d', 'a', 11)];
    for (const motif of ['nouveau_mois', 'nouveau_palier'] as const) {
      const r = libererAttenteVolume(file, new Set(), motif);
      expect(r.aTraiter.map((p) => p.id)).toEqual(['a', 'b', 'c']);
      expect(r.doublons).toEqual(['d']);
    }
    const deja = new Set(['Societe Test:' + emp('b')]);
    expect(libererAttenteVolume(file, deja, 'nouveau_mois').doublons).toContain('b');
  });

  it('entrees-invalides-refusees', () => {
    const q = (dejaTraitees: number, compris: number): string | undefined =>
      code(() => etatQuota({ dejaTraitees, compris, comportement: 'continuer' }));
    expect(q(0, 0)).toBe('palier_invalide');
    expect(q(0, -1)).toBe('palier_invalide');
    expect(q(0, 1.5)).toBe('palier_invalide');
    expect(q(0, Number.NaN)).toBe('palier_invalide');
    expect(q(0, Number.POSITIVE_INFINITY)).toBe('palier_invalide');
    expect(q(-1, 1)).toBe('entier_invalide');
    expect(q(1.5, 1)).toBe('entier_invalide');
    expect(q(Number.NaN, 1)).toBe('entier_invalide');
    expect(q(Number.POSITIVE_INFINITY, 1)).toBe('entier_invalide');
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 0.5, -1]) {
      expect(code(() => plafondTechniqueAtteint(mauvais, 1))).toBe('entier_invalide');
      expect(code(() => plafondTechniqueAtteint(1, mauvais))).toBe('entier_invalide');
    }
    expect(code(() => libererAttenteVolume([], new Set(), 'inconnu' as never))).toBe('parametre_invalide');
    expect(code(() => libererAttenteVolume([], new Set(), undefined as never))).toBe('parametre_invalide');
  });
});
