import { describe, expect, it } from 'vitest';
import { ErreurRgpd } from '../types.js';
import {
  echeancesFaille,
  echeancesViolation,
  etatEcheances,
  resultatExercice,
  validerLigneRegistre,
} from '../violations.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
}

const D = '2026-03-10T12:00:00Z';
const REGLAGES = { qualificationHeures: 5, informationSocieteHeures: 7, autoriteHeures: 30, retourExperienceJours: 2 };
const ligne = {
  detecteeLe: D,
  faitsLe: '2026-03-10T09:30:00Z',
  nature: 'perte de confidentialité',
  donneesConcernees: 'coordonnées fictives',
  personnesConcernees: 'exemple',
  consequences: 'aucune constatée',
  mesures: 'accès coupé',
  societesInformees: [{ societeRef: 'societe-a', le: '2026-03-10T13:00:00Z' }],
  notificationAutorite: { faite: true as const, le: '2026-03-11T08:00:00Z' },
  clotureLe: '2026-03-20T10:00:00Z',
};

describe('violations de données', () => {
  it('echeances-depuis-la-detection', () => {
    expect(echeancesViolation(D, REGLAGES)).toEqual({
      qualifierAvant: '2026-03-10T17:00:00Z',
      informerSocietesAvant: '2026-03-10T19:00:00Z',
      autoriteAvant: '2026-03-11T18:00:00Z',
      retourExperienceAvant: '2026-03-12T12:00:00Z',
    });
    expect(echeancesFaille(D, { qualificationHeures: 3, premiereAlerteHeures: 9 })).toEqual({
      qualifierAvant: '2026-03-10T15:00:00Z',
      premiereAlerteAvant: '2026-03-10T21:00:00Z',
    });
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 0, -2, 1.5]) {
      expect(code(() => echeancesViolation(D, { ...REGLAGES, autoriteHeures: mauvais }))).toBe('delai_invalide');
      expect(code(() => echeancesViolation(D, { ...REGLAGES, retourExperienceJours: mauvais }))).toBe('delai_invalide');
      expect(code(() => echeancesFaille(D, { qualificationHeures: mauvais, premiereAlerteHeures: 9 }))).toBe(
        'delai_invalide',
      );
    }
    expect(code(() => echeancesViolation('2026-03-10', REGLAGES))).toBe('horodatage_invalide');
  });

  it('echeance-traverse-le-jour-et-le-mois', () => {
    const e = echeancesViolation('2026-02-28T22:00:00Z', REGLAGES);
    expect(e.informerSocietesAvant).toBe('2026-03-01T05:00:00Z');
    expect(e.retourExperienceAvant).toBe('2026-03-02T22:00:00Z');
    expect(echeancesViolation('2028-02-28T23:00:00Z', REGLAGES).qualifierAvant).toBe('2028-02-29T04:00:00Z');
  });

  it('etat-faite-a-temps-ou-en-retard', () => {
    const e = echeancesViolation(D, REGLAGES);
    const faits = {
      qualifierAvant: e.qualifierAvant,
      informerSocietesAvant: '2026-03-10T19:00:01Z',
    };
    expect(etatEcheances(e, faits, '2026-03-11T00:00:00Z')).toEqual({
      qualifierAvant: 'faite_a_temps',
      informerSocietesAvant: 'faite_en_retard',
      autoriteAvant: 'a_faire',
      retourExperienceAvant: 'a_faire',
    });
    expect(code(() => etatEcheances(e, { qualifierAvant: 'hier' }, D))).toBe('horodatage_invalide');
  });

  it('depassee-sans-action', () => {
    const e = echeancesViolation(D, REGLAGES);
    expect(etatEcheances(e, {}, e.qualifierAvant).qualifierAvant).toBe('a_faire');
    expect(etatEcheances(e, {}, '2026-03-10T17:00:01Z').qualifierAvant).toBe('depassee');
    expect(etatEcheances(e, {}, '2026-03-10T17:00:01Z').informerSocietesAvant).toBe('a_faire');
  });

  it('ligne-registre-valide', () => {
    expect(code(() => validerLigneRegistre(ligne))).toBeUndefined();
    const sans = { ...ligne, clotureLe: null, notificationAutorite: { faite: false as const, motif: 'sans risque' } };
    expect(code(() => validerLigneRegistre(sans))).toBeUndefined();
    expect(code(() => validerLigneRegistre({ ...ligne, nomPersonne: 'x' } as never))).toBe('valeur_interdite');
    expect(code(() => validerLigneRegistre({ ...ligne, clotureLe: '2026-03-10T11:59:59Z' }))).toBe('ordre_invalide');
    expect(code(() => validerLigneRegistre({ ...ligne, detecteeLe: '2026-02-30T10:00:00Z' }))).toBe(
      'horodatage_invalide',
    );
    expect(code(() => validerLigneRegistre({ ...ligne, societesInformees: [{ societeRef: '', le: D }] }))).toBe(
      'objet_inconnu',
    );
    expect(code(() => validerLigneRegistre({ ...ligne, societesInformees: [{ societeRef: 'a', le: 'x' }] }))).toBe(
      'horodatage_invalide',
    );
  });

  it('notification-non-sans-motif-refusee', () => {
    for (const motif of ['', '   ']) {
      const l = { ...ligne, notificationAutorite: { faite: false as const, motif } };
      expect(code(() => validerLigneRegistre(l))).toBe('motif_manquant');
    }
    const l = { ...ligne, notificationAutorite: { faite: true as const, le: 'demain' } };
    expect(code(() => validerLigneRegistre(l))).toBe('horodatage_invalide');
  });

  it('faits-apres-detection-refuses', () => {
    expect(code(() => validerLigneRegistre({ ...ligne, faitsLe: '2026-03-10T12:00:01Z' }))).toBe('ordre_invalide');
    expect(code(() => validerLigneRegistre({ ...ligne, faitsLe: D }))).toBeUndefined();
  });

  it('exercice-t-exp-14', () => {
    const base = { debutLe: D, messageSocietePretLe: '2026-03-11T11:00:00Z', dossierAutoritePretLe: '2026-03-11T10:00:00Z', arretUrgenceActions: 1 };
    const limite = { limiteHeures: 24 };
    expect(resultatExercice(base, limite)).toEqual({ reussi: true, raisons: [] });
    const tard = '2026-03-11T12:00:01Z';
    expect(resultatExercice({ ...base, messageSocietePretLe: '2026-03-11T12:00:00Z' }, limite).reussi).toBe(true);
    expect(resultatExercice({ ...base, messageSocietePretLe: tard }, limite)).toEqual({
      reussi: false,
      raisons: ['message_en_retard'],
    });
    expect(resultatExercice({ ...base, dossierAutoritePretLe: tard }, limite).raisons).toEqual(['dossier_en_retard']);
    expect(resultatExercice({ ...base, dossierAutoritePretLe: null, messageSocietePretLe: null }, limite).raisons).toEqual([
      'message_en_retard',
      'dossier_en_retard',
    ]);
    expect(resultatExercice({ ...base, arretUrgenceActions: 2 }, limite)).toEqual({
      reussi: false,
      raisons: ['arret_plus_d_une_action'],
    });
    expect(resultatExercice({ ...base, arretUrgenceActions: null }, limite).raisons).toEqual(['arret_non_essaye']);
    expect(code(() => resultatExercice({ ...base, arretUrgenceActions: 0 }, limite))).toBe('entier_invalide');
    expect(code(() => resultatExercice(base, { limiteHeures: Number.NaN }))).toBe('delai_invalide');
    expect(code(() => resultatExercice({ ...base, messageSocietePretLe: '2026-03-10T11:00:00Z' }, limite))).toBe(
      'ordre_invalide',
    );
  });
});
