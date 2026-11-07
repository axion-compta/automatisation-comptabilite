import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import {
  controleSoldeBanque,
  moisVerrouillable,
  regleSoldeBanque,
  type ObjetSoldeBanque,
} from '../solde-banque.js';

function objet(
  solde512: number,
  soldeReleve: number,
  over: Partial<ObjetSoldeBanque> = {},
): ObjetSoldeBanque {
  return {
    compteBanque: 'BQ1',
    date: '2026-01-31',
    solde512: centimes(solde512),
    soldeReleve: centimes(soldeReleve),
    lignesBancairesSansEcriture: [],
    ecrituresSansLigne: [],
    ...over,
  };
}

describe('CC-PM01 solde de banque', () => {
  it('CT-PM01', () => {
    const o = objet(234560, 234567);
    expect(regleSoldeBanque.evaluer(o)).toEqual({ resultat: 'ALERTE', ecartCentimes: 7 });
    expect(controleSoldeBanque(o)).toMatchObject({ statut: 'impossible', ecart: 7 });
    expect(regleSoldeBanque).toMatchObject({
      id: 'CC-PM01',
      version: 1,
      gravite: 'B',
      bloque: ['validation', 'cloture'],
      declencheurs: ['continu', 'avant_export', 'avant_cloture'],
      actif: true,
    });
    // écart négatif : signe conservé (relevé moins 512)
    expect(regleSoldeBanque.evaluer(objet(234567, 234560))).toEqual({
      resultat: 'ALERTE',
      ecartCentimes: -7,
    });
    const traces = executerControles(
      [regleSoldeBanque],
      [{ type: 'banque', id: 'BQ1', donnee: o }],
      'avant_cloture',
      '2026-02-01T00:00:00Z',
    );
    expect(traces[0]?.resultat).toBe('ALERTE');
  });

  it('solde-egal-ok', () => {
    const o = objet(234567, 234567);
    expect(regleSoldeBanque.evaluer(o)).toEqual({ resultat: 'OK' });
    expect(controleSoldeBanque(o)).toEqual({ statut: 'ok', ecart: 0, lignesEnCause: [] });
  });

  it('lignes-en-cause-listees', () => {
    const r = controleSoldeBanque(
      objet(100, 107, {
        lignesBancairesSansEcriture: ['L3', 'L1', 'L3'],
        ecrituresSansLigne: ['E2', 'L1'],
      }),
    );
    expect(r.lignesEnCause).toEqual(['E2', 'L1', 'L3']);
  });

  it('mois-non-verrouillable-si-impossible', () => {
    const ok = controleSoldeBanque(objet(5, 5));
    const ko = controleSoldeBanque(objet(5, 6));
    expect(moisVerrouillable([ok, ok])).toBe(true);
    expect(moisVerrouillable([])).toBe(true);
    expect(moisVerrouillable([ok, ko])).toBe(false);
    expect(moisVerrouillable([ko, ok])).toBe(false);
  });

  it('aucune-ecriture-d-ajustement', () => {
    const r = controleSoldeBanque(objet(5, 6));
    expect(Object.keys(r).sort()).toEqual(['ecart', 'lignesEnCause', 'statut']);
    expect(Object.keys(regleSoldeBanque.evaluer(objet(5, 6))).sort()).toEqual(['ecartCentimes', 'resultat']);
  });

  it('montants-non-entiers-refuses', () => {
    for (const v of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      const mauvais = objet(5, 5, { solde512: v as never });
      expect(() => controleSoldeBanque(mauvais)).toThrow();
      const mauvais2 = objet(5, 5, { soldeReleve: v as never });
      expect(() => controleSoldeBanque(mauvais2)).toThrow();
      // le moteur ne compte jamais OK un contrôle qui n'a pas pu tourner
      const traces = executerControles(
        [regleSoldeBanque],
        [{ type: 'banque', id: 'BQ1', donnee: mauvais }],
        'continu',
        '2026-02-01T00:00:00Z',
      );
      expect(traces[0]?.resultat).toBe('IMPOSSIBLE');
    }
  });
});
