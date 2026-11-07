import { describe, expect, it } from 'vitest';
import { detecterExportMassif, evenementEcritureAxionRefusee, evenementEtatAcces } from '../evenements.js';
import { ErreurSecurite } from '../types.js';

const H = '2026-01-05T10:00:00Z';
const base = { ancien: 'actif', nouveau: 'suspendu', source: 'console', auteur: 'Alice A', horodatage: H };
const reglage = { nombreMax: 3, fenetreMs: 1000 };

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurSecurite ? e.code : 'autre';
  }
  return undefined;
}

describe('evenements de securite', () => {
  it('quatre-transitions-quatre-evenements', () => {
    const etats = ['a', 'b', 'c', 'd', 'e'];
    const entree = { ...base };
    const evts = etats.slice(1).map((nouveau, i) => evenementEtatAcces({ ...base, ancien: etats[i] as string, nouveau, source: i % 2 === 0 ? 'console' : 'reglage_local' }));
    expect(evts).toHaveLength(4);
    expect(evts.map((e) => e.evenement)).toEqual(Array(4).fill('acces.etat_change'));
    expect(evts[1]).toEqual({
      evenement: 'acces.etat_change',
      horodatage: H,
      auteur: 'Alice A',
      donnees: { ancien: 'b', nouveau: 'c', source: 'reglage_local' },
    });
    expect(base).toEqual(entree);
  });

  it('meme-etat-refuse', () => {
    expect(code(() => evenementEtatAcces({ ...base, nouveau: 'actif' }))).toBe('argument_invalide');
    expect(code(() => evenementEtatAcces({ ...base, ancien: '', nouveau: '' }))).toBe('argument_invalide');
    expect(code(() => evenementEtatAcces({ ...base, nouveau: ' ' }))).toBe('argument_invalide');
    expect(code(() => evenementEtatAcces({ ...base, horodatage: 'pas une date' }))).toBe('argument_invalide');
    expect(code(() => evenementEtatAcces({ ...base, horodatage: '' }))).toBe('argument_invalide');
  });

  it('source-inconnue-refusee', () => {
    expect(code(() => evenementEtatAcces({ ...base, source: 'api' }))).toBe('argument_invalide');
    expect(code(() => evenementEtatAcces({ ...base, source: '' }))).toBe('argument_invalide');
  });

  it('auteur-vide-refuse', () => {
    expect(code(() => evenementEtatAcces({ ...base, auteur: '' }))).toBe('argument_invalide');
    expect(code(() => evenementEtatAcces({ ...base, auteur: '  ' }))).toBe('argument_invalide');
    expect(code(() => evenementEcritureAxionRefusee({ personneId: '', action: 'cloturer', horodatage: H }))).toBe('argument_invalide');
    expect(code(() => evenementEcritureAxionRefusee({ personneId: 'p1', action: 'lire', horodatage: H }))).toBe('argument_invalide');
    expect(code(() => evenementEcritureAxionRefusee({ personneId: 'p1', action: 'cloturer', horodatage: 'x' }))).toBe('argument_invalide');
    expect(evenementEcritureAxionRefusee({ personneId: 'p1', action: 'cloturer', horodatage: H })).toEqual({
      evenement: 'securite.ecriture_axion_refusee',
      horodatage: H,
      auteur: 'p1',
      donnees: { action: 'cloturer' },
    });
  });

  it('export-massif-au-dela-du-nombre', () => {
    expect(detecterExportMassif([10, 20, 30, 40], 50, reglage)).toBe(true);
    expect(detecterExportMassif([40, 10, 30, 20], 50, reglage)).toBe(true);
    expect(detecterExportMassif([], 50, reglage)).toBe(false);
  });

  it('export-massif-egal-au-nombre-non', () => {
    expect(detecterExportMassif([10, 20, 30], 50, reglage)).toBe(false);
    expect(detecterExportMassif([10, 20, 30], 50, { ...reglage, nombreMax: 2 })).toBe(true);
  });

  it('exports-hors-fenetre-ignores', () => {
    expect(detecterExportMassif([1, 2, 3, 4], 5000, reglage)).toBe(false);
    expect(detecterExportMassif([4000, 4001, 4002, 4003], 5000, reglage)).toBe(true);
    expect(detecterExportMassif([4000, 4001, 4002, 3999], 5000, reglage)).toBe(false);
    expect(detecterExportMassif([5000, 5001, 6000, 7000], 5000, reglage)).toBe(false);
    expect(detecterExportMassif([5000, 5000, 5000, 5000], 5000, reglage)).toBe(true);
    const liste = [10, 20, 30, 40];
    detecterExportMassif(liste, 50, reglage);
    expect(liste).toEqual([10, 20, 30, 40]);
  });

  it('arguments-invalides-refuses', () => {
    const mauvais = [Number.NaN, Infinity, -1, 1.5];
    for (const v of mauvais) {
      expect(code(() => detecterExportMassif([1], v, reglage))).toBe('argument_invalide');
      expect(code(() => detecterExportMassif([v], 5, reglage))).toBe('argument_invalide');
      expect(code(() => detecterExportMassif([1], 5, { ...reglage, nombreMax: v }))).toBe('argument_invalide');
      expect(code(() => detecterExportMassif([1], 5, { ...reglage, fenetreMs: v }))).toBe('argument_invalide');
    }
    expect(code(() => detecterExportMassif([], 0, { nombreMax: 0, fenetreMs: 0 }))).toBeUndefined();
    expect(code(() => detecterExportMassif([], '5' as unknown as number, reglage))).toBe('argument_invalide');
  });
});
