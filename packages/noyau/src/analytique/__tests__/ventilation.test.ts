import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ajouterVersion, ventilerParMontants, ventilerParPoids, type Section } from '../ventilation.js';

const SECTIONS: Section[] = [
  { id: 'S1', actif: true },
  { id: 'S2', actif: true },
  { id: 'S3', actif: true },
  { id: 'S9', actif: false },
];
const LIGNE = { id: 'L1', compte: '606000', montant: 100001 };
const montants = (v: { parts: readonly { montant: number }[] }): number[] => v.parts.map((p) => p.montant);

describe('ventilation', () => {
  it('trois-parts-egales-plus-fort-reste', () => {
    const v = ventilerParPoids(LIGNE, [{ sectionId: 'S1', poids: 1 }, { sectionId: 'S2', poids: 1 }, { sectionId: 'S3', poids: 1 }], SECTIONS);
    expect(montants(v)).toEqual([33334, 33334, 33333]);
    expect(v.parts.map((p) => p.sectionId)).toEqual(['S1', 'S2', 'S3']);
    expect(v.ligneId).toBe('L1');
  });

  it('montants-somme-differente-refusee', () => {
    const l = { id: 'L2', compte: '607000', montant: 80000 };
    expect(() => ventilerParMontants(l, [{ sectionId: 'S1', montant: 70000 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'somme_differente' }),
    );
    expect(() => ventilerParMontants(l, [{ sectionId: 'S1', montant: 50000 }, { sectionId: 'S2', montant: 30001 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'somme_differente' }),
    );
    const ok = ventilerParMontants(l, [{ sectionId: 'S1', montant: 50000 }, { sectionId: 'S2', montant: 30000 }], SECTIONS);
    expect(montants(ok)).toEqual([50000, 30000]);
  });

  it('classe-non-ventilable', () => {
    for (const compte of ['411000', '512000', '', '1']) {
      expect(() => ventilerParPoids({ ...LIGNE, compte }, [{ sectionId: 'S1', poids: 1 }], SECTIONS)).toThrow(
        expect.objectContaining({ code: 'classe_non_ventilable' }),
      );
    }
    expect(montants(ventilerParPoids({ ...LIGNE, compte: '706000' }, [{ sectionId: 'S1', poids: 1 }], SECTIONS))).toEqual([100001]);
  });

  it('section-inactive-refusee', () => {
    expect(() => ventilerParPoids(LIGNE, [{ sectionId: 'S9', poids: 1 }], SECTIONS)).toThrow(expect.objectContaining({ code: 'section_inactive' }));
    expect(() => ventilerParPoids(LIGNE, [{ sectionId: 'INCONNUE', poids: 1 }], SECTIONS)).toThrow(expect.objectContaining({ code: 'section_inactive' }));
    expect(() => ventilerParMontants(LIGNE, [{ sectionId: 'S9', montant: 100001 }], SECTIONS)).toThrow(expect.objectContaining({ code: 'section_inactive' }));
    expect(() => ventilerParPoids(LIGNE, [{ sectionId: 'S1', poids: 1 }, { sectionId: 'S1', poids: 2 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'section_en_double' }),
    );
    expect(() => ventilerParMontants(LIGNE, [{ sectionId: 'S1', montant: 1 }, { sectionId: 'S1', montant: 100000 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'section_en_double' }),
    );
  });

  it('nouvelle-version-ancienne-gardee', () => {
    const v1 = ventilerParPoids(LIGNE, [{ sectionId: 'S1', poids: 1 }, { sectionId: 'S2', poids: 1 }], SECTIONS);
    const h1 = ajouterVersion([], v1, '2026-03-01');
    expect(h1).toHaveLength(1);
    expect(h1[0]).toMatchObject({ version: 1, date: '2026-03-01', ligneId: 'L1' });
    const copie = JSON.stringify(h1);
    const v2 = ventilerParMontants(LIGNE, [{ sectionId: 'S3', montant: 100001 }], SECTIONS);
    const h2 = ajouterVersion(h1, v2, '2026-04-02');
    expect(JSON.stringify(h1)).toBe(copie);
    expect(h2).not.toBe(h1);
    expect(h2.map((v) => v.version)).toEqual([1, 2]);
    expect(montants(h2[0] ?? { parts: [] })).toEqual([50001, 50000]);
    expect(montants(h2[1] ?? { parts: [] })).toEqual([100001]);
    expect(h2[1]?.date).toBe('2026-04-02');
    expect(() => ajouterVersion(h1, v2, '')).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
  });

  it('ligne-negative', () => {
    const avoir = { id: 'A1', compte: '606000', montant: -100001 };
    const p = ventilerParPoids(avoir, [{ sectionId: 'S1', poids: 1 }, { sectionId: 'S2', poids: 1 }, { sectionId: 'S3', poids: 1 }], SECTIONS);
    expect(montants(p)).toEqual([-33334, -33334, -33333]);
    const m = ventilerParMontants(avoir, [{ sectionId: 'S1', montant: -100000 }, { sectionId: 'S2', montant: -1 }], SECTIONS);
    expect(montants(m).reduce((a, b) => a + b, 0)).toBe(centimes(-100001));
    expect(() => ventilerParMontants(avoir, [{ sectionId: 'S1', montant: 100001 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'somme_differente' }),
    );
  });

  it('entrees-invalides', () => {
    const un = (poids: number): unknown => () => ventilerParPoids(LIGNE, [{ sectionId: 'S1', poids }, { sectionId: 'S2', poids: 1 }], SECTIONS);
    for (const p of [NaN, 1.5, -1, Infinity]) {
      expect(un(p) as () => void).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    }
    expect(() => ventilerParPoids(LIGNE, [{ sectionId: 'S1', poids: 0 }, { sectionId: 'S2', poids: 0 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'entree_invalide' }),
    );
    expect(() => ventilerParPoids(LIGNE, [], SECTIONS)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    for (const montant of [NaN, 1.5, Infinity, 0]) {
      expect(() => ventilerParPoids({ ...LIGNE, montant }, [{ sectionId: 'S1', poids: 1 }], SECTIONS)).toThrow(
        expect.objectContaining({ code: 'entree_invalide' }),
      );
    }
    expect(() => ventilerParMontants(LIGNE, [{ sectionId: 'S1', montant: NaN }], SECTIONS)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    expect(() => ventilerParMontants(LIGNE, [{ sectionId: 'S1', montant: 100000.5 }, { sectionId: 'S2', montant: 0.5 }], SECTIONS)).toThrow(
      expect.objectContaining({ code: 'entree_invalide' }),
    );
    expect(() => ventilerParPoids({ ...LIGNE, id: '' }, [{ sectionId: 'S1', poids: 1 }], SECTIONS)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
  });
});
