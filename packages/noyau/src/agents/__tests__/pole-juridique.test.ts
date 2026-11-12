import { describe, expect, it } from 'vitest';
import { ErreurPoleJuridique, escaladesJuridiques, type ConstatJuridique } from '../pole-juridique.js';

const cc = (id: string, solde: number): ConstatJuridique => ({ nature: 'compte_courant', id, solde });
const lib = (id: string, resteALiberer: number): ConstatJuridique => ({ nature: 'liberation', id, resteALiberer });

// Banc fictif : chaque cas dit s'il doit être escaladé, indépendamment du code testé.
const BANC: ReadonlyArray<{ constat: ConstatJuridique; escalade: boolean }> = [
  { constat: cc('cc-01', -1), escalade: true },
  { constat: cc('cc-02', -50000), escalade: true },
  { constat: cc('cc-03', -999999999), escalade: true },
  { constat: cc('cc-04', -100), escalade: true },
  { constat: cc('cc-05', -2500), escalade: true },
  { constat: cc('cc-06', -7), escalade: true },
  { constat: cc('cc-07', 0), escalade: false },
  { constat: cc('cc-08', 1), escalade: false },
  { constat: cc('cc-09', 125000), escalade: false },
  { constat: cc('cc-10', 42), escalade: false },
  { constat: lib('lib-01', 1), escalade: true },
  { constat: lib('lib-02', 500000), escalade: true },
  { constat: lib('lib-03', 250), escalade: true },
  { constat: lib('lib-04', 99999), escalade: true },
  { constat: lib('lib-05', 3), escalade: true },
  { constat: lib('lib-06', 0), escalade: false },
  { constat: lib('lib-07', 0), escalade: false },
  { constat: lib('lib-08', 0), escalade: false },
  { constat: cc('cc-11', -30), escalade: true },
  { constat: lib('lib-09', 12), escalade: true },
  { constat: cc('cc-12', 0), escalade: false },
  { constat: lib('lib-10', 0), escalade: false },
  { constat: cc('cc-13', -8), escalade: true },
  { constat: lib('lib-11', 77), escalade: true },
];

describe('pole juridique', () => {
  it('banc-100-pour-cent-escalade', () => {
    expect(BANC.length).toBeGreaterThanOrEqual(20);
    const sortie = escaladesJuridiques(BANC.map((b) => b.constat));
    const attendus = BANC.filter((b) => b.escalade).map((b) => b.constat.id).sort();
    const obtenus = sortie.map((e) => e.id);
    expect(obtenus).toEqual(attendus);
    for (const e of sortie) {
      expect(e.pole).toBe('juridique');
      expect(e.vers).toBe('utilisateur');
    }
    const motifs = new Map(sortie.map((e) => [e.id, e.motif]));
    expect(motifs.get('cc-01')).toBe('compte_courant_debiteur');
    expect(motifs.get('lib-01')).toBe('liberation_incomplete');
  });

  it('compte-courant-crediteur-sans-escalade', () => {
    expect(escaladesJuridiques([cc('a', 0), cc('b', 1), cc('c', 100000)])).toEqual([]);
    expect(escaladesJuridiques([cc('a', -1)])).toHaveLength(1);
    for (const mauvais of [Number.NaN, Infinity, -0.5]) {
      expect(() => escaladesJuridiques([cc('a', mauvais)])).toThrow(ErreurPoleJuridique);
    }
  });

  it('liberation-complete-sans-escalade', () => {
    expect(escaladesJuridiques([lib('a', 0)])).toEqual([]);
    expect(escaladesJuridiques([lib('a', 1)])).toHaveLength(1);
    for (const mauvais of [-1, Number.NaN, 0.5]) {
      expect(() => escaladesJuridiques([lib('a', mauvais)])).toThrow(ErreurPoleJuridique);
    }
    expect(() => escaladesJuridiques([lib('a', 0), lib('a', 0)])).toThrow(ErreurPoleJuridique);
    expect(() => escaladesJuridiques([lib(' ', 0)])).toThrow(ErreurPoleJuridique);
  });
});
