import { describe, expect, it } from 'vitest';
import { ErreurChat } from '../../chat/types.js';
import { chiffresDits, dateDite, ibanDit, sirenDit } from '../normaliser.js';

const JOUR = '2026-03-15';
const dates = (aujourdhui: string, cas: [string, string | null][]) =>
  cas.forEach(([p, v]) => expect(dateDite(p, aujourdhui), p).toBe(v));
const FR = 'FR00';

describe('voix : dates relatives et identifiants dictés', () => {
  it('hier-et-avant-hier', () => {
    dates(JOUR, [['hier', '2026-03-14'], ['Avant-hier', '2026-03-13'], ["aujourd'hui", JOUR], ['demain', '2026-03-16'], ['bonjour', null], ['', null]]);
  });

  it('passage-de-mois-et-d-annee', () => {
    dates('2026-01-01', [['hier', '2025-12-31'], ['avant-hier', '2025-12-30']]);
    dates('2026-12-31', [['demain', '2027-01-01']]);
    dates('2026-03-01', [['hier', '2026-02-28']]);
  });

  it('annee-bissextile', () => {
    dates('2024-03-01', [['hier', '2024-02-29'], ['le 29 février', '2024-02-29']]);
    dates('2025-03-01', [['hier', '2025-02-28'], ['le 29 février', null], ['le 29 février deux mille vingt-quatre', '2024-02-29'], ['le 29 février deux mille vingt-cinq', null]]);
    dates('2100-03-01', [['hier', '2100-02-28']]);
    dates('2000-03-01', [['hier', '2000-02-29']]);
  });

  it('lundi-dernier-un-lundi', () => {
    dates(JOUR, [['lundi dernier', '2026-03-09'], ['dimanche dernier', '2026-03-08'], ['samedi dernier', '2026-03-14']]);
    dates('2026-03-09', [['lundi dernier', '2026-03-02'], ['le lundi dernier', '2026-03-02'], ['mardi dernier', '2026-03-03']]);
  });

  it('date-future-annee-precedente', () => {
    dates(JOUR, [['le 15 mars', JOUR], ['le 14 mars', '2026-03-14'], ['le 16 mars', '2025-03-16'], ['le 3 mars', '2026-03-03'], ['le 20 décembre', '2025-12-20']]);
    dates(JOUR, [['le trois mars deux mille vingt-six', '2026-03-03'], ['le 3 mars 2030', '2030-03-03'], ['le premier avril', '2025-04-01'], ['le 1er mars', '2026-03-01']]);
  });

  it('date-impossible-null', () => {
    dates(JOUR, [['le 31 février', null], ['le 31 avril', null], ['le 0 mars', null], ['le 32 mars', null], ['le 3 mars 12', null], ['le mars', null], ['le trois', null]]);
  });

  it('aujourdhui-invalide', () => {
    for (const mauvais of ['2026-02-30', '', '01/01/2026', '2026-13-01', '2026-1-1', ' 2026-03-15']) {
      expect(() => dateDite('hier', mauvais), mauvais).toThrow(ErreurChat);
      expect(() => dateDite('hier', mauvais)).toThrow('parametre_invalide');
    }
  });

  it('siren-dicte', () => {
    expect(sirenDit('trois deux un quatre cinq six sept huit neuf')).toBe('321456789');
    expect(sirenDit('123 456 789')).toBe('123456789');
    expect(sirenDit('un deux trois 456 sept huit neuf')).toBe('123456789');
    expect(chiffresDits('trois deux un')).toBe('321');
    expect(chiffresDits('trente-deux')).toBe('32');
    expect(chiffresDits('trente-deux', true)).toBeNull();
    expect(chiffresDits('')).toBeNull();
    expect(chiffresDits('bonjour')).toBeNull();
  });

  it('siren-trop-court-null', () => {
    expect(sirenDit('trois deux un')).toBeNull();
    expect(sirenDit('12345678')).toBeNull();
    expect(sirenDit('1234567890')).toBeNull();
    expect(sirenDit('trente-deux')).toBeNull();
    expect(sirenDit('')).toBeNull();
    expect(sirenDit('12345678a')).toBeNull();
  });

  it('iban-dicte-et-longueurs', () => {
    const corps = '1234'.repeat(3) + 'AB';
    expect(ibanDit('fr 00 ' + corps.replace(/(.{4})/gu, '$1 '))).toBe(FR + corps);
    expect(ibanDit(FR + '1'.repeat(11))).toBe(FR + '1'.repeat(11));
    expect(ibanDit(FR + '1'.repeat(10))).toBeNull();
    expect(ibanDit('FR' + '1'.repeat(32))).toBe('FR' + '1'.repeat(32));
    expect(ibanDit('FR' + '1'.repeat(33))).toBeNull();
    expect(ibanDit('00' + '1'.repeat(20))).toBeNull();
    expect(ibanDit('F1' + '1'.repeat(20))).toBeNull();
    expect(ibanDit('FR zéro zéro ' + 'un '.repeat(11))).toBe(FR + '1'.repeat(11));
    expect(ibanDit('')).toBeNull();
  });
});
