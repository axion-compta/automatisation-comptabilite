import { describe, expect, it } from 'vitest';
import { type ProfilEcheances, type TypeEcheance, ErreurCatalogue } from '../../echeances/catalogue.js';
import type { Calendrier } from '../../echeances/jours-ouvres.js';
import { echeancesSociete } from '../calendrier.js';

// Délais INVENTÉS (3 mois) ; samedi et dimanche non ouvrés.
const cal: Calendrier = { joursNonOuvres: [6, 7], feries: [] };
const profil: ProfilEcheances = { avecSalaries: false, avecVehicule: false };
const type: TypeEcheance = {
  code: 'depot-test', ancrage: 'cloture', decalage: { mois: 3, jours: 0 }, report: 'suivant', condition: {},
  statutSource: 'verifie', niveau: 'preparee', rappelsJours: [], legale: true,
  source: 'https://exemple.invalid/source', releveLe: '2026-01-15',
};
const avec = (p: Partial<TypeEcheance>): TypeEcheance => ({ ...type, ...p });
const annee = (debut: string, fin: string) => ({ debut, fin });
const dates = (t: TypeEcheance, debut: string, fin: string) => echeancesSociete([t], profil, annee(debut, fin), cal).map((e) => e.dateLimite);
const code = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurCatalogue ? e.code : 'autre';
  }
  return 'aucune';
};

describe('échéances ancrées sur l’année comptable de la société', () => {
  it('chaque-date-a-source-et-releve', () => {
    const [e] = echeancesSociete([type], profil, annee('2026-01-01', '2026-12-31'), cal);
    expect(e).toMatchObject({ source: 'https://exemple.invalid/source', releveLe: '2026-01-15', dateAVerifier: false });
    expect(code(() => echeancesSociete([avec({ releveLe: '2026-02-30' })], profil, annee('2026-01-01', '2026-12-31'), cal))).toBe('releve_invalide');
    expect(code(() => echeancesSociete([avec({ source: '' })], profil, annee('2026-01-01', '2026-12-31'), cal))).toBe('source_invalide');
  });
  it('sans-releve-a-verifier', () => {
    const sans = avec({});
    delete sans.releveLe;
    const [e] = echeancesSociete([sans], profil, annee('2026-01-01', '2026-12-31'), cal);
    expect(e?.dateAVerifier).toBe(true);
    expect(e?.releveLe).toBeUndefined();
    const sansSource = avec({});
    delete sansSource.source;
    expect(echeancesSociete([sansSource], profil, annee('2026-01-01', '2026-12-31'), cal)[0]).toMatchObject({ dateAVerifier: true, releveLe: '2026-01-15' });
  });
  it('ancrage-non-gere-signale', () => {
    const an = ['2026-01-01', '2026-12-31'] as const;
    for (const ancrage of ['creation', 'periode'] as const) expect(code(() => dates(avec({ ancrage }), ...an))).toBe('ancrage_non_gere');
    // Écarté par le profil (condition non remplie) : pas d'erreur, rien à calculer.
    expect(dates(avec({ ancrage: 'creation', condition: { avecSalaries: true } }), ...an)).toEqual([]);
  });
  it('cloture-au-30-juin-decale-les-echeances', () => {
    expect(dates(type, '2026-07-01', '2027-06-30')).toEqual(['2027-09-30']);
    // Ancrage « année civile » : l'année de la fin de l'année comptable, pas celle du début.
    expect(dates(avec({ ancrage: 'annee_civile' }), '2026-07-01', '2027-06-30')).toEqual(['2028-03-31']);
  });
  it('cloture-au-31-decembre-inchangee', () => {
    expect(dates(type, '2026-01-01', '2026-12-31')).toEqual(['2027-03-31']);
  });
  it('report-jour-ouvre-conserve', () => {
    // 2027-07-30 + 3 mois = samedi 2027-10-30 → lundi 2027-11-01 ; en « aucun » la date reste.
    expect(dates(type, '2026-08-01', '2027-07-30')).toEqual(['2027-11-01']);
    expect(dates(avec({ report: 'precedent' }), '2026-08-01', '2027-07-30')).toEqual(['2027-10-29']);
    expect(dates(avec({ report: 'aucun' }), '2026-08-01', '2027-07-30')).toEqual(['2027-10-30']);
  });
  it('annee-de-dix-huit-mois', () => {
    expect(dates(type, '2026-01-01', '2027-06-30')).toEqual(['2027-09-30']);
    expect(code(() => dates(type, '2027-01-01', '2026-12-31'))).toBe('annee_invalide');
    expect(code(() => dates(type, '2026-01-01', '2026-13-31'))).toBe('annee_invalide');
    expect(code(() => dates(type, '2026-02-30', '2026-12-31'))).toBe('annee_invalide');
    expect(dates(type, '2026-12-31', '2026-12-31')).toEqual(['2027-03-31']);
  });
});
