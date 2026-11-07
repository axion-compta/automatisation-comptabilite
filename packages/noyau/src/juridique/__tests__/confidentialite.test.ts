import { describe, expect, it } from 'vitest';
import { ErreurConfidentialite, choisir, optionConfidentialite } from '../confidentialite.js';
import type { ConditionsConfidentialite } from '../confidentialite.js';

// Seuils INVENTÉS ; formes fictives.
const BILAN = 100000000;
const CA = 200000000;
const EFFECTIF = 20;
const conditions: ConditionsConfidentialite = {
  formesAdmises: ['FORME_A'],
  seuils: { bilanCentimes: BILAN, chiffreAffairesCentimes: CA, effectif: EFFECTIF },
  maxSeuilsDepasses: 1,
};
const entree = { forme: 'FORME_A', bilanCentimes: 5000, chiffreAffairesCentimes: 9000, effectif: 3, depotPropose: true };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurConfidentialite ? e.code : 'autre';
  }
  return undefined;
};
const proposee = optionConfidentialite(entree, conditions);

describe('optionConfidentialite', () => {
  it('k1-eligible-proposee-non-cochee', () => {
    expect(proposee).toEqual({ proposee: true, choix: 'non_choisi' });
    // Un seul seuil dépassé reste éligible ; l'égalité au seuil n'est pas un dépassement.
    expect(optionConfidentialite({ ...entree, effectif: EFFECTIF + 1 }, conditions)).toEqual(proposee);
    expect(optionConfidentialite({ ...entree, bilanCentimes: BILAN, effectif: EFFECTIF }, { ...conditions, maxSeuilsDepasses: 0 })).toEqual(proposee);
  });
  it('k1-forme-non-admise-aucune-proposition', () => {
    expect(optionConfidentialite({ ...entree, forme: 'FORME_B' }, conditions)).toEqual({ proposee: false, carte: null });
  });
  it('k1-au-dessus-du-seuil-aucune-proposition', () => {
    const haut = { ...entree, bilanCentimes: BILAN + 1, effectif: EFFECTIF + 1 };
    expect(optionConfidentialite(haut, conditions)).toEqual({ proposee: false, carte: null });
    const r = optionConfidentialite({ ...entree, chiffreAffairesCentimes: CA + 1 }, { ...conditions, maxSeuilsDepasses: 0 });
    expect(r).toEqual({ proposee: false, carte: null });
  });
  it('depot-non-propose-aucune-proposition', () => {
    expect(optionConfidentialite({ ...entree, depotPropose: false }, conditions)).toEqual({ proposee: false, carte: null });
  });
  it('donnee-manquante-carte-completer', () => {
    const carte = { proposee: false, carte: 'completer_bilan_effectif' };
    for (const cle of ['bilanCentimes', 'chiffreAffairesCentimes', 'effectif'] as const) {
      expect(optionConfidentialite({ ...entree, [cle]: null }, conditions)).toEqual(carte);
    }
    expect(optionConfidentialite({ ...entree, forme: 'FORME_B', effectif: null }, conditions)).toEqual({ proposee: false, carte: null });
  });
  it('choix-nominatif-et-date', () => {
    expect(choisir(proposee, { choix: 'demandee', par: 'Alice Exemple', le: '2027-06-30' })).toEqual({
      choix: 'demandee',
      choisiPar: 'Alice Exemple',
      choisiLe: '2027-06-30',
    });
  });
});

describe('refus', () => {
  it('conditions-invalides', () => {
    for (const v of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      for (const cle of ['bilanCentimes', 'chiffreAffairesCentimes', 'effectif'] as const) {
        const c = { ...conditions, seuils: { ...conditions.seuils, [cle]: v } };
        expect(code(() => optionConfidentialite(entree, c))).toBe('conditions_invalides');
      }
    }
    for (const v of [-1, 4, 1.5, Number.NaN]) {
      expect(code(() => optionConfidentialite(entree, { ...conditions, maxSeuilsDepasses: v }))).toBe('conditions_invalides');
    }
  });
  it('donnees-invalides', () => {
    for (const v of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      for (const cle of ['bilanCentimes', 'chiffreAffairesCentimes', 'effectif'] as const) {
        expect(code(() => optionConfidentialite({ ...entree, [cle]: v }, conditions))).toBe('donnee_invalide');
      }
    }
  });
  it('choisir-refus', () => {
    const ok = { choix: 'demandee' as const, par: 'Alice Exemple', le: '2027-06-30' };
    expect(code(() => choisir({ proposee: false, carte: null }, ok))).toBe('option_non_proposee');
    expect(code(() => choisir(proposee, { ...ok, par: '' }))).toBe('auteur_absent');
    expect(code(() => choisir(proposee, { ...ok, par: '   ' }))).toBe('auteur_absent');
    for (const le of ['', 'hier', '2027-13-45', '2027-02-30', '2027-6-30', '30/06/2027']) {
      expect(code(() => choisir(proposee, { ...ok, le }))).toBe('date_invalide');
    }
    for (const choix of ['non_choisi', 'autre']) {
      expect(code(() => choisir(proposee, { ...ok, choix } as never))).toBe('choix_invalide');
    }
  });
});
