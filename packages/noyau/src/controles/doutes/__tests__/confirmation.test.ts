import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import {
  ErreurConfirmation,
  niveauConfirmation,
  peutAppliquer,
  recapitulatif,
  type SeuilsConfirmation,
} from '../confirmation.js';

const SEUILS: SeuilsConfirmation = { objets: 25, montant: centimes(100000) };

function lot(n: number, total: number, compte = '606000') {
  const objets = Array.from({ length: n }, () => ({ montant: centimes(0), compte }));
  if (n > 0) objets[0] = { montant: centimes(total), compte };
  return objets;
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurConfirmation) return e.code;
    throw e;
  }
  return undefined;
}

describe('confirmation C5', () => {
  it('CT-38', () => {
    expect(niveauConfirmation(recapitulatif(lot(26, 98000)), SEUILS)).toBe('renforcee');
    expect(niveauConfirmation(recapitulatif(lot(25, 100000)), SEUILS)).toBe('simple');
    expect(niveauConfirmation(recapitulatif(lot(3, 100001)), SEUILS)).toBe('renforcee');
  });

  it('comptes-sans-doublon', () => {
    const r = recapitulatif([
      { montant: centimes(100), compte: '626000' },
      { montant: centimes(200), compte: '606000' },
      { montant: centimes(300), compte: '626000' },
    ]);
    expect(r).toEqual({ nombre: 3, total: 600, comptes: ['606000', '626000'] });
    const inverse = recapitulatif([
      { montant: centimes(300), compte: '626000' },
      { montant: centimes(200), compte: '606000' },
      { montant: centimes(100), compte: '626000' },
    ]);
    expect(inverse).toEqual(r);
  });

  it('renforcee-sans-coche-refusee', () => {
    const r = recapitulatif(lot(26, 0));
    expect(peutAppliquer('renforcee', { renforceeCochee: false, recapitulatifVu: r }, r)).toBe(false);
    expect(peutAppliquer('renforcee', { renforceeCochee: true }, r)).toBe(false);
    expect(peutAppliquer('renforcee', { renforceeCochee: true, recapitulatifVu: r }, r)).toBe(true);
    expect(peutAppliquer('simple', { renforceeCochee: false }, r)).toBe(true);
  });

  it('recapitulatif-different-refuse', () => {
    const r = recapitulatif(lot(26, 500));
    const vus = [
      recapitulatif(lot(27, 500)),
      recapitulatif(lot(26, 501)),
      recapitulatif(lot(26, 500, '626000')),
      { ...r, comptes: ['606000', '626000'] },
    ];
    for (const vu of vus) {
      expect(peutAppliquer('renforcee', { renforceeCochee: true, recapitulatifVu: vu }, r)).toBe(false);
    }
  });

  it('montants-negatifs-additionnes', () => {
    const r = recapitulatif([
      { montant: centimes(150000), compte: '606000' },
      { montant: centimes(-60000), compte: '606000' },
    ]);
    expect(r.total).toBe(90000);
    expect(niveauConfirmation(r, SEUILS)).toBe('simple');
    const avoir = recapitulatif([{ montant: centimes(-100001), compte: '606000' }]);
    expect(niveauConfirmation(avoir, SEUILS)).toBe('renforcee');
    const limite = recapitulatif([{ montant: centimes(-100000), compte: '606000' }]);
    expect(niveauConfirmation(limite, SEUILS)).toBe('simple');
  });

  it('liste-vide-simple', () => {
    const r = recapitulatif([]);
    expect(r).toEqual({ nombre: 0, total: 0, comptes: [] });
    expect(niveauConfirmation(r, SEUILS)).toBe('simple');
    expect(niveauConfirmation(r, { objets: 0, montant: centimes(0) })).toBe('simple');
  });

  it('seuils-invalides', () => {
    const r = recapitulatif([]);
    for (const mauvais of [Number.NaN, -1, 2.5, Infinity]) {
      expect(code(() => niveauConfirmation(r, { ...SEUILS, objets: mauvais }))).toBe('seuil_invalide');
      expect(code(() => niveauConfirmation(r, { ...SEUILS, montant: mauvais as never }))).toBe(
        'seuil_invalide',
      );
    }
  });

  it('montants-invalides', () => {
    for (const mauvais of [Number.NaN, Infinity, 1.5]) {
      expect(code(() => recapitulatif([{ montant: mauvais as never, compte: '606000' }]))).toBe(
        'montant_invalide',
      );
    }
  });
});
