import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../../types.js';
import { dateEffetOption, exigibilitePour, ventesEnBrouillon } from '../exigibilite.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const MOIS = { regle: 'premier_jour_mois_suivant', statutParametre: 'valide' } as const;
const SERVICE = {
  nature: 'service',
  dateOperation: '2026-10-25',
  optionDebitsEffet: null,
  exigibiliteConfirmeePar: 'personne-exemple-1',
  vendDesServices: true,
} as const;

describe('exigibilité de la TVA', () => {
  it('option-effet-mois-suivant-p14', () => {
    const effet = dateEffetOption('2026-10-20', MOIS);
    expect(effet).toEqual({ effetDebut: '2026-11-01', aVerifier: false });
    expect(exigibilitePour({ ...SERVICE, optionDebitsEffet: effet.effetDebut })).toBe('encaissement');
    expect(exigibilitePour({ ...SERVICE, optionDebitsEffet: effet.effetDebut, dateOperation: '2026-11-01' })).toBe('debits');
    expect(exigibilitePour({ ...SERVICE, optionDebitsEffet: effet.effetDebut, dateOperation: '2026-10-31' })).toBe('encaissement');
    expect(exigibilitePour(SERVICE)).toBe('encaissement');
  });

  it('option-fin-d-annee', () => {
    expect(dateEffetOption('2026-12-15', MOIS).effetDebut).toBe('2027-01-01');
    expect(dateEffetOption('2026-12-15', { ...MOIS, regle: 'jour_meme' }).effetDebut).toBe('2026-12-15');
  });

  it('option-dernier-jour-du-mois', () => {
    expect(dateEffetOption('2026-01-31', MOIS).effetDebut).toBe('2026-02-01');
    expect(dateEffetOption('2026-02-28', MOIS).effetDebut).toBe('2026-03-01');
    expect(dateEffetOption('2028-02-29', MOIS).effetDebut).toBe('2028-03-01');
    expect(dateEffetOption('2026-04-30', MOIS).effetDebut).toBe('2026-05-01');
  });

  it('parametre-non-valide-a-verifier', () => {
    for (const s of ['a_verifier', 'brouillon', '', 'VALIDE']) {
      expect(dateEffetOption('2026-10-20', { ...MOIS, statutParametre: s }).aVerifier).toBe(true);
    }
    expect(dateEffetOption('2026-10-20', MOIS).aVerifier).toBe(false);
  });

  it('regle-inconnue-refusee', () => {
    for (const r of ['', 'PREMIER_JOUR', 'premier_jour', ' jour_meme']) {
      expect(code(() => dateEffetOption('2026-10-20', { ...MOIS, regle: r as never }))).toBe('regle_effet_inconnue');
    }
  });

  it('bien-a-la-livraison', () => {
    const bien = { ...SERVICE, nature: 'bien', exigibiliteConfirmeePar: null, vendDesServices: false } as const;
    expect(exigibilitePour(bien)).toBe('livraison');
    expect(exigibilitePour({ ...bien, optionDebitsEffet: '2026-01-01' })).toBe('livraison');
    expect(ventesEnBrouillon({ vendDesServices: false, exigibiliteConfirmeePar: null })).toBe(false);
  });

  it('service-sans-confirmation-non-calculee', () => {
    for (const v of [null, '']) {
      expect(exigibilitePour({ ...SERVICE, exigibiliteConfirmeePar: v })).toBe('non_calculee');
      expect(exigibilitePour({ ...SERVICE, exigibiliteConfirmeePar: v, optionDebitsEffet: '2026-01-01' })).toBe('non_calculee');
      expect(ventesEnBrouillon({ vendDesServices: true, exigibiliteConfirmeePar: v })).toBe(true);
    }
    expect(ventesEnBrouillon({ vendDesServices: true, exigibiliteConfirmeePar: 'personne-exemple-1' })).toBe(false);
  });

  it('date-invalide-refusee', () => {
    expect(code(() => dateEffetOption('2026-10-32', MOIS))).toBe('date_invalide');
    expect(code(() => dateEffetOption('2026-02-29', MOIS))).toBe('date_invalide');
    expect(code(() => exigibilitePour({ ...SERVICE, dateOperation: '2026-10-32' }))).toBe('date_invalide');
    expect(code(() => exigibilitePour({ ...SERVICE, optionDebitsEffet: '2026-13-01' }))).toBe('date_invalide');
    expect(code(() => dateEffetOption('9999-12-31', MOIS))).toBe('date_invalide');
    // Opération antérieure à l'effet (ordre inversé) : encaissement, jamais de débits rétroactifs.
    expect(exigibilitePour({ ...SERVICE, dateOperation: '2026-09-01', optionDebitsEffet: '2026-11-01' })).toBe('encaissement');
  });
});
