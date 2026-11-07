import { describe, expect, it } from 'vitest';
import { ErreurDate, ajouterJours } from '../../dates/civiles.js';
import { type Calendrier, ErreurCalendrier, estJourOuvre, reporter } from '../jours-ouvres.js';

// Calendrier de TEST : samedi et dimanche non ouvrés, un férié inventé le 2027-05-18.
const cal: Calendrier = { joursNonOuvres: [6, 7], feries: ['2027-05-18'] };
function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurCalendrier ? e.code : 'autre';
  }
  return undefined;
}

describe('jours ouvrés et report', () => {
  it('samedi-reporte-au-lundi', () => {
    expect(reporter('2027-05-15', 'suivant', cal)).toBe('2027-05-17');
    expect(reporter('2027-05-16', 'suivant', cal)).toBe('2027-05-17');
  });

  it('ferie-invente-reporte', () => {
    expect(estJourOuvre('2027-05-18', cal)).toBe(false);
    expect(reporter('2027-05-18', 'suivant', cal)).toBe('2027-05-19');
    const doublon = { ...cal, feries: ['2027-05-18', '2027-05-18'] };
    expect(reporter('2027-05-18', 'suivant', doublon)).toBe('2027-05-19');
    const dix = Array.from({ length: 10 }, (_, i) => `2027-06-${String(7 + i).padStart(2, '0')}`);
    const longue: Calendrier = { joursNonOuvres: [], feries: dix };
    expect(reporter('2027-06-07', 'suivant', longue)).toBe('2027-06-17');
    expect(reporter('2027-06-16', 'precedent', longue)).toBe('2027-06-06');
  });

  it('report-precedent', () => {
    expect(reporter('2027-05-16', 'precedent', cal)).toBe('2027-05-14');
    expect(reporter('2027-05-18', 'precedent', cal)).toBe('2027-05-17');
  });

  it('aucun-report', () => {
    expect(reporter('2027-05-15', 'aucun', cal)).toBe('2027-05-15');
    expect(reporter('2027-05-18', 'aucun', cal)).toBe('2027-05-18');
    expect(() => reporter('2027-02-30', 'aucun', cal)).toThrow(ErreurDate);
  });

  it('jour-ouvre-inchange', () => {
    expect(estJourOuvre('2027-05-17', cal)).toBe(true);
    expect(estJourOuvre('2027-05-15', cal)).toBe(false);
    expect(estJourOuvre('2027-05-16', cal)).toBe(false);
    for (const regle of ['suivant', 'precedent'] as const) expect(reporter('2027-05-17', regle, cal)).toBe('2027-05-17');
  });

  it('calendrier-vide-refuse', () => {
    const tous: Calendrier = { joursNonOuvres: [1, 2, 3, 4, 5, 6, 7, 3], feries: [] };
    expect(code(() => reporter('2027-05-17', 'suivant', tous))).toBe('calendrier_vide');
    expect(code(() => estJourOuvre('2027-05-17', tous))).toBe('calendrier_vide');
    expect(code(() => reporter('2027-05-17', 'suivant', { joursNonOuvres: [0], feries: [] }))).toBe('jour_invalide');
    expect(code(() => reporter('2027-05-17', 'suivant', { joursNonOuvres: [8], feries: [] }))).toBe('jour_invalide');
    expect(code(() => reporter('2027-05-17', 'suivant', { joursNonOuvres: [1.5], feries: [] }))).toBe('jour_invalide');
    expect(code(() => reporter('2027-05-17', 'suivant', { joursNonOuvres: [], feries: ['2027-5-18'] }))).toBe('ferie_invalide');
    expect(code(() => reporter('2027-05-17', 'bizarre' as never, cal))).toBe('regle_invalide');
    const annee = Array.from({ length: 400 }, (_, i) => ajouterJours('2027-01-01', i));
    expect(code(() => reporter('2027-01-01', 'suivant', { joursNonOuvres: [], feries: annee }))).toBe('calendrier_vide');
    const ferieAnnee: Calendrier = { joursNonOuvres: [], feries: [] };
    expect(reporter('2027-05-17', 'suivant', ferieAnnee)).toBe('2027-05-17');
  });
});
