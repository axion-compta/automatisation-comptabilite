import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../../argent/index.js';
import { ErreurPiece } from '../../types.js';
import { controlerArithmetique, type ReglageArithmetique } from '../arithmetique.js';

const R: ReglageArithmetique = { toleranceParTaux: 1, tolerancePieceMax: 5, toleranceParLigne: 1, toleranceLignesMax: 5, tauxConnusPdb: [600, 1100, 1900, 2000] };
const ligne = (tauxPdb: number, ht: number, tva: number) => ({ tauxPdb, ht: c(ht), tva: c(tva) });
const motifs = (e: Parameters<typeof controlerArithmetique>[0], r = R) => controlerArithmetique(e, r).motifs;
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPiece ? e.code : 'autre'; }
  return undefined;
};

describe('controlerArithmetique', () => {
  it('un-taux-juste', () => {
    expect(controlerArithmetique({ parTaux: [ligne(2000, 10000, 2000)], ttc: c(12000) }, R)).toEqual({ motifs: [], ecarts: [] });
  });
  it('trois-taux-inventes', () => {
    expect(motifs({ parTaux: [ligne(600, 10000, 600), ligne(1100, 5000, 550), ligne(1900, 20000, 3800)], ttc: c(39950) })).toEqual([]);
  });
  it('ecart-un-centime-tolere', () => {
    expect(motifs({ parTaux: [ligne(1900, 3333, 632)], ttc: c(3965) })).toEqual([]);
    expect(motifs({ parTaux: [ligne(1900, 3333, 631)], ttc: c(3964) })).toEqual(['ecart_arithmetique']);
    expect(controlerArithmetique({ parTaux: [ligne(1900, 3333, 631)], ttc: c(3964) }, R).ecarts).toEqual([{ regle: 1, tauxPdb: 1900, ecart: 2 }]);
  });
  it('ttc-depasse-de-6-centimes', () => {
    const p = [ligne(600, 10000, 600), ligne(1100, 5000, 550), ligne(1900, 20000, 3800)];
    expect(controlerArithmetique({ parTaux: p, ttc: c(39956) }, R)).toEqual({ motifs: ['ecart_arithmetique'], ecarts: [{ regle: 2, ecart: 6 }] });
    expect(motifs({ parTaux: p, ttc: c(39953) })).toEqual([]);
    expect(motifs({ parTaux: p, ttc: c(39954) })).toEqual(['ecart_arithmetique']);
    expect(motifs({ parTaux: [ligne(2000, 10000, 2000)], ttc: c(12002) })).toEqual(['ecart_arithmetique']);
    expect(motifs({ parTaux: [ligne(2000, 10000, 2000)], ttc: c(12001) })).toEqual([]);
  });
  it('lignes-somme-fausse', () => {
    const parTaux = [ligne(2000, 10000, 2000)];
    expect(motifs({ parTaux, ttc: c(12000), lignes: [{ tauxPdb: 2000, ht: c(6000) }, { tauxPdb: 2000, ht: c(4000) }] })).toEqual([]);
    expect(motifs({ parTaux, ttc: c(12000), lignes: [{ tauxPdb: 2000, ht: c(6000) }, { tauxPdb: 2000, ht: c(3998) }] })).toEqual([]);
    const r = controlerArithmetique({ parTaux, ttc: c(12000), lignes: [{ tauxPdb: 2000, ht: c(6000) }, { tauxPdb: 2000, ht: c(3997) }] }, R);
    expect(r).toEqual({ motifs: ['ecart_arithmetique'], ecarts: [{ regle: 3, tauxPdb: 2000, ecart: 3 }] });
    expect(motifs({ parTaux, ttc: c(12000), lignes: [{ tauxPdb: 1900, ht: c(10000) }] })).toEqual(['ecart_arithmetique']);
    expect(motifs({ parTaux, ttc: c(12000), lignes: [{ tauxPdb: 2000, ht: c(9999) }] }, { ...R, toleranceParLigne: 0 })).toEqual(['ecart_arithmetique']);
    const plafond = Array.from({ length: 8 }, (_, i) => ({ tauxPdb: 2000, ht: c(i === 0 ? 10000 - 13 : 1) }));
    expect(motifs({ parTaux, ttc: c(12000), lignes: plafond })).toEqual(['ecart_arithmetique']);
  });
  it('montant-du-non-qualifie', () => {
    const parTaux = [ligne(2000, 10000, 2000)];
    expect(motifs({ parTaux, ttc: c(12000), montantDu: c(7000) })).toEqual(['montant_du_non_qualifie']);
    expect(motifs({ parTaux, ttc: c(12000), montantDu: c(7000), qualificationMontantDu: 'acompte_deduit' })).toEqual([]);
    expect(motifs({ parTaux, ttc: c(12000), montantDu: c(12000) })).toEqual([]);
  });
  it('ttc-nul-ht-non-nul', () => {
    expect(motifs({ parTaux: [ligne(2000, 10000, 0)], ttc: c(0) })).toContain('ttc_nul_ht_non_nul');
    expect(motifs({ parTaux: [ligne(2000, 0, 0)], ttc: c(0) })).toEqual([]);
    expect(motifs({ parTaux: [], ttc: c(12000) })).toEqual(['aucun_montant']);
    expect(motifs({ parTaux: [], ttc: c(0) })).toEqual([]);
  });
  it('taux-inconnu', () => {
    expect(motifs({ parTaux: [ligne(777, 10000, 777)], ttc: c(10777) })).toEqual(['taux_inconnu']);
    expect(motifs({ parTaux: [ligne(777, 10000, 777)], ttc: c(10777) }, { ...R, tauxConnusPdb: [777] })).toEqual([]);
  });
  it('hors-bornes', () => {
    const e = { parTaux: [ligne(2000, 10000, 2000)], ttc: c(12000) };
    expect(motifs(e, { ...R, montantMaxSociete: c(11999) })).toEqual(['montant_hors_bornes']);
    expect(motifs(e, { ...R, montantMaxSociete: c(12000) })).toEqual([]);
    expect(motifs({ parTaux: [ligne(2000, -10000, -2000)], ttc: c(-12000) }, { ...R, montantMaxSociete: c(11999) })).toEqual(['montant_hors_bornes']);
  });
  it('avoir-negatif-juste', () => {
    expect(motifs({ parTaux: [ligne(2000, -10000, -2000)], ttc: c(-12000) })).toEqual([]);
    expect(motifs({ parTaux: [ligne(1900, -3333, -633)], ttc: c(-3966) })).toEqual([]);
    expect(motifs({ parTaux: [ligne(2000, -10000, -2005)], ttc: c(-12005) })).toEqual(['ecart_arithmetique']);
  });
  it('motifs-tries-sans-doublon', () => {
    const r = motifs({ parTaux: [ligne(777, 10000, 0), ligne(778, 10000, 0)], ttc: c(0) });
    expect(r).toEqual([...new Set(r)].sort());
    expect(r).toEqual(['ecart_arithmetique', 'taux_inconnu', 'ttc_nul_ht_non_nul']);
  });
  it('entrees-invalides-refusees', () => {
    const e = { parTaux: [ligne(2000, 10000, 2000)], ttc: c(12000) };
    for (const k of ['toleranceParTaux', 'tolerancePieceMax', 'toleranceParLigne', 'toleranceLignesMax'] as const) {
      for (const v of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(code(() => controlerArithmetique(e, { ...R, [k]: v }))).toBe('reglage_invalide');
    }
    expect(code(() => controlerArithmetique(e, { ...R, tauxConnusPdb: [Number.NaN] }))).toBe('reglage_invalide');
    expect(code(() => controlerArithmetique(e, { ...R, montantMaxSociete: Number.NaN as never }))).toBe('reglage_invalide');
    expect(code(() => controlerArithmetique({ ...e, ttc: Number.NaN as never }, R))).toBe('montant_invalide');
    expect(code(() => controlerArithmetique({ ...e, montantDu: 0.5 as never }, R))).toBe('montant_invalide');
    expect(code(() => controlerArithmetique({ parTaux: [{ tauxPdb: 2000, ht: Number.POSITIVE_INFINITY as never, tva: c(0) }], ttc: c(0) }, R))).toBe('montant_invalide');
    expect(code(() => controlerArithmetique({ parTaux: [{ tauxPdb: Number.NaN, ht: c(1), tva: c(0) }], ttc: c(0) }, R))).toBe('montant_invalide');
    expect(code(() => controlerArithmetique({ ...e, lignes: [{ tauxPdb: 2000, ht: 1.5 as never }] }, R))).toBe('montant_invalide');
  });
});
