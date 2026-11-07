import { describe, expect, it } from 'vitest';
import { ErreurSimilarite, atteint, similarite, similariteMots, trigrammes } from '../similarite.js';

describe('similarite', () => {
  it('identiques-dix-mille', () => {
    for (const s of ['FICTIVA TELECOM', 'A', 'É', 'AB CD']) {
      expect(similarite(s, s)).toBe(10000);
      expect(similariteMots(s, s)).toBe(10000);
    }
    expect([...trigrammes('AB')].sort()).toEqual(['  A', ' AB', 'AB ']);
  });
  it('rien-en-commun-zero', () => {
    expect(similarite('AAA', 'ZZZ')).toBe(0);
    expect(similarite('A', 'B')).toBe(0);
    expect(similarite('É', 'E')).toBe(0);
    expect(similariteMots('AAA', 'ZZZ')).toBe(0);
  });
  it('symetrique', () => {
    for (const [a, b] of [['FICTIVA TEL', 'FICTIVA TELECOM'], ['DUPONT JEAN', 'JEAN'], ['AB', 'ABC'], ['', 'X']] as const) {
      expect(similarite(a, b)).toBe(similarite(b, a));
      expect(similariteMots(a, b)).toBe(similariteMots(b, a));
    }
  });
  it('noms-inverses-reconnus', () => {
    expect(similarite('DUPONT JEAN', 'JEAN DUPONT')).toBeLessThan(10000);
    expect(similariteMots('DUPONT JEAN', 'JEAN DUPONT')).toBe(10000);
    expect(similariteMots('  DUPONT   JEAN ', 'JEAN DUPONT')).toBe(10000);
    expect(similariteMots('FICTIVA TEL', 'FICTIVA TELECOM')).toBe(6470);
    expect(atteint('DUPONT JEAN', 'JEAN DUPONT', 10000)).toBe(true);
  });
  it('fiction-tel-et-fiction-telecom', () => {
    // 11 trigrammes communs, 12 + 16 - 11 = 17 au total : 110000 / 17 = 6470 (6470 × 17 = 109990 ≤ 110000 < 6471 × 17).
    expect(similarite('FICTIVA TEL', 'FICTIVA TELECOM')).toBe(6470);
  });
  it('seuil-atteint-et-non-atteint', () => {
    const [a, b] = ['FICTIVA TEL', 'FICTIVA TELECOM'];
    expect(atteint(a!, b!, 6470)).toBe(true);
    expect(atteint(a!, b!, 6471)).toBe(false);
    expect(atteint(a!, b!, 6470)).toBe(atteint(b!, a!, 6470));
    expect(atteint('AAA', 'ZZZ', 0)).toBe(true);
    expect(atteint('AAA', 'ZZZ', 1)).toBe(false);
    expect(atteint('AAA', 'AAA', 10000)).toBe(true);
    for (const s of [NaN, Infinity, -Infinity, -1, 10001, 0.5, 8500.1]) {
      expect(() => atteint('A', 'A', s)).toThrow(ErreurSimilarite);
      expect(() => atteint('A', 'A', s)).toThrow('seuil_invalide');
    }
  });
  it('vides', () => {
    // Deux chaînes vides : 0 (rien à comparer, jamais « identiques »).
    expect(similarite('', '')).toBe(0);
    expect(similarite('', 'ABC')).toBe(0);
    expect(similarite('ABC', '')).toBe(0);
    expect(similariteMots('', '')).toBe(0);
    expect(similariteMots(' ', 'ABC')).toBe(0);
    expect(atteint('', '', 1)).toBe(false);
    expect(atteint('', '', 0)).toBe(true);
  });
});
