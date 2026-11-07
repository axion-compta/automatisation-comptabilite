import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../au-jour.js';
import { ErreurFrontiere, datesFrontieres, verifierFrontieres } from '../frontieres.js';

const l = (cle: string, debut: string, fin: string | null, statut: ParametreLegal['statut'] = 'a_verifier'): ParametreLegal => ({
  cle,
  pays: 'FR',
  valeur: 'v',
  effet_debut: debut,
  effet_fin: fin,
  statut,
  source: 'Source inventée',
  date_releve: '2026-01-01',
});

describe('frontières', () => {
  it('veille-jour-lendemain', () => {
    expect(datesFrontieres('2026-06-15')).toEqual({ veille: '2026-06-14', jour: '2026-06-15', lendemain: '2026-06-16' });
    expect(datesFrontieres('2026-07-01').veille).toBe('2026-06-30');
    expect(datesFrontieres('2026-06-30').lendemain).toBe('2026-07-01');
  });
  it('premier-janvier', () => {
    expect(datesFrontieres('2026-01-01')).toEqual({ veille: '2025-12-31', jour: '2026-01-01', lendemain: '2026-01-02' });
    expect(datesFrontieres('2026-12-31').lendemain).toBe('2027-01-01');
  });
  it('annee-bissextile', () => {
    expect(datesFrontieres('2028-03-01').veille).toBe('2028-02-29');
    expect(datesFrontieres('2027-03-01').veille).toBe('2027-02-28');
    expect(datesFrontieres('2028-02-28').lendemain).toBe('2028-02-29');
  });
  it('catalogue-sans-ecart', () => {
    const c = [l('a', '2025-01-01', '2026-01-01'), l('a', '2026-01-01', null), l('b', '2026-03-01', null)];
    expect(verifierFrontieres(c, 'FR')).toEqual([]);
    expect(verifierFrontieres([], 'FR')).toEqual([]);
    expect(verifierFrontieres(c, 'BE')).toEqual([]);
  });
  it('chevauchement-detecte', () => {
    const c = [l('a', '2025-01-01', '2026-02-01'), l('a', '2026-01-01', null)];
    const r = verifierFrontieres(c, 'FR');
    expect(r.length).toBeGreaterThan(0);
    expect(r).toContainEqual({ cle: 'a', effet_debut: '2026-01-01', date: '2026-01-01', attendu: '2026-01-01', obtenu: 'parametre_ambigu' });
  });
  it('trou-detecte', () => {
    const c = [l('a', '2025-01-01', '2026-05-31'), l('a', '2026-06-01', null)];
    expect(verifierFrontieres(c, 'FR')).toEqual([
      { cle: 'a', effet_debut: '2026-06-01', date: '2026-05-31', attendu: '2025-01-01', obtenu: 'parametre_absent' },
    ]);
  });
  it('retire-ignore', () => {
    const c = [l('a', '2026-01-01', null), l('a', '2025-06-01', '2025-09-01', 'retire'), l('a', '2027-01-01', '2027-02-01', 'retire')];
    expect(verifierFrontieres(c, 'FR')).toEqual([]);
  });
  it('date-invalide', () => {
    for (const d of ['2026-02-30', '2026-13-01', '2026-1-1', '', 'hier', ' 2026-01-01'])
      expect(() => datesFrontieres(d), d).toThrow(ErreurFrontiere);
    expect(() => verifierFrontieres([l('a', '2026-02-30', null)], 'FR')).toThrow(ErreurFrontiere);
    expect(new ErreurFrontiere('x').code).toBe('date_invalide');
  });
});
