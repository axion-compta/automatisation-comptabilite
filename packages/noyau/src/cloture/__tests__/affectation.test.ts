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
      apurementPertes: 0,
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
    expect(r).toEqual({ ok: true, reserveProposee: 7000, apurementPertes: 0, distribuable: 93000, dividende: 93000 });
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
    expect(r).toMatchObject({ ok: true, reserveProposee: 5600, apurementPertes: 20000, distribuable: 74400 });
    expect(affecterResultat(cas({ reportANouveau: -20000, dividendeDemande: 74401 }), PARAMS)).toEqual({
      ok: false,
      code: 'dividende_superieur_distribuable',
      distribuable: 74400,
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
        apurementPertes: 0,
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

describe('affectation du résultat : pertes antérieures (R06, R09)', () => {
  const P = PARAMS;
  const C = { capital: 1000000 };
  it('pertes-anterieures-reduisent-la-base', () => {
    const r = affecterResultat(cas({ ...C, resultat: 450000, reportANouveau: -100000 }), P);
    expect(r).toMatchObject({ ok: true, reserveProposee: 24500, apurementPertes: 100000, distribuable: 325500 });
  });
  it('pertes-superieures-au-benefice-dotation-nulle', () => {
    const e = cas({ ...C, resultat: 80000, reportANouveau: -100000 });
    expect(affecterResultat(e, P)).toMatchObject({ ok: true, reserveProposee: 0, apurementPertes: 80000, distribuable: 0 });
    expect(affecterResultat({ ...e, dividendeDemande: centimes(1) }, P)).toEqual({
      ok: false,
      code: 'dividende_superieur_distribuable',
      distribuable: 0,
    });
  });
  it('report-crediteur-hors-de-la-base', () => {
    const r = affecterResultat(cas({ ...C, resultat: 450000, reportANouveau: 50000 }), P);
    expect(r).toMatchObject({ ok: true, reserveProposee: 31500, apurementPertes: 0, distribuable: 468500 });
  });
  it('reserves-disponibles-ajoutees', () => {
    const e = { ...cas({ ...C, resultat: 450000 }), reservesDisponibles: centimes(10000) };
    const base = affecterResultat(cas({ ...C, resultat: 450000 }), P);
    const r = affecterResultat(e, P);
    expect(base).toMatchObject({ distribuable: 418500 });
    expect(r).toMatchObject({ distribuable: 428500 });
  });
  it('plafond-toujours-applique', () => {
    const r = affecterResultat(cas({ ...C, resultat: 450000, reserveActuelle: 140000, reportANouveau: -100000 }), P);
    expect(r).toMatchObject({ ok: true, reserveProposee: 10000 });
  });
  it('arrondi-selon-le-mode', () => {
    const e = cas({ ...C, resultat: 123457 });
    expect(affecterResultat(e, { ...P, arrondi: 'demi-superieur' })).toMatchObject({ reserveProposee: 8642 });
    expect(affecterResultat(e, { ...P, arrondi: 'inferieur' })).toMatchObject({ reserveProposee: 8641 });
  });
});
