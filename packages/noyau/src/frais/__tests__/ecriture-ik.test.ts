import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { proposerEcritureTrajet, proposerRegularisation } from '../ecriture-ik.js';
import { ErreurFrais, type ComptesFrais } from '../types.js';

const comptes: ComptesFrais = {
  chargeParNature: {},
  chargeIk: 'C-IK',
  tvaDeductible: 'C-TVA',
  comptePersonne: 'C-PERS',
  banque: 'C-BQ',
};
const entete = { id: 'e1', journal: 'OD', date: '2026-03-15', libelle: 'Trajet fictif' };
const c = centimes;

describe('proposerEcritureTrajet (E2)', () => {
  it('nf07-trajet-e2', () => {
    const e = proposerEcritureTrajet(c(4280), comptes, entete);
    expect(e).not.toBeNull();
    if (e === null) return;
    expect(e.statut).toBe('propose');
    expect(e.lignes).toEqual([
      { compte: 'C-IK', libelle: 'Trajet fictif', debit: 4280, credit: 0 },
      { compte: 'C-PERS', libelle: 'Trajet fictif', debit: 0, credit: 4280 },
    ]);
    expect(verifierEcriture(e).equilibree).toBe(true);
  });

  it('montant-null-aucune-ecriture', () => {
    expect(proposerEcritureTrajet(null, comptes, entete)).toBeNull();
  });

  it('montant-zero-aucune-ecriture', () => {
    expect(proposerEcritureTrajet(c(0), comptes, entete)).toBeNull();
  });
});

describe('proposerRegularisation (E4)', () => {
  it('regularisation-positive', () => {
    const e = proposerRegularisation(c(1500), comptes, entete);
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['C-IK', 1500, 0],
      ['C-PERS', 0, 1500],
    ]);
    expect(e !== null && verifierEcriture(e).equilibree).toBe(true);
  });

  it('regularisation-negative-sens-inverse', () => {
    const e = proposerRegularisation(c(-1500), comptes, entete);
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['C-PERS', 1500, 0],
      ['C-IK', 0, 1500],
    ]);
    expect(e !== null && verifierEcriture(e).equilibree).toBe(true);
  });

  it('regularisation-nulle-aucune-ecriture', () => {
    expect(proposerRegularisation(c(0), comptes, entete)).toBeNull();
  });
});

describe('contraintes communes', () => {
  it('jamais-de-tva', () => {
    for (let i = -100; i < 100; i += 1) {
      const e = proposerRegularisation(c(i * 37 + 1), comptes, entete);
      const t = proposerEcritureTrajet(c(i * 37 + 1 < 0 ? 1 : i * 37 + 1), comptes, entete);
      for (const x of [e, t]) {
        expect(x?.lignes.some((l) => l.compte === comptes.tvaDeductible)).toBe(false);
        expect(x?.lignes).toHaveLength(2);
      }
    }
  });

  it('entrees-invalides', () => {
    const mauvaises = [Number.NaN, Number.POSITIVE_INFINITY, Number('1.5')];
    for (const m of mauvaises) {
      expect(() => proposerEcritureTrajet(m as never, comptes, entete)).toThrow(ErreurFrais);
      expect(() => proposerRegularisation(m as never, comptes, entete)).toThrow(ErreurFrais);
    }
    expect(() => proposerEcritureTrajet(c(-1), comptes, entete)).toThrow(ErreurFrais);
    try {
      proposerEcritureTrajet(c(-1), comptes, entete);
    } catch (e) {
      expect((e as ErreurFrais).code).toBe('entree_invalide');
    }
  });
});
