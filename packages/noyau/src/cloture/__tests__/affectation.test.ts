import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { affecterResultat, ErreurAffectation } from '../affectation.js';

// Fractions et montants INVENTÉS pour les tests.
const PARAMS = { fractionDotationPointsDeBase: 700, plafondReservePointsDeBase: 1500, arrondi: 'inferieur' } as const;

function cas(over: Partial<Record<'resultat' | 'capital' | 'reserveActuelle' | 'reportANouveau' | 'dividendeDemande', number>> = {}) {
  const v = { resultat: 100000, capital: 1000000, reserveActuelle: 0, reportANouveau: 0, dividendeDemande: 0, ...over };
  return {
    resultat: centimes(v.resultat),
    capital: centimes(v.capital),
    reserveActuelle: centimes(v.reserveActuelle),
    reportANouveau: centimes(v.reportANouveau),
    dividendeDemande: centimes(v.dividendeDemande),
  };
}

describe('affectation du résultat', () => {
  it('reserve-proposee', () => {
    // 700 pdb de 100000 = 7000 ; plafond 1500 pdb de 1000000 = 150000.
    expect(affecterResultat(cas(), PARAMS)).toEqual({
      ok: true,
      reserveProposee: 7000,
      distribuable: 93000,
      dividende: 0,
    });
  });

  it('reserve-plafonnee', () => {
    const r = affecterResultat(cas({ reserveActuelle: 147000 }), PARAMS);
    expect(r).toMatchObject({ ok: true, reserveProposee: 3000, distribuable: 97000 });
  });

  it('reserve-deja-au-plafond-zero', () => {
    for (const reserveActuelle of [150000, 200000]) {
      const r = affecterResultat(cas({ reserveActuelle }), PARAMS);
      expect(r).toMatchObject({ ok: true, reserveProposee: 0, distribuable: 100000 });
    }
  });

  it('dividende-egal-distribuable-accepte', () => {
    const r = affecterResultat(cas({ dividendeDemande: 93000 }), PARAMS);
    expect(r).toEqual({ ok: true, reserveProposee: 7000, distribuable: 93000, dividende: 93000 });
  });

  it('dividende-un-centime-de-trop-refuse', () => {
    const r = affecterResultat(cas({ dividendeDemande: 93001 }), PARAMS);
    expect(r).toEqual({ ok: false, code: 'dividende_superieur_distribuable', distribuable: 93000 });
  });

  it('perte-aucun-dividende', () => {
    expect(affecterResultat(cas({ resultat: -5000, dividendeDemande: 1 }), PARAMS)).toEqual({
      ok: false,
      code: 'perte_aucun_dividende',
    });
    expect(affecterResultat(cas({ resultat: 0, dividendeDemande: 1, reportANouveau: 9000 }), PARAMS)).toEqual({
      ok: false,
      code: 'perte_aucun_dividende',
    });
  });

  it('report-negatif-reduit-distribuable', () => {
    const r = affecterResultat(cas({ reportANouveau: -20000 }), PARAMS);
    expect(r).toMatchObject({ ok: true, reserveProposee: 7000, distribuable: 73000 });
    expect(affecterResultat(cas({ reportANouveau: -20000, dividendeDemande: 73001 }), PARAMS)).toEqual({
      ok: false,
      code: 'dividende_superieur_distribuable',
      distribuable: 73000,
    });
    expect(affecterResultat(cas({ reportANouveau: 5000 }), PARAMS)).toMatchObject({ distribuable: 98000 });
  });
});

describe('affectation du résultat : cas limites', () => {
  it('perte-ou-resultat-nul-sans-dividende-accepte', () => {
    for (const resultat of [0, -5000]) {
      expect(affecterResultat(cas({ resultat, reportANouveau: 9000 }), PARAMS)).toEqual({
        ok: true,
        reserveProposee: 0,
        distribuable: 0,
        dividende: 0,
      });
    }
  });

  it('capital-nul-pas-de-reserve', () => {
    const r = affecterResultat(cas({ capital: 0 }), PARAMS);
    expect(r).toMatchObject({ ok: true, reserveProposee: 0, distribuable: 100000 });
  });

  it('distribuable-jamais-negatif', () => {
    const r = affecterResultat(cas({ reportANouveau: -500000 }), PARAMS);
    expect(r).toMatchObject({ ok: true, distribuable: 0 });
    expect(affecterResultat(cas({ reportANouveau: -500000, dividendeDemande: 1 }), PARAMS)).toEqual({
      ok: false,
      code: 'dividende_superieur_distribuable',
      distribuable: 0,
    });
  });

  it('fractions-invalides-refusees', () => {
    for (const mauvais of [-1, 10001, Number.NaN, Number.POSITIVE_INFINITY, 700.5]) {
      expect(() => affecterResultat(cas(), { ...PARAMS, fractionDotationPointsDeBase: mauvais })).toThrow(
        ErreurAffectation,
      );
      expect(() => affecterResultat(cas(), { ...PARAMS, plafondReservePointsDeBase: mauvais })).toThrow(
        ErreurAffectation,
      );
    }
  });

  it('bornes-de-fraction-acceptees', () => {
    const zero = affecterResultat(cas(), { ...PARAMS, fractionDotationPointsDeBase: 0 });
    expect(zero).toMatchObject({ reserveProposee: 0, distribuable: 100000 });
    const plein = affecterResultat(cas(), { ...PARAMS, fractionDotationPointsDeBase: 10000, plafondReservePointsDeBase: 10000 });
    expect(plein).toMatchObject({ reserveProposee: 100000, distribuable: 0 });
  });

  it('dividende-negatif-refuse', () => {
    expect(() => affecterResultat(cas({ dividendeDemande: -1 }), PARAMS)).toThrow(ErreurAffectation);
    expect(() => affecterResultat(cas({ resultat: -10, dividendeDemande: -1 }), PARAMS)).toThrow(ErreurAffectation);
  });

  it('capital-ou-reserve-negatifs-refuses', () => {
    expect(() => affecterResultat(cas({ capital: -1 }), PARAMS)).toThrow(ErreurAffectation);
    expect(() => affecterResultat(cas({ reserveActuelle: -1 }), PARAMS)).toThrow(ErreurAffectation);
  });

  it('arrondi-explicite-applique', () => {
    // 700 pdb de 12345 = 864,15 centimes.
    const bas = affecterResultat(cas({ resultat: 12345 }), { ...PARAMS, arrondi: 'inferieur' });
    const haut = affecterResultat(cas({ resultat: 12345 }), { ...PARAMS, arrondi: 'superieur' });
    expect(bas).toMatchObject({ reserveProposee: 864 });
    expect(haut).toMatchObject({ reserveProposee: 865 });
  });
});
