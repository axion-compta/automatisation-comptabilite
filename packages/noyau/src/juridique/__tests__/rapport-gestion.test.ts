import { describe, expect, it } from 'vitest';
import { ErreurRapportGestion, decisionRapportGestion } from '../rapport-gestion.js';
import type { ProfilCloture, RegleDispense } from '../rapport-gestion.js';

// Seuils INVENTÉS ; règle de test : au plus un seuil dépassé. Formes et activités fictives.
const BILAN = 100000000;
const CA = 200000000;
const EFFECTIF = 20;
const regle: RegleDispense = {
  formesConcernees: ['FORME_A', 'FORME_B'],
  seuils: { bilanCentimes: BILAN, chiffreAffairesCentimes: CA, effectif: EFFECTIF },
  maxSeuilsDepasses: 1,
  depassement: 'strict',
  activitesExclues: ['ACTIVITE_X'],
};
const profil: ProfilCloture = {
  forme: 'FORME_A',
  bilanCentimes: 50000000,
  chiffreAffairesCentimes: 90000000,
  effectif: 5,
  activite: 'ACTIVITE_Y',
};
const avec = (p: Partial<ProfilCloture>): ProfilCloture => ({ ...profil, ...p });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurRapportGestion ? e.code : 'autre';
  }
  return undefined;
};

describe('decisionRapportGestion', () => {
  it('g1-sous-les-seuils-dispense', () => {
    expect(decisionRapportGestion(profil, regle)).toEqual({ statut: 'dispense' });
  });
  it('g1-effectif-absent-brouillon-et-question', () => {
    expect(decisionRapportGestion(avec({ effectif: null }), regle)).toEqual({
      statut: 'brouillon',
      motif: 'donnee_manquante',
      questions: ['effectif'],
    });
  });
  it('g2-un-seul-seuil-depasse-dispense', () => {
    expect(decisionRapportGestion(avec({ bilanCentimes: BILAN + 1 }), regle)).toEqual({ statut: 'dispense' });
  });
  it('g2-deux-seuils-depasses-brouillon', () => {
    expect(decisionRapportGestion(avec({ bilanCentimes: BILAN + 1, effectif: EFFECTIF + 1 }), regle)).toEqual({
      statut: 'brouillon',
      motif: 'seuils_depasses',
      questions: [],
    });
  });
  it('g3-activite-exclue-jamais-dispensee', () => {
    expect(decisionRapportGestion(avec({ activite: 'ACTIVITE_X' }), regle)).toEqual({
      statut: 'brouillon',
      motif: 'activite_exclue',
      questions: [],
    });
    // Même avec une donnée manquante : l'exclusion passe avant.
    expect(decisionRapportGestion(avec({ activite: 'ACTIVITE_X', effectif: null }), regle)).toMatchObject({
      motif: 'activite_exclue',
    });
  });
  it('g3-activite-absente-question', () => {
    expect(decisionRapportGestion(avec({ activite: null }), regle)).toEqual({
      statut: 'brouillon',
      motif: 'donnee_manquante',
      questions: ['activite'],
    });
  });
  it('egalite-au-seuil-selon-le-mode', () => {
    const egal = avec({ bilanCentimes: BILAN, chiffreAffairesCentimes: CA, effectif: EFFECTIF });
    const stricte = { ...regle, maxSeuilsDepasses: 0 };
    const large = { ...stricte, depassement: 'large' as const };
    expect(decisionRapportGestion(egal, stricte)).toEqual({ statut: 'dispense' });
    expect(decisionRapportGestion(egal, large)).toMatchObject({ statut: 'brouillon', motif: 'seuils_depasses' });
    // Un centime sous le seuil : dispense dans les deux modes.
    const dessous = avec({ bilanCentimes: BILAN - 1, chiffreAffairesCentimes: CA - 1, effectif: EFFECTIF - 1 });
    expect(decisionRapportGestion(dessous, large)).toEqual({ statut: 'dispense' });
  });
  it('forme-non-concernee-brouillon', () => {
    expect(decisionRapportGestion(avec({ forme: 'FORME_C' }), regle)).toEqual({
      statut: 'brouillon',
      motif: 'forme_non_concernee',
      questions: [],
    });
    // La forme passe avant tout : même activité absente et données manquantes.
    expect(
      decisionRapportGestion(avec({ forme: 'FORME_C', activite: null, bilanCentimes: null }), regle),
    ).toMatchObject({ motif: 'forme_non_concernee', questions: [] });
  });
  it('une-question-par-donnee-manquante-dans-l-ordre', () => {
    const vide = avec({ bilanCentimes: null, chiffreAffairesCentimes: null, effectif: null, activite: null });
    expect(decisionRapportGestion(vide, regle)).toMatchObject({
      motif: 'donnee_manquante',
      questions: ['bilan', 'chiffre_affaires', 'effectif', 'activite'],
    });
    expect(decisionRapportGestion(avec({ chiffreAffairesCentimes: null }), regle)).toMatchObject({
      questions: ['chiffre_affaires'],
    });
    expect(decisionRapportGestion(avec({ bilanCentimes: null }), regle)).toMatchObject({ questions: ['bilan'] });
  });
  it('listes-vides-acceptees', () => {
    expect(decisionRapportGestion(profil, { ...regle, activitesExclues: [] })).toEqual({ statut: 'dispense' });
    expect(decisionRapportGestion(profil, { ...regle, formesConcernees: [] })).toMatchObject({
      motif: 'forme_non_concernee',
    });
  });
  it('les-trois-seuils-depasses-avec-max-de-trois-dispense', () => {
    const tout = avec({ bilanCentimes: BILAN + 1, chiffreAffairesCentimes: CA + 1, effectif: EFFECTIF + 1 });
    expect(decisionRapportGestion(tout, { ...regle, maxSeuilsDepasses: 3 })).toEqual({ statut: 'dispense' });
    expect(decisionRapportGestion(tout, { ...regle, maxSeuilsDepasses: 2 })).toMatchObject({ motif: 'seuils_depasses' });
  });
  it('chaque-seuil-compte-separement', () => {
    const r = { ...regle, maxSeuilsDepasses: 0 };
    expect(decisionRapportGestion(avec({ chiffreAffairesCentimes: CA + 1 }), r)).toMatchObject({ motif: 'seuils_depasses' });
    expect(decisionRapportGestion(avec({ effectif: EFFECTIF + 1 }), r)).toMatchObject({ motif: 'seuils_depasses' });
    expect(decisionRapportGestion(avec({ bilanCentimes: BILAN + 1 }), r)).toMatchObject({ motif: 'seuils_depasses' });
  });
});

describe('refus', () => {
  const mauvais = [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  it('seuils-invalides', () => {
    for (const v of mauvais) {
      for (const cle of ['bilanCentimes', 'chiffreAffairesCentimes', 'effectif'] as const) {
        const r = { ...regle, seuils: { ...regle.seuils, [cle]: v } };
        expect(code(() => decisionRapportGestion(profil, r))).toBe('regle_invalide');
      }
    }
  });
  it('max-seuils-hors-bornes', () => {
    for (const v of [-1, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => decisionRapportGestion(profil, { ...regle, maxSeuilsDepasses: v }))).toBe('regle_invalide');
    }
    expect(code(() => decisionRapportGestion(profil, { ...regle, maxSeuilsDepasses: 0 }))).toBeUndefined();
    expect(code(() => decisionRapportGestion(profil, { ...regle, maxSeuilsDepasses: 3 }))).toBeUndefined();
  });
  it('mode-inconnu', () => {
    const r = { ...regle, depassement: 'autre' } as unknown as RegleDispense;
    expect(code(() => decisionRapportGestion(profil, r))).toBe('regle_invalide');
  });
  it('seuil-a-zero-accepte', () => {
    const r = { ...regle, seuils: { bilanCentimes: 0, chiffreAffairesCentimes: 0, effectif: 0 } };
    expect(code(() => decisionRapportGestion(profil, r))).toBeUndefined();
  });
  it('bilan-negatif', () => {
    expect(code(() => decisionRapportGestion(avec({ bilanCentimes: -1 }), regle))).toBe('bilan_negatif');
  });
  it('donnees-du-profil-invalides', () => {
    for (const v of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(code(() => decisionRapportGestion(avec({ bilanCentimes: v }), regle))).toBe('donnee_invalide');
    }
    for (const v of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => decisionRapportGestion(avec({ chiffreAffairesCentimes: v }), regle))).toBe('donnee_invalide');
      expect(code(() => decisionRapportGestion(avec({ effectif: v }), regle))).toBe('donnee_invalide');
    }
    expect(code(() => decisionRapportGestion(avec({ forme: '' }), regle))).toBe('donnee_invalide');
  });
  it('profil-a-zero-accepte', () => {
    const p = avec({ bilanCentimes: 0, chiffreAffairesCentimes: 0, effectif: 0 });
    expect(decisionRapportGestion(p, regle)).toEqual({ statut: 'dispense' });
  });
});
