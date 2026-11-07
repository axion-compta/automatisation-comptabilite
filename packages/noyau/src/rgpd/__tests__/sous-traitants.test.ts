import { describe, expect, it } from 'vitest';
import { activationPossible } from '../sous-traitants.js';
import { ErreurRgpd } from '../types.js';

const base = {
  ref: 'fournisseur-fictif', type: 'autre' as const, contratArchiveLe: '2026-01-05', annonceLe: '2026-02-01',
  traitementDansUe: true, conservationChezFournisseur: false, oppositions: [] as { societeRef: string; le: string }[],
};
const reglage = { oppositionJours: 10 };
const code = (action: () => unknown): string | undefined => {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
};

describe('sous-traitants', () => {
  it('tout-est-en-regle-permise', () => {
    expect(activationPossible(base, reglage, '2026-03-01')).toEqual({ permise: true, raisons: [], permiseLe: '2026-02-11' });
  });

  it('contrat-absent-refuse', () => {
    expect(activationPossible({ ...base, contratArchiveLe: null }, reglage, '2026-03-01').raisons).toEqual(['contrat_absent']);
  });

  it('non-annonce-refuse', () => {
    expect(activationPossible({ ...base, annonceLe: null }, reglage, '2026-03-01')).toEqual({
      permise: false, raisons: ['non_annonce'], permiseLe: null,
    });
    const futur = activationPossible({ ...base, annonceLe: '2026-03-02' }, reglage, '2026-03-01');
    expect(futur.raisons).toEqual(['non_annonce']);
  });

  it('delai-en-cours-et-jour-meme', () => {
    expect(activationPossible(base, reglage, '2026-02-10')).toEqual({ permise: false, raisons: ['delai_en_cours'], permiseLe: '2026-02-11' });
    expect(activationPossible(base, reglage, '2026-02-11').permise).toBe(true);
    expect(activationPossible(base, { oppositionJours: 0 }, '2026-02-01')).toMatchObject({ permise: true, permiseLe: '2026-02-01' });
  });

  it('opposition-pendant-le-delai-bloque', () => {
    for (const le of ['2026-02-05', '2026-02-11']) {
      const r = activationPossible({ ...base, oppositions: [{ societeRef: 'societe-fictive', le }] }, reglage, '2026-03-01');
      expect(r.raisons).toEqual(['oppositions']);
      expect(r.permise).toBe(false);
    }
  });

  it('opposition-apres-le-delai-ignoree', () => {
    const r = activationPossible({ ...base, oppositions: [{ societeRef: 'societe-fictive', le: '2026-02-12' }] }, reglage, '2026-03-01');
    expect(r.permise).toBe(true);
  });

  it('ia-qui-conserve-refusee', () => {
    const ia = { ...base, type: 'ia' as const, conservationChezFournisseur: true };
    expect(activationPossible(ia, reglage, '2026-03-01').raisons).toEqual(['conservation_chez_fournisseur']);
    expect(activationPossible({ ...ia, conservationChezFournisseur: false }, reglage, '2026-03-01').permise).toBe(true);
    expect(activationPossible({ ...base, type: 'hebergeur' as const, conservationChezFournisseur: true }, reglage, '2026-03-01').permise).toBe(true);
  });

  it('hors-ue-refuse', () => {
    const r = activationPossible(
      { ...base, traitementDansUe: false, contratArchiveLe: null, annonceLe: null }, reglage, '2026-03-01',
    );
    expect(r.raisons).toEqual(['contrat_absent', 'hors_ue', 'non_annonce']);
    const ordre = activationPossible({ ...base, type: 'ia' as const, conservationChezFournisseur: true, traitementDansUe: false }, reglage, '2026-03-01');
    expect(ordre.raisons).toEqual(['conservation_chez_fournisseur', 'hors_ue']);
    expect(code(() => activationPossible(base, { oppositionJours: Number.NaN }, '2026-03-01'))).toBe('delai_invalide');
    for (const j of [Infinity, 1.5, -1]) expect(code(() => activationPossible(base, { oppositionJours: j }, '2026-03-01'))).toBe('delai_invalide');
    expect(code(() => activationPossible({ ...base, annonceLe: '2026-02-30' }, reglage, '2026-03-01'))).toBe('date_invalide');
    expect(code(() => activationPossible(base, reglage, 'x'))).toBe('date_invalide');
  });
});
