import { describe, expect, it } from 'vitest';
import { calculerInteretsCca, ErreurInteretsCca, type EntreeInteretsCca } from '../interets-cca.js';

// Valeurs INVENTÉES (spec 14, I1) : convenu 500 et plafond de test 400 points de base.
const CONVENU = 500;
const PLAFOND = 400;
const SOLDE = 2_000_000;

function entree(parties: Partial<EntreeInteretsCca> = {}): EntreeInteretsCca {
  return {
    soldesJournaliers: new Array<number>(365).fill(SOLDE),
    joursAnnee: 365,
    tauxConvenuPointsDeBase: CONVENU,
    tauxMaxPointsDeBase: PLAFOND,
    arrondi: 'demi-superieur',
    ...parties,
  };
}

function code(parties: Partial<EntreeInteretsCca>): string | undefined {
  try {
    calculerInteretsCca(entree(parties));
  } catch (e) {
    if (e instanceof ErreurInteretsCca) return e.code;
    throw e;
  }
  return undefined;
}

const SEMESTRE = { soldesJournaliers: new Array<number>(184).fill(SOLDE) };

describe('intérêts de compte courant', () => {
  it('i1-annee-entiere-100-000', () => {
    const r = calculerInteretsCca(entree());
    expect(r.interets).toBe(100_000);
    expect(r.interetsAuPlafond).toBe(80_000);
  });
  it('i1-annee-entiere-reintegration-20-000', () => {
    expect(calculerInteretsCca(entree()).reintegration).toBe(20_000);
  });
  it('i1-184-jours-50-411', () => {
    expect(calculerInteretsCca(entree(SEMESTRE)).interets).toBe(50_411);
  });
  it('i1-184-jours-reintegration-10-082', () => {
    expect(calculerInteretsCca(entree(SEMESTRE)).reintegration).toBe(10_082);
  });
  it('taux-sous-le-plafond-reintegration-zero', () => {
    expect(calculerInteretsCca(entree({ tauxConvenuPointsDeBase: PLAFOND })).reintegration).toBe(0);
    expect(calculerInteretsCca(entree({ tauxConvenuPointsDeBase: PLAFOND - 1 })).reintegration).toBe(0);
  });
  it('solde-debiteur-ne-porte-pas-interet', () => {
    const soldes = [SOLDE, -SOLDE, 0, SOLDE];
    const attendu = calculerInteretsCca(entree({ soldesJournaliers: [SOLDE, SOLDE] }));
    expect(calculerInteretsCca(entree({ soldesJournaliers: soldes })).interets).toBe(attendu.interets);
    expect(calculerInteretsCca(entree({ soldesJournaliers: [-SOLDE] })).interets).toBe(0);
  });
  it('sans-plafond-reintegration-zero', () => {
    const r = calculerInteretsCca(entree({ tauxMaxPointsDeBase: null }));
    expect(r).toEqual({ interets: 100_000, interetsAuPlafond: null, reintegration: 0 });
  });
  it('liste-vide-interets-zero', () => {
    expect(calculerInteretsCca(entree({ soldesJournaliers: [] })).interets).toBe(0);
  });
  it('refuse-jours-invalides', () => {
    for (const j of [Number.NaN, 0, -1, 365.5, Infinity]) expect(code({ joursAnnee: j })).toBe('jours_invalides');
  });
  it('refuse-trop-de-jours', () => {
    expect(code({ joursAnnee: 364 })).toBe('trop_de_jours');
  });
  it('refuse-solde-invalide', () => {
    for (const s of [Number.NaN, 1.5, Infinity]) expect(code({ soldesJournaliers: [s] })).toBe('solde_invalide');
  });
  it('refuse-taux-invalides', () => {
    expect(code({ tauxConvenuPointsDeBase: -1 })).toBe('parametre_invalide');
    expect(code({ tauxConvenuPointsDeBase: Number.NaN })).toBe('parametre_invalide');
    expect(code({ tauxMaxPointsDeBase: -1 })).toBe('parametre_invalide');
    expect(code({ tauxMaxPointsDeBase: 0.5 })).toBe('parametre_invalide');
  });
});
