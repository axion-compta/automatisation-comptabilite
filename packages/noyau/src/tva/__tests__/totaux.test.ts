import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { liquiderTva } from '../liquidation.js';
import type { EffetTraitement } from '../traitement.js';
import { ErreurTotauxTva, totauxPeriode, versTotauxLiquidation } from '../totaux.js';

const c = centimes;
const P = { debut: '2026-01-01', fin: '2026-01-31' };

function eff(p: Partial<EffetTraitement>): EffetTraitement {
  return { collectee: c(0), deductible: c(0), sousReserve: c(0), perdue: c(0), aVerifier: false, ...p };
}

describe('totauxPeriode', () => {
  it('totaux-standard', () => {
    const r = totauxPeriode(
      [
        { effet: eff({ collectee: c(2000) }), dateExigibilite: '2026-01-10' },
        { effet: eff({ collectee: c(500) }), dateExigibilite: '2026-01-20' },
        { effet: eff({ deductible: c(300), perdue: c(100) }), dateDeduction: '2026-01-15' },
        { effet: eff({ collectee: c(700), deductible: c(700) }), dateExigibilite: '2026-01-05', dateDeduction: '2026-01-06' },
      ],
      P,
    );
    expect(r).toEqual({ etat: 'calcule', collectee: 3200, deductible: 1000, sousReserve: 0, perdue: 100, lignesSansDate: 0 });
  });

  it('ligne-hors-periode-ignoree', () => {
    const r = totauxPeriode(
      [
        { effet: eff({ collectee: c(900) }), dateExigibilite: '2025-12-31' },
        { effet: eff({ deductible: c(400) }), dateDeduction: '2026-02-01' },
        { effet: eff({ aVerifier: true }), dateExigibilite: '2026-03-01' },
        { effet: eff({ collectee: c(100) }), dateExigibilite: '2026-01-02' },
      ],
      P,
    );
    expect(r).toMatchObject({ etat: 'calcule', collectee: 100, deductible: 0 });
  });

  it('une-ligne-en-doute-aucun-montant', () => {
    const r = totauxPeriode(
      [
        { effet: eff({ collectee: c(2000) }), dateExigibilite: '2026-01-10' },
        { effet: eff({ aVerifier: true }), dateDeduction: '2026-01-12' },
        { effet: eff({ aVerifier: true }), dateExigibilite: '2026-01-13' },
      ],
      P,
    );
    expect(r).toEqual({ etat: 'non_calcule', motif: 'tva_en_doute', lignesEnDoute: 2 });
    expect(Object.keys(r)).not.toContain('collectee');
  });

  it('sous-reserve-a-part', () => {
    const r = totauxPeriode(
      [
        { effet: eff({ sousReserve: c(250) }), dateDeduction: '2026-01-09' },
        { effet: eff({ deductible: c(80) }), dateDeduction: '2026-01-09' },
      ],
      P,
    );
    expect(r).toMatchObject({ etat: 'calcule', deductible: 80, sousReserve: 250, collectee: 0 });
  });

  it('bornes-incluses', () => {
    const r = totauxPeriode(
      [
        { effet: eff({ collectee: c(10) }), dateExigibilite: '2026-01-01' },
        { effet: eff({ collectee: c(20) }), dateExigibilite: '2026-01-31' },
        { effet: eff({ deductible: c(5) }), dateDeduction: '2026-01-01' },
        { effet: eff({ deductible: c(7) }), dateDeduction: '2026-01-31' },
      ],
      P,
    );
    expect(r).toMatchObject({ etat: 'calcule', collectee: 30, deductible: 12 });
    expect(totauxPeriode([{ effet: eff({ collectee: c(4) }), dateExigibilite: '2026-01-01' }], { debut: '2026-01-01', fin: '2026-01-01' })).toMatchObject({ collectee: 4 });
  });

  it('vers-liquidation-refuse-si-non-calcule', () => {
    const doute = totauxPeriode([{ effet: eff({ aVerifier: true }), dateExigibilite: '2026-01-10' }], P);
    expect(() => versTotauxLiquidation(doute)).toThrowError(ErreurTotauxTva);
    const ok = totauxPeriode([{ effet: eff({ collectee: c(900), perdue: c(5) }), dateExigibilite: '2026-01-10' }], P);
    const t = versTotauxLiquidation(ok);
    expect(t).toEqual({ collectee: 900, deductible: 0 });
    const comptes = { collectee: 'CC', deductible: 'CD', aPayer: 'CP', credit: 'CR' };
    expect(liquiderTva(t, comptes, { id: 'l', journal: 'OD', date: '2026-01-31' })).not.toBeNull();
  });

  it('liste-vide-tout-a-zero', () => {
    expect(totauxPeriode([], P)).toEqual({ etat: 'calcule', collectee: 0, deductible: 0, sousReserve: 0, perdue: 0, lignesSansDate: 0 });
  });

  it('ligne-sans-date-ignoree-et-comptee', () => {
    const r = totauxPeriode(
      [
        { effet: eff({ collectee: c(50) }) },
        { effet: eff({ aVerifier: true }) },
        { effet: eff({ collectee: c(10) }), dateExigibilite: '2026-01-10' },
      ],
      P,
    );
    expect(r).toEqual({ etat: 'calcule', collectee: 10, deductible: 0, sousReserve: 0, perdue: 0, lignesSansDate: 2 });
  });

  it('periode-et-dates-invalides-refusees', () => {
    const l = [{ effet: eff({}), dateExigibilite: '2026-01-10' }];
    expect(() => totauxPeriode(l, { debut: '2026-02-01', fin: '2026-01-01' })).toThrowError(ErreurTotauxTva);
    expect(() => totauxPeriode(l, { debut: '2026-13-01', fin: '2026-14-01' })).toThrowError(ErreurTotauxTva);
    expect(() => totauxPeriode(l, { debut: '2026-02-30', fin: '2026-03-01' })).toThrowError(ErreurTotauxTva);
    expect(() => totauxPeriode([{ effet: eff({}), dateExigibilite: 'hier' }], P)).toThrowError(ErreurTotauxTva);
    expect(() => totauxPeriode([{ effet: eff({}), dateDeduction: '2026-1-5' }], P)).toThrowError(ErreurTotauxTva);
  });
});
