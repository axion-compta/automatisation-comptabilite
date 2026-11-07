import { describe, expect, it } from 'vitest';
import { ErreurDivergence, detecterDivergences, fermerAlerte, similaritePointsDeBase } from '../divergences.js';

const SEUIL = 7500;
const piece = (id: string, o: Partial<{ tiersId: string; nature: string; libelle: string; compte: string; statut: 'valide' | 'brouillon' }> = {}) => ({
  id,
  tiersId: 'T1',
  nature: 'facture',
  libelle: 'Abonnement logiciel mensuel',
  compte: '613000',
  statut: 'valide' as const,
  ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurDivergence ? e.code : 'autre';
  }
  return undefined;
};

describe('detecterDivergences', () => {
  it('meme-tiers-comptes-differents-alerte', () => {
    const r = detecterDivergences([piece('p2', { compte: '622000' }), piece('p1', { libelle: 'Abonnement logiciel mensuel.' })], SEUIL);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ pieceA: 'p1', pieceB: 'p2', compteA: '613000', compteB: '622000', gravite: 'M', statut: 'ouverte' });
    expect(r[0]?.similarite).toBeGreaterThanOrEqual(SEUIL);
  });

  it('tiers-differents-aucune-alerte', () => {
    expect(detecterDivergences([piece('p1'), piece('p2', { tiersId: 'T2', compte: '622000' })], SEUIL)).toEqual([]);
  });

  it('nature-differente-ou-libelle-eloigne-aucune-alerte', () => {
    expect(detecterDivergences([piece('p1'), piece('p2', { nature: 'avoir', compte: '622000' })], SEUIL)).toEqual([]);
    expect(detecterDivergences([piece('p1'), piece('p2', { libelle: 'Zzz qqq', compte: '622000' })], SEUIL)).toEqual([]);
  });

  it('meme-compte-aucune-alerte', () => {
    expect(detecterDivergences([piece('p1'), piece('p2')], SEUIL)).toEqual([]);
  });

  it('brouillon-ignore', () => {
    expect(detecterDivergences([piece('p1'), piece('p2', { compte: '622000', statut: 'brouillon' })], SEUIL)).toEqual([]);
  });

  it('paire-unique-sans-doublon', () => {
    const trois = [piece('p1', { compte: '1' }), piece('p2', { compte: '2' }), piece('p3', { compte: '3' })];
    const a = detecterDivergences(trois, SEUIL);
    const b = detecterDivergences([...trois].reverse(), SEUIL);
    expect(a).toHaveLength(3);
    expect(b).toEqual(a);
    expect(detecterDivergences([...trois, trois[0]!], SEUIL)).toHaveLength(3);
  });

  it('seuil-invalide-refuse', () => {
    for (const s of [Number.NaN, -1, 10001, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => detecterDivergences([], s))).toBe('seuil_invalide');
    }
    expect(detecterDivergences([piece('p1'), piece('p2', { compte: '2' })], 10000)).toHaveLength(1);
    expect(detecterDivergences([piece('p1'), piece('p2', { compte: '2' })], 0)).toHaveLength(1);
  });
});

describe('fermerAlerte', () => {
  const alerte = detecterDivergences([piece('p1'), piece('p2', { compte: '2' })], SEUIL)[0]!;

  it('fermeture-sans-motif-refusee', () => {
    expect(code(() => fermerAlerte(alerte, { type: 'voulue', motif: '' }))).toBe('motif_obligatoire');
    expect(code(() => fermerAlerte(alerte, { type: 'voulue', motif: '  \t ' }))).toBe('motif_obligatoire');
  });

  it('fermeture-corrigee-ou-voulue', () => {
    expect(fermerAlerte(alerte, { type: 'corrigee' })).toMatchObject({ statut: 'fermee', fermeture: { type: 'corrigee' } });
    const v = fermerAlerte(alerte, { type: 'voulue', motif: ' Choix assumé ' });
    expect(v.fermeture).toEqual({ type: 'voulue', motif: 'Choix assumé' });
    expect(alerte.statut).toBe('ouverte');
  });
});

describe('similaritePointsDeBase', () => {
  it('similarite-bornes-et-invalides', () => {
    expect(similaritePointsDeBase('', '')).toBe(0);
    expect(similaritePointsDeBase('  ', 'abc')).toBe(0);
    expect(similaritePointsDeBase('Loyer', 'loyer')).toBe(10000);
    expect(similaritePointsDeBase('a', 'a')).toBe(10000);
    expect(similaritePointsDeBase('a', 'b')).toBe(0);
    expect(similaritePointsDeBase('abcd', 'wxyz')).toBe(0);
    expect(similaritePointsDeBase('Été  Café', 'ete cafe')).toBe(10000);
    expect(similaritePointsDeBase('night', 'nacht')).toBe(2500);
  });
});
