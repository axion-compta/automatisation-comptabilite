import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ecritureAffectation, ErreurAffectation } from '../ecriture-affectation.js';

// Comptes et montants INVENTÉS pour les tests.
const COMPTES = {
  resultatBenefice: 'CB',
  resultatPerte: 'CP',
  reportDebiteur: 'RD',
  reserveLegale: 'RL',
  dividendesAPayer: 'DP',
  reportCrediteur: 'RC',
};
const CTX = { id: 'e1', date: '2026-12-31', journal: 'OD', decisionApprobation: { date: '2027-06-30' } };
const aff = (resultat: number, apurementPertes = 0, reserve = 0, dividende = 0) => ({
  resultat: centimes(resultat),
  apurementPertes: centimes(apurementPertes),
  reserve: centimes(reserve),
  dividende: centimes(dividende),
});
const sens = (e: ReturnType<typeof ecritureAffectation>) =>
  e.lignes.map((l) => [l.compte, l.debit, l.credit]);
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAffectation ? e.code : 'autre';
  }
  return 'aucune';
};

describe('écriture d affectation du résultat', () => {
  it('benefice-avec-dividende', () => {
    const e = ecritureAffectation(aff(450000, 0, 22500, 300000), COMPTES, CTX);
    expect(e.statut).toBe('brouillon');
    expect(sens(e)).toEqual([
      ['CB', 450000, 0],
      ['RL', 0, 22500],
      ['DP', 0, 300000],
      ['RC', 0, 127500],
    ]);
  });

  it('benefice-avec-apurement', () => {
    const e = ecritureAffectation(aff(450000, 100000, 17500, 0), COMPTES, CTX);
    expect(sens(e)).toEqual([
      ['CB', 450000, 0],
      ['RD', 0, 100000],
      ['RL', 0, 17500],
      ['RC', 0, 332500],
    ]);
  });

  it('perte-reportee', () => {
    const e = ecritureAffectation(aff(-200000), COMPTES, CTX);
    expect(e.statut).toBe('brouillon');
    expect(sens(e)).toEqual([
      ['RD', 200000, 0],
      ['CP', 0, 200000],
    ]);
  });

  it('sans-decision-refuse', () => {
    const ctx = { id: 'e1', date: '2026-12-31', journal: 'OD' };
    expect(code(() => ecritureAffectation(aff(450000), COMPTES, ctx))).toBe('decision_approbation_absente');
    expect(code(() => ecritureAffectation(aff(-1), COMPTES, ctx))).toBe('decision_approbation_absente');
  });

  it('lignes-nulles-omises', () => {
    const e = ecritureAffectation(aff(450000), COMPTES, CTX);
    expect(sens(e)).toEqual([
      ['CB', 450000, 0],
      ['RC', 0, 450000],
    ]);
    const plein = ecritureAffectation(aff(450000, 0, 450000, 0), COMPTES, CTX);
    expect(plein.lignes.map((l) => l.compte)).toEqual(['CB', 'RL']);
  });

  it('somme-superieure-au-resultat-refusee', () => {
    expect(code(() => ecritureAffectation(aff(450000, 100000, 200000, 150001), COMPTES, CTX))).toBe(
      'affectation_incoherente',
    );
    expect(code(() => ecritureAffectation(aff(450000, 0, 0, 0), COMPTES, CTX))).toBe('aucune');
    for (const a of [aff(450000, -100000, 0, 0), aff(450000, 0, -100000, 0), aff(450000, 0, 0, -100000)]) {
      expect(code(() => ecritureAffectation(a, COMPTES, CTX))).toBe('affectation_incoherente');
    }
    for (const v of [4500.5, NaN, Infinity]) {
      const a = { ...aff(450000), resultat: v as ReturnType<typeof centimes> };
      expect(code(() => ecritureAffectation(a, COMPTES, CTX))).toBe('affectation_incoherente');
    }
  });

  it('dividende-sur-perte-refuse', () => {
    expect(code(() => ecritureAffectation(aff(-200000, 0, 0, 1), COMPTES, CTX))).toBe('dividende_sur_perte');
    expect(code(() => ecritureAffectation(aff(0), COMPTES, CTX))).toBe('resultat_nul');
    expect(code(() => ecritureAffectation(aff(-200000, 1, 0, 0), COMPTES, CTX))).toBe('affectation_incoherente');
    expect(code(() => ecritureAffectation(aff(-200000, 0, 1, 0), COMPTES, CTX))).toBe('affectation_incoherente');
  });

  it('equilibre-verifie', () => {
    const cas = [aff(450000, 0, 22500, 300000), aff(450000, 100000, 17500, 0), aff(-200000), aff(1)];
    for (const a of cas) {
      const e = ecritureAffectation(a, COMPTES, CTX);
      expect(verifierEcriture(e).equilibree).toBe(true);
      expect(e.statut).not.toBe('valide');
    }
  });
});
