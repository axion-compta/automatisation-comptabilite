import { describe, expect, it } from 'vitest';
import { analyserTva, cleTvaFrance, normaliserIdentifiant, sirenValide, siretValide } from '../identifiants.js';

// Complète un préfixe de chiffres par la clé de Luhn (calcul indépendant du code testé).
function avecCle(prefixe: string): string {
  for (let d = 0; d < 10; d += 1) {
    const candidat = prefixe + String(d);
    let somme = 0;
    [...candidat].reverse().forEach((ch, i) => {
      const v = Number(ch) * (i % 2 === 1 ? 2 : 1);
      somme += v > 9 ? v - 9 : v;
    });
    if (somme % 10 === 0) return candidat;
  }
  throw new Error('inatteignable');
}
const SIREN = avecCle('12345678');
const SIREN_B = avecCle('87654321');
const fauxSiren = (s: string): string => s.slice(0, 8) + String((Number(s[8]) + 1) % 10);
const cleFr = (s: string): string => String((12 + 3 * (Number(s) % 97)) % 97).padStart(2, '0');

describe('identifiants', () => {
  it('siren-valide', () => {
    expect(sirenValide(SIREN)).toBe(true);
    expect(sirenValide(SIREN_B)).toBe(true);
    expect(sirenValide(avecCle('00000000'))).toBe(true);
  });
  it('siren-cle-fausse', () => {
    expect(sirenValide(fauxSiren(SIREN))).toBe(false);
    expect(sirenValide(fauxSiren(SIREN_B))).toBe(false);
  });
  it('siren-mauvaise-longueur', () => {
    for (const s of [SIREN.slice(1), avecCle(SIREN), '', 'abcdefghi', '12345678a', SIREN + ' ', ' ' + SIREN, SIREN.slice(0, 8) + 'x']) expect(sirenValide(s)).toBe(false);
    expect(siretValide(SIREN)).toBe(false);
    expect(siretValide('')).toBe(false);
  });
  it('siret-valide', () => {
    const siret = avecCle(SIREN + '0001');
    expect(siret).toHaveLength(14);
    expect(siretValide(siret)).toBe(true);
    expect(siretValide(siret.slice(0, 13) + String((Number(siret[13]) + 1) % 10))).toBe(false);
    expect(siretValide(siret.slice(1))).toBe(false);
    expect(siretValide(siret + '0')).toBe(false);
    expect(siretValide('1234567890123a')).toBe(false);
    expect(siretValide(' ' + siret)).toBe(false);
    expect(siretValide(siret + ' ')).toBe(false);
  });
  it('tva-fr-cle-calculee', () => {
    for (const s of [SIREN, SIREN_B, avecCle('00000000'), avecCle('99999999')]) {
      expect(cleTvaFrance(s)).toBe(Number(cleFr(s)));
      expect(analyserTva('FR' + cleFr(s) + s)).toEqual({ statut: 'valide', pays: 'FR', siren: s });
    }
    expect(cleTvaFrance('000000000')).toBe(12);
    expect(() => cleTvaFrance('123')).toThrow();
    expect(() => cleTvaFrance(SIREN + '0')).toThrow();
    expect(() => cleTvaFrance('12345678x')).toThrow();
    expect(() => cleTvaFrance(' ' + SIREN)).toThrow();
  });
  it('tva-fr-cle-fausse', () => {
    const bonne = Number(cleFr(SIREN));
    const fausse = String((bonne + 1) % 97).padStart(2, '0');
    expect(analyserTva('FR' + fausse + SIREN)).toEqual({ statut: 'cle_fausse', pays: 'FR' });
    expect(analyserTva('FR' + cleFr(fauxSiren(SIREN)) + fauxSiren(SIREN))).toEqual({ statut: 'cle_fausse', pays: 'FR' });
  });
  it('tva-autre-pays-format-non-verifie', () => {
    expect(analyserTva('FRAB' + SIREN)).toEqual({ statut: 'format_non_verifie', pays: 'FR' });
    expect(analyserTva('FR1A' + SIREN)).toEqual({ statut: 'format_non_verifie', pays: 'FR' });
    expect(analyserTva('BE0123456789')).toEqual({ statut: 'format_non_verifie', pays: 'BE' });
    expect(analyserTva('DE12')).toEqual({ statut: 'format_non_verifie', pays: 'DE' });
    expect(analyserTva('NL123456789B01')).toEqual({ statut: 'format_non_verifie', pays: 'NL' });
    expect(analyserTva('DE1')).toEqual({ statut: 'illisible' });
    expect(analyserTva('DE1234567890123')).toEqual({ statut: 'illisible' });
    for (const t of ['', '12345', 'F', 'FR12', 'FR1234', 'FR' + cleFr(SIREN) + SIREN + '0', '1A123456', 'DE12_34']) expect(analyserTva(t)).toEqual({ statut: 'illisible' });
  });
  it('normalisation-espaces-points', () => {
    expect(normaliserIdentifiant(' fr 12.34-56 78 90 ')).toBe('FR1234567890');
    expect(normaliserIdentifiant('ab\tc\n')).toBe('ABC');
    const brut = 'fr ' + cleFr(SIREN) + ' ' + SIREN.slice(0, 3) + '.' + SIREN.slice(3, 6) + '-' + SIREN.slice(6);
    expect(analyserTva(brut)).toEqual({ statut: 'valide', pays: 'FR', siren: SIREN });
  });
});
