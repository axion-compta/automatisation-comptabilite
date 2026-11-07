import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import { etatFranchise, niveauSeuil, propositionChangementRegime } from '../seuils.js';

const c = (n: number): Centimes => centimes(n);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const F = { seuilBase: c(1000000), seuilMajore: c(1200000), alertePdb: 8000, statutParametre: 'sur' as const };
const P = { societeId: 'soc-exemple-1', dateEffet: '2026-01-01' };
const MAJ = { niveau: 'majore_depasse', aVerifier: false } as const;

describe('seuils', () => {
  it('alerte-exactement-au-pourcentage-p11', () => {
    expect(niveauSeuil(c(800000), { seuilCentimes: c(1000000), alertePdb: 8000 })).toBe('alerte');
    expect(etatFranchise(c(800000), F).niveau).toBe('alerte');
  });

  it('un-centime-sous-l-alerte-p11', () => {
    expect(niveauSeuil(c(799999), { seuilCentimes: c(1000000), alertePdb: 8000 })).toBe('sous');
    expect(etatFranchise(c(799999), F).niveau).toBe('sous');
  });

  it('seuil-change-sans-code-p11', () => {
    expect(niveauSeuil(c(800000), { seuilCentimes: c(1000000), alertePdb: 8000 })).toBe('alerte');
    expect(niveauSeuil(c(800000), { seuilCentimes: c(2000000), alertePdb: 8000 })).toBe('sous');
    expect(niveauSeuil(c(800000), { seuilCentimes: c(700000), alertePdb: 8000 })).toBe('depasse');
  });

  it('depassement-majore-propose-p12', () => {
    const etat = Object.freeze({ ...MAJ });
    const p = Object.freeze({ ...P });
    const r = propositionChangementRegime(etat, p);
    expect(r).toEqual({
      type: 'nouvelle_ligne_regime_tva',
      motif: 'depassement_seuil',
      statut: 'propose',
      societeId: 'soc-exemple-1',
      effetDebut: '2026-01-01',
      aVerifier: false,
    });
    expect(etat).toEqual(MAJ);
    expect(p).toEqual(P);
    expect(etatFranchise(c(1200001), F)).toEqual(MAJ);
    expect(etatFranchise(c(1200000), F).niveau).toBe('base_depasse');
  });

  it('base-depasse-sans-proposition', () => {
    const e = etatFranchise(c(1100000), F);
    expect(e.niveau).toBe('base_depasse');
    expect(propositionChangementRegime(e, P)).toBeNull();
    expect(propositionChangementRegime({ niveau: 'alerte', aVerifier: false }, P)).toBeNull();
    expect(propositionChangementRegime({ niveau: 'sous', aVerifier: false }, P)).toBeNull();
  });

  it('egal-au-seuil-non-depasse', () => {
    expect(niveauSeuil(c(1000000), { seuilCentimes: c(1000000), alertePdb: 8000 })).toBe('alerte');
    expect(niveauSeuil(c(1000001), { seuilCentimes: c(1000000), alertePdb: 8000 })).toBe('depasse');
    expect(etatFranchise(c(1000000), F).niveau).toBe('alerte');
  });

  it('parametre-a-verifier-proposition-a-verifier', () => {
    for (const statutParametre of ['a_verifier', 'douteux'] as const) {
      const e = etatFranchise(c(1300000), { ...F, statutParametre });
      expect(e).toEqual({ niveau: 'majore_depasse', aVerifier: true });
      expect(propositionChangementRegime(e, P)?.aVerifier).toBe(true);
    }
    expect(etatFranchise(c(1300000), F).aVerifier).toBe(false);
  });

  it('seuils-inverses-refuses', () => {
    expect(code(() => etatFranchise(c(1), { ...F, seuilMajore: c(999999) }))).toBe('seuils_inverses');
    expect(etatFranchise(c(1), { ...F, seuilMajore: F.seuilBase }).niveau).toBe('sous');
  });

  it('entrees-invalides', () => {
    const s = (ca: number, seuil: number, alertePdb = 8000) => code(() => niveauSeuil(ca as Centimes, { seuilCentimes: seuil as Centimes, alertePdb }));
    for (const ca of [-1, 1.5, Number.NaN, Infinity]) expect(s(ca, 1000)).toBe('entree_invalide');
    for (const seuil of [0, -5, 1.5, Number.NaN, Infinity]) expect(s(1, seuil)).toBe('entree_invalide');
    for (const a of [0, 10001, -1, 1.5, Number.NaN, Infinity]) expect(s(1, 1000, a)).toBe('entree_invalide');
    expect(s(1, 1000, 1)).toBeUndefined();
    expect(s(1, 1000, 10000)).toBeUndefined();
    for (const m of [0, 1.5, Number.NaN, Infinity]) expect(code(() => etatFranchise(c(1), { ...F, seuilMajore: m as Centimes }))).toBe('entree_invalide');
    expect(code(() => etatFranchise(-1 as Centimes, F))).toBe('entree_invalide');
    expect(code(() => propositionChangementRegime(MAJ, { ...P, dateEffet: 'demain' }))).toBe('date_invalide');
    const max = Number.MAX_SAFE_INTEGER as Centimes;
    expect(niveauSeuil(max, { seuilCentimes: max, alertePdb: 10000 })).toBe('alerte');
    expect(niveauSeuil(max, { seuilCentimes: c(1), alertePdb: 8000 })).toBe('depasse');
    expect(niveauSeuil(c(1), { seuilCentimes: max, alertePdb: 8000 })).toBe('sous');
  });
});
