import { describe, expect, it } from 'vitest';
import { dispenseAnnexe, ErreurAnnexe, rubriquesAnnexe } from '../annexe-simplifiee.js';

// Valeurs visiblement fictives (MOT43), montants en centimes.
const seuils = { totalBilan: 11111100, chiffreAffaires: 22222200, effectif: 3, statut: 'valide' as const };
const sous = { totalBilan: 11111000, chiffreAffaires: 22222000, effectif: 2 };

describe('dispenseAnnexe', () => {
  it('aucun-seuil-depasse-dispense', () => {
    expect(dispenseAnnexe(sous, seuils)).toEqual({ dispense: true, depasses: [], aVerifier: false });
  });

  it('deux-seuils-depasses-annexe', () => {
    const r = dispenseAnnexe({ ...sous, effectif: 4, totalBilan: 11111101 }, seuils);
    expect(r.dispense).toBe(false);
    expect(r.depasses).toEqual(['effectif', 'total_bilan']);
    const trois = dispenseAnnexe({ totalBilan: 11111101, chiffreAffaires: 22222201, effectif: 4 }, seuils);
    expect(trois.dispense).toBe(false);
    expect(trois.depasses).toEqual(['chiffre_affaires', 'effectif', 'total_bilan']);
  });

  it('un-seul-seuil-dispense-maintenue', () => {
    for (const [cle, val] of [
      ['totalBilan', 11111101],
      ['chiffreAffaires', 22222201],
      ['effectif', 4],
    ] as const) {
      const r = dispenseAnnexe({ ...sous, [cle]: val }, seuils);
      expect(r.dispense).toBe(true);
      expect(r.depasses).toHaveLength(1);
    }
  });

  it('egal-au-seuil-non-depasse', () => {
    const r = dispenseAnnexe(
      { totalBilan: seuils.totalBilan, chiffreAffaires: seuils.chiffreAffaires, effectif: seuils.effectif },
      seuils,
    );
    expect(r).toEqual({ dispense: true, depasses: [], aVerifier: false });
  });

  it('effectif-invalide', () => {
    for (const effectif of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => dispenseAnnexe({ ...sous, effectif }, seuils)).toThrow(ErreurAnnexe);
    }
    expect(() => dispenseAnnexe({ ...sous, effectif: 0 }, seuils)).not.toThrow();
    try {
      dispenseAnnexe({ ...sous, effectif: 1.5 }, seuils);
    } catch (e) {
      expect((e as ErreurAnnexe).code).toBe('entree_invalide');
    }
  });

  it('montants-invalides-refuses', () => {
    for (const v of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => dispenseAnnexe({ ...sous, totalBilan: v }, seuils)).toThrow(ErreurAnnexe);
      expect(() => dispenseAnnexe({ ...sous, chiffreAffaires: v }, seuils)).toThrow(ErreurAnnexe);
      expect(() => dispenseAnnexe(sous, { ...seuils, totalBilan: v })).toThrow(ErreurAnnexe);
      expect(() => dispenseAnnexe(sous, { ...seuils, chiffreAffaires: v })).toThrow(ErreurAnnexe);
      expect(() => dispenseAnnexe(sous, { ...seuils, effectif: v })).toThrow(ErreurAnnexe);
    }
  });

  it('seuils-non-valides-a-verifier', () => {
    expect(dispenseAnnexe(sous, { ...seuils, statut: 'a_verifier' }).aVerifier).toBe(true);
    expect(dispenseAnnexe(sous, { ...seuils, statut: 'non_verifie' }).aVerifier).toBe(true);
    expect(dispenseAnnexe(sous, seuils).aVerifier).toBe(false);
  });
});

describe('rubriquesAnnexe', () => {
  const six = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

  it('rubriques-toutes-a-verifier', () => {
    const r = rubriquesAnnexe({ rubriques: six, statutSource: 'a_verifier' });
    expect(r.map((x) => x.code)).toEqual(six);
    expect(r.every((x) => x.aVerifier)).toBe(true);
    expect(rubriquesAnnexe({ rubriques: six, statutSource: 'non_verifie' }).every((x) => x.aVerifier)).toBe(
      true,
    );
    expect(rubriquesAnnexe({ rubriques: ['R2', 'R1'], statutSource: 'valide' })).toEqual([
      { code: 'R2', aVerifier: false },
      { code: 'R1', aVerifier: false },
    ]);
  });

  it('millesime-vide-ou-double-refuse', () => {
    expect(() => rubriquesAnnexe({ rubriques: [], statutSource: 'valide' })).toThrow(ErreurAnnexe);
    expect(() => rubriquesAnnexe({ rubriques: ['R1', 'R2', 'R1'], statutSource: 'valide' })).toThrow(
      ErreurAnnexe,
    );
    try {
      rubriquesAnnexe({ rubriques: [], statutSource: 'valide' });
    } catch (e) {
      expect((e as ErreurAnnexe).code).toBe('millesime_vide');
    }
    try {
      rubriquesAnnexe({ rubriques: ['R1', 'R1'], statutSource: 'valide' });
    } catch (e) {
      expect((e as ErreurAnnexe).code).toBe('rubrique_en_double');
    }
  });
});
