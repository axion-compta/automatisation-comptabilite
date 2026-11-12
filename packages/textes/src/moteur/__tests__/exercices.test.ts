import { describe, expect, it } from 'vitest';
import { PHRASE_DATES_MODIFIABLES, PHRASE_DATES_VERROUILLEES, phraseDatesParDefaut } from '../exercices.js';

describe('textes exercices', () => {
  it('date-par-defaut-1er-janvier-31-decembre', () => {
    expect(phraseDatesParDefaut(2026)).toBe('Du 1er janvier 2026 au 31 décembre 2026');
    expect(() => phraseDatesParDefaut(26)).toThrow();
    expect(() => phraseDatesParDefaut(Number.NaN)).toThrow();
    expect(() => phraseDatesParDefaut(12026)).toThrow();
    expect(() => phraseDatesParDefaut(-2026)).toThrow();
    expect(() => phraseDatesParDefaut(2026.5)).toThrow();
  });

  it('phrases-courtes-sans-mot-interdit', () => {
    for (const p of [PHRASE_DATES_MODIFIABLES, PHRASE_DATES_VERROUILLEES]) {
      expect(p.split(/\s+/).length).toBeLessThanOrEqual(12);
      expect(p).not.toMatch(/conforme|sans erreur|garanti|juriste|PDP/i);
    }
  });
});
