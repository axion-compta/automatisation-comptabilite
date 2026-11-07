import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ErreurTva } from '../deductible.js';
import { liquiderTva } from '../liquidation.js';

const c = centimes;
const COMPTES = { collectee: 'CC', deductible: 'CD', aPayer: 'CP', credit: 'CR' };
const IDENTITE = { id: 'liq-1', journal: 'OD', date: '2026-01-31' };

describe('liquiderTva', () => {
  it('liquidation-a-payer', () => {
    const e = liquiderTva({ collectee: c(5000), deductible: c(1200) }, COMPTES, IDENTITE);
    expect(e).not.toBeNull();
    expect(e?.statut).toBe('brouillon');
    expect(e?.id).toBe('liq-1');
    expect(e?.journal).toBe('OD');
    expect(e?.date).toBe('2026-01-31');
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['CC', 5000, 0],
      ['CD', 0, 1200],
      ['CP', 0, 3800],
    ]);
    expect(e?.lignes.every((l) => l.libelle === 'Liquidation de TVA')).toBe(true);
    expect(verifierEcriture(e!).equilibree).toBe(true);
  });

  it('liquidation-credit', () => {
    const e = liquiderTva({ collectee: c(1000), deductible: c(2500) }, COMPTES, IDENTITE);
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['CC', 1000, 0],
      ['CR', 1500, 0],
      ['CD', 0, 2500],
    ]);
    expect(verifierEcriture(e!).equilibree).toBe(true);
  });

  it('liquidation-credit-sans-collectee', () => {
    const e = liquiderTva({ collectee: c(0), deductible: c(700) }, COMPTES, IDENTITE);
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['CR', 700, 0],
      ['CD', 0, 700],
    ]);
  });

  it('liquidation-a-payer-sans-deductible', () => {
    const e = liquiderTva({ collectee: c(900), deductible: c(0) }, COMPTES, IDENTITE);
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['CC', 900, 0],
      ['CP', 0, 900],
    ]);
  });

  it('liquidation-equilibree-sans-ligne-nulle', () => {
    const e = liquiderTva({ collectee: c(800), deductible: c(800) }, COMPTES, IDENTITE);
    expect(e?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['CC', 800, 0],
      ['CD', 0, 800],
    ]);
    expect(e?.lignes.some((l) => l.debit === 0 && l.credit === 0)).toBe(false);
  });

  it('rien-a-liquider-null', () => {
    expect(liquiderTva({ collectee: c(0), deductible: c(0) }, COMPTES, IDENTITE)).toBeNull();
  });

  it('montant-negatif-refuse', () => {
    for (const totaux of [
      { collectee: c(-1), deductible: c(100) },
      { collectee: c(100), deductible: c(-1) },
      { collectee: c(-1), deductible: c(-1) },
    ]) {
      let erreur: unknown;
      try {
        liquiderTva(totaux, COMPTES, IDENTITE);
      } catch (e) {
        erreur = e;
      }
      expect(erreur).toBeInstanceOf(ErreurTva);
      expect((erreur as ErreurTva).code).toBe('montant_negatif');
    }
  });
});
