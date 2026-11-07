import { describe, expect, it } from 'vitest';
import { decisionVolume, ErreurFichier, nomDeFeuille, nomDeFichier } from '../fichier.js';

const code = (f: () => unknown) => {
  try {
    f();
  } catch (err) {
    return err instanceof ErreurFichier ? err.code : 'autre';
  }
  return 'aucune';
};
const L = { direct: 7, maximum: 20 };

describe('fichier d\'export', () => {
  it('nom-attendu', () => {
    expect(nomDeFichier('liste', 'societe', '2026-03-09', 'xlsx')).toBe('liste_societe_2026-03-09.xlsx');
    expect(nomDeFichier('a_b-1', 'x0', '2024-02-29', 'xlsx')).toBe('a_b-1_x0_2024-02-29.xlsx');
  });
  it('nom-refuse-texte-de-tiers', () => {
    for (const mauvais of ['../x', 'a b', 'Facture"', '', 'a'.repeat(41), 'A']) {
      expect(code(() => nomDeFichier(mauvais, 's', '2026-03-09', 'csv'))).toBe('nom_invalide');
      expect(code(() => nomDeFichier('l', mauvais, '2026-03-09', 'csv'))).toBe('nom_invalide');
    }
    expect(nomDeFichier('a'.repeat(40), 'b'.repeat(40), '2026-03-09', 'csv')).toContain('a'.repeat(40));
  });
  it('extension-selon-format', () => {
    expect(nomDeFichier('l', 's', '2026-03-09', 'csv').endsWith('.csv')).toBe(true);
    expect(nomDeFichier('l', 's', '2026-03-09', 'xlsx').endsWith('.xlsx')).toBe(true);
  });
  it('feuille-trente-et-un-caracteres-max', () => {
    expect(nomDeFeuille('a'.repeat(31))).toBe('a'.repeat(31));
    expect(code(() => nomDeFeuille('a'.repeat(32)))).toBe('nom_invalide');
    expect(code(() => nomDeFeuille(''))).toBe('nom_invalide');
  });
  it('feuille-caracteres-interdits', () => {
    for (const c of ['\\', '/', '?', '*', '[', ']', ':']) expect(code(() => nomDeFeuille('a' + c + 'b'))).toBe('nom_invalide');
  });
  it('volume-limites-exactes', () => {
    expect(decisionVolume(0, L)).toBe('direct');
    expect(decisionVolume(7, L)).toBe('direct');
    expect(decisionVolume(8, L)).toBe('tache');
    expect(decisionVolume(20, L)).toBe('tache');
    expect(decisionVolume(21, L)).toBe('trop_gros');
    expect(decisionVolume(5, { direct: 5, maximum: 5 })).toBe('direct');
    expect(decisionVolume(6, { direct: 5, maximum: 5 })).toBe('trop_gros');
  });
  it('volume-parametres-invalides', () => {
    for (const p of [{ direct: NaN, maximum: 9 }, { direct: -1, maximum: 9 }, { direct: 1.5, maximum: 9 }, { direct: 9, maximum: 1 }, { direct: 1, maximum: Infinity }, { direct: 1, maximum: NaN }])
      expect(code(() => decisionVolume(1, p))).toBe('parametre_invalide');
    for (const n of [NaN, -1, 1.5, Infinity]) expect(code(() => decisionVolume(n, L))).toBe('parametre_invalide');
  });
  it('jour-invalide-refuse', () => {
    for (const j of ['2026-02-30', '2026-13-01', '', '09/03/2026', '2025-02-29'])
      expect(() => nomDeFichier('l', 's', j, 'csv')).toThrow();
  });
});
