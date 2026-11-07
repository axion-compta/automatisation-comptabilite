import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { Ecriture, LigneEcriture } from '../../../ecritures/modele.js';
import { instantaneCloture } from '../../../conservation/relecture-exercice.js';
import { executerControles, type RegleControle } from '../../moteur.js';
import {
  reglePartsCapital,
  regleLiberation,
  regleDividendeGerant,
  regleRelectureExercice,
  type ObjetDividendeGerant,
  type ObjetLiberation,
  type ObjetPartsCapital,
  type ObjetRelecture,
} from '../principes-moteur.js';

// Paramètres d'essai fictifs, jamais des valeurs légales.
const FRACTION_ESSAI = 2500;
const SEUIL_ESSAI = 1000;
const HORO = '2026-02-01T00:00:00Z';

const parts = (partsCapital: number, a: number, b: number): ObjetPartsCapital => ({
  associes: [
    { id: 'a1', parts: a },
    { id: 'a2', parts: b },
  ],
  partsCapital,
});
const libe = (verse: number): ObjetLiberation => ({
  apportsNumeraire: centimes(10000),
  verse: centimes(verse),
  fractionMinPointsDeBase: FRACTION_ESSAI,
});
const gerant = (dividende: number, role = 'gerant_majoritaire'): ObjetDividendeGerant => ({
  seuilPointsDeBase: SEUIL_ESSAI,
  entree: {
    forme: 'SARL',
    beneficiaireId: 'g1',
    associes: [{ id: 'g1', parts: 100, role }],
    capital: centimes(100000),
    primes: centimes(0),
    comptesCourants: {},
    dividendes: { g1: centimes(dividende) },
  },
});
const ligne = (compte: string, debit: number, credit: number): LigneEcriture => ({
  compte,
  libelle: 'Libellé fictif',
  debit: centimes(debit),
  credit: centimes(credit),
});
const ecr = (debit: number): Ecriture => ({
  id: '1',
  numero: 'VE-1',
  date: '2026-03-01',
  journal: 'VE',
  statut: 'valide',
  lignes: [ligne('411000', debit, 0), ligne('706000', 0, debit)],
});
const relecture = (debit: number): ObjetRelecture => ({
  ecritures: [ecr(debit)],
  instantane: instantaneCloture('ex-2026', [ecr(1000)]),
});

describe('CC-PM04 à CC-PM07', () => {
  it('CT-PM04', () => {
    expect(reglePartsCapital.evaluer(parts(100, 60, 41))).toMatchObject({ resultat: 'ALERTE', valeur: 1 });
    expect(reglePartsCapital.evaluer(parts(100, 60, 39))).toMatchObject({ resultat: 'ALERTE', valeur: -1 });
  });

  it('CT-PM05', () => {
    // minimum 2500 ; verse 2499 : manque 1
    expect(regleLiberation.evaluer(libe(2499))).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
  });

  it('CT-PM06', () => {
    // seuil = 10000 ; dividende 10001 : un centime au-delà
    expect(regleDividendeGerant.evaluer(gerant(10001))).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
  });

  it('CT-PM07', () => {
    expect(regleRelectureExercice.evaluer(relecture(1001))).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
  });

  it('CT-PM07 limites : crédit seul, totaux égaux, vide, ordre inverse', () => {
    const base = instantaneCloture('ex-2026', [ecr(1000)]);
    const avec = (l2: LigneEcriture): Ecriture => ({ ...ecr(1000), lignes: [ligne('411000', 1000, 0), l2] });
    const evalue = (ecritures: Ecriture[], instantane = base) => regleRelectureExercice.evaluer({ ecritures, instantane });
    expect(evalue([avec(ligne('706000', 0, 1001))])).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(evalue([avec(ligne('707000', 0, 1000))])).toEqual({ resultat: 'ALERTE' });
    expect(evalue([])).toMatchObject({ resultat: 'ALERTE' });
    const e2: Ecriture = { ...ecr(500), id: '2', numero: 'VE-2' };
    const inst2 = instantaneCloture('ex-2026', [ecr(1000), e2]);
    expect(evalue([ecr(1000), e2], inst2)).toEqual({ resultat: 'OK' });
    expect(evalue([e2, ecr(1000)], inst2)).toEqual({ resultat: 'OK' });
  });

  it('CT-PM04 limites : aucun associé, ordre inverse', () => {
    expect(reglePartsCapital.evaluer({ associes: [], partsCapital: 100 })).toMatchObject({ resultat: 'ALERTE', valeur: -100 });
    const o = parts(100, 60, 40);
    expect(reglePartsCapital.evaluer({ ...o, associes: [...o.associes].reverse() })).toEqual({ resultat: 'OK' });
  });

  it('cas-normaux-ok', () => {
    expect(reglePartsCapital.evaluer(parts(100, 60, 40))).toEqual({ resultat: 'OK' });
    expect(regleLiberation.evaluer(libe(2500))).toEqual({ resultat: 'OK' });
    expect(regleDividendeGerant.evaluer(gerant(10000))).toEqual({ resultat: 'OK' });
    expect(regleRelectureExercice.evaluer(relecture(1000))).toEqual({ resultat: 'OK' });
  });

  it('gerant-non-majoritaire-non-applicable', () => {
    expect(regleDividendeGerant.evaluer(gerant(99999, 'associe'))).toEqual({ resultat: 'NON_APPLICABLE' });
  });

  it('exception-donne-impossible', () => {
    const cas: [RegleControle<never>, unknown][] = [
      [reglePartsCapital as RegleControle<never>, { associes: [{ id: 'x', parts: Number.NaN }], partsCapital: 1 }],
      [regleLiberation as RegleControle<never>, { ...libe(1), verse: 1.5 }],
      [regleDividendeGerant as RegleControle<never>, { ...gerant(1), seuilPointsDeBase: Number.POSITIVE_INFINITY }],
      [regleRelectureExercice as RegleControle<never>, { ecritures: null, instantane: null }],
    ];
    for (const [regle, donnee] of cas) {
      const traces = executerControles([regle], [{ type: 'x', id: 'o', donnee: donnee as never }], 'a_la_demande', HORO);
      expect(traces).toHaveLength(1);
      expect(traces[0]?.resultat).toBe('IMPOSSIBLE');
    }
  });

  it('versions-et-blocages-presents', () => {
    expect(reglePartsCapital).toMatchObject({
      id: 'CC-PM04',
      version: 1,
      gravite: 'B',
      bloque: ['cloture'],
      declencheurs: ['avant_cloture', 'a_la_demande'],
      actif: true,
    });
    expect(regleLiberation).toMatchObject({ id: 'CC-PM05', version: 1, gravite: 'B', bloque: ['cloture'] });
    expect(regleDividendeGerant).toMatchObject({ id: 'CC-PM06', version: 1, gravite: 'B', bloque: ['cloture'] });
    expect(regleRelectureExercice).toMatchObject({
      id: 'CC-PM07',
      version: 1,
      gravite: 'B',
      bloque: ['export', 'cloture'],
      declencheurs: ['avant_export', 'nocturne', 'a_la_demande'],
      actif: true,
    });
    for (const r of [regleLiberation, regleDividendeGerant]) {
      expect(r.declencheurs).toEqual(['avant_cloture', 'a_la_demande']);
    }
  });
});
