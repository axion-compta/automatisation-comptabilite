import { describe, expect, it } from 'vitest';
import { ecritureAppel, ecriturePaiement, ecritureRegularisation, ErreurTns } from '../tns.js';

// Comptes de la spec, passés en argument.
const COMPTES = { cotisations: '646000', organismes: '431000', banque: '512000' };
const base = { id: 'e1', date: '2026-11-20', journal: 'OD' };

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurTns);
    return (e as ErreurTns).code;
  }
  return 'aucune_erreur';
}

const sens = (e: { lignes: readonly { compte: string; debit: number; credit: number }[] }) =>
  e.lignes.map((l) => [l.compte, l.debit, l.credit]);

describe('cotisations du dirigeant non salarié', () => {
  it('appel-avec-echeance-lue', () => {
    // MOT82-1 : appel de 1 800,00 échéant le 05/12/2026.
    const r = ecritureAppel({ ...base, montant: 180000, echeanceLue: '2026-12-05' }, COMPTES);
    expect(sens(r.ecriture)).toEqual([
      ['646000', 180000, 0],
      ['431000', 0, 180000],
    ]);
    expect(r.echeance).toEqual({ date: '2026-12-05' });
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.id).toBe('e1');
    expect(r.ecriture.journal).toBe('OD');
    expect(r.ecriture.date).toBe('2026-11-20');
  });

  it('appel-sans-date-a-verifier', () => {
    const r = ecritureAppel({ ...base, montant: 180000 }, COMPTES);
    expect(r.echeance).toEqual({ aVerifier: true });
    expect('date' in r.echeance).toBe(false);
    expect(r.ecriture.statut).toBe('brouillon');
  });

  it('regularisation-positive', () => {
    // MOT82-2 : +250,00 : D cotisations / C organismes.
    const e = ecritureRegularisation({ ...base, difference: 25000 }, COMPTES);
    expect(sens(e)).toEqual([
      ['646000', 25000, 0],
      ['431000', 0, 25000],
    ]);
    expect(e.statut).toBe('brouillon');
  });

  it('regularisation-negative', () => {
    // MOT82-2 : -100,00 : D organismes / C cotisations.
    const e = ecritureRegularisation({ ...base, difference: -10000 }, COMPTES);
    expect(sens(e)).toEqual([
      ['431000', 10000, 0],
      ['646000', 0, 10000],
    ]);
    expect(code(() => ecritureRegularisation({ ...base, difference: 0 }, COMPTES))).toBe('regularisation_nulle');
    expect(code(() => ecritureRegularisation({ ...base, difference: -0 }, COMPTES))).toBe('regularisation_nulle');
  });

  it('paiement', () => {
    const e = ecriturePaiement({ ...base, montant: 180000 }, COMPTES);
    expect(sens(e)).toEqual([
      ['431000', 180000, 0],
      ['512000', 0, 180000],
    ]);
    expect(e.statut).toBe('brouillon');
    expect(e.lignes.every((l) => l.libelle.length > 0)).toBe(true);
  });

  it('entrees-invalides', () => {
    for (const montant of [0, -1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => ecritureAppel({ ...base, montant }, COMPTES))).toBe('montant_invalide');
      expect(code(() => ecriturePaiement({ ...base, montant }, COMPTES))).toBe('montant_invalide');
    }
    for (const difference of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(code(() => ecritureRegularisation({ ...base, difference }, COMPTES))).toBe('montant_invalide');
    }
    for (const echeanceLue of ['2026-02-30', '2026-13-01', '05/12/2026', '']) {
      expect(code(() => ecritureAppel({ ...base, montant: 100, echeanceLue }, COMPTES))).toBe('date_invalide');
    }
    expect(code(() => ecritureAppel({ ...base, montant: 100, echeanceLue: '2026-02-28' }, COMPTES))).toBe('aucune_erreur');
    expect(code(() => ecritureAppel({ ...base, montant: 100, echeanceLue: '2028-02-29' }, COMPTES))).toBe('aucune_erreur');
    expect(code(() => ecritureAppel({ ...base, montant: 100, echeanceLue: '2026-02-29' }, COMPTES))).toBe('date_invalide');
    expect(code(() => ecriturePaiement({ ...base, date: '2026-02-30', montant: 100 }, COMPTES))).toBe('date_invalide');
    expect(code(() => ecritureRegularisation({ ...base, date: 'x', difference: 100 }, COMPTES))).toBe('date_invalide');
  });
});
