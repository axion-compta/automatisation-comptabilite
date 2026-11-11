import { describe, expect, it } from 'vitest';
import { poserArret, reprendre, type Drapeaux } from '../../securite/arret.js';
import { compteRenduExercice, type EntreeExercice } from '../exercice-violation.js';
import { ErreurRgpd } from '../types.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
};
const T = 'societe-temoin';
const AUTRE = 'societe-autre';
const D = '2026-03-10T12:00:00Z';
const vide: Drapeaux = { societes: {} };
const a1 = poserArret(vide, { societeId: T }, 'personne-a', '2026-03-10T12:05:00Z');
const arret = a1.evenement!;
const reprise = reprendre(a1.drapeaux, { societeId: T }, { id: 'personne-a', role: 'administrateur' }, '2026-03-10T12:30:00Z');
const rep = reprise.ok ? reprise.evenement : undefined;
const arretAutre = poserArret(vide, { societeId: AUTRE }, 'personne-a', '2026-03-10T12:06:00Z').evenement!;
const arretGlobal = poserArret(vide, 'global', 'personne-a', '2026-03-10T12:07:00Z').evenement!;
const base: EntreeExercice = {
  societeTemoin: T,
  societesTemoins: [T],
  debutLe: D,
  finLe: '2026-03-11T13:00:00Z',
  messageSocietePretLe: '2026-03-11T11:00:00Z',
  dossierAutoritePretLe: '2026-03-11T10:00:00Z',
  arretUrgenceActions: 1,
  evenementsArret: [arret, rep!],
};
const L = { limiteHeures: 24 };
const cr = (o: Partial<EntreeExercice>, l = L) => compteRenduExercice({ ...base, ...o }, l);
const err = (o: Partial<EntreeExercice>, l = L) => code(() => cr(o, l));

describe('exercice à blanc de violation', () => {
  it('exercice-reussi-sur-la-societe-temoin', () => {
    expect(rep).toBeDefined();
    const r = cr({});
    expect(r.reussi).toBe(true);
    expect(r.raisons).toEqual([]);
    expect(r.ligne).toEqual({
      type: 'rgpd.exercice_a_blanc',
      horodatage: base.finLe,
      donnees: { reussi: true, raisons: '', societeTemoin: T },
    });
  });

  it('borne-a-la-seconde', () => {
    expect(cr({ messageSocietePretLe: '2026-03-11T12:00:00Z', dossierAutoritePretLe: '2026-03-11T12:00:00Z' }).reussi).toBe(true);
    const m = cr({ messageSocietePretLe: '2026-03-11T12:00:01Z' });
    expect(m.raisons).toEqual(['message_en_retard']);
    expect(m.ligne.donnees.raisons).toBe('message_en_retard');
    expect(cr({ dossierAutoritePretLe: '2026-03-11T12:00:01Z' }).raisons).toEqual(['dossier_en_retard']);
    const deux = cr({ messageSocietePretLe: null, dossierAutoritePretLe: null });
    expect(deux.raisons).toEqual(['dossier_en_retard', 'message_en_retard']);
    expect(deux.ligne.donnees.raisons).toBe('dossier_en_retard,message_en_retard');
  });

  it('arret-global-ou-autre-societe-refuse', () => {
    for (const mauvais of [arretGlobal, arretAutre]) {
      expect(err({ evenementsArret: [arret, mauvais, rep!] })).toBe('valeur_interdite');
      expect(err({ evenementsArret: [mauvais] })).toBe('valeur_interdite');
    }
  });

  it('reprise-absente-ou-arret-repose-apres-reprise', () => {
    expect(cr({ evenementsArret: [arret] }).raisons).toEqual(['reprise_absente']);
    const repose = poserArret(vide, { societeId: T }, 'personne-b', '2026-03-10T13:00:00Z').evenement!;
    const r = cr({ evenementsArret: [arret, rep!, repose] });
    expect(r.reussi).toBe(false);
    expect(r.raisons).toEqual(['reprise_absente']);
    expect(r.ligne.donnees.reussi).toBe(false);
    const ordre = cr({ evenementsArret: [rep!, arret] });
    expect(ordre.reussi).toBe(true);
    expect(cr({ evenementsArret: [rep!, repose] }).raisons).toEqual(['reprise_absente']);
  });

  it('actions-sans-evenement-d-arret-refusees', () => {
    expect(err({ evenementsArret: [] })).toBe('ordre_invalide');
    expect(err({ evenementsArret: [rep!] })).toBe('ordre_invalide');
    expect(cr({ arretUrgenceActions: null, evenementsArret: [] }).raisons).toEqual(['arret_non_essaye']);
  });

  it('evenement-hors-de-l-exercice-refuse', () => {
    const tot = poserArret(vide, { societeId: T }, 'personne-a', '2026-03-10T11:59:59Z').evenement!;
    const tard = poserArret(vide, { societeId: T }, 'personne-a', '2026-03-11T13:00:01Z').evenement!;
    expect(err({ evenementsArret: [tot, rep!] })).toBe('ordre_invalide');
    expect(err({ evenementsArret: [arret, tard] })).toBe('ordre_invalide');
    expect(cr({ evenementsArret: [arret, { ...rep!, horodatage: base.finLe }] }).reussi).toBe(true);
    expect(err({ finLe: '2026-03-10T11:00:00Z' })).toBe('ordre_invalide');
    expect(err({ finLe: 'pas-une-date' })).toBe('horodatage_invalide');
  });

  it('temoin-hors-liste-refusee', () => {
    expect(err({ societeTemoin: '' })).toBe('valeur_interdite');
    expect(err({ societeTemoin: AUTRE })).toBe('valeur_interdite');
    expect(err({ societesTemoins: [] })).toBe('valeur_interdite');
    expect(err({ societeTemoin: undefined as never })).toBe('valeur_interdite');
  });

  it('cas-limites-de-nombres', () => {
    for (const n of [Number.NaN, 1.5, 0, -1]) expect(err({ arretUrgenceActions: n })).toBe('entier_invalide');
    expect(cr({ arretUrgenceActions: 2 }).raisons).toEqual(['arret_plus_d_une_action']);
    for (const h of [Number.NaN, Number.POSITIVE_INFINITY, 0]) expect(err({}, { limiteHeures: h })).toBe('delai_invalide');
  });

  it('ligne-sans-nom-et-entree-non-modifiee', () => {
    const copie = structuredClone(base);
    const r = cr({});
    expect(base).toEqual(copie);
    expect(Object.keys(r.ligne.donnees).sort()).toEqual(['raisons', 'reussi', 'societeTemoin']);
    expect(JSON.stringify(r)).not.toMatch(/personne-a|@/);
  });
});
