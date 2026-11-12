import { describe, expect, it } from 'vitest';
import { datesModifiables, datesParDefaut, PHRASE_DATES_MODIFIABLES } from '../dates-modifiables.js';

const exercice = { id: 'ex-2026', debut: '2026-01-01', fin: '2026-12-31' };

describe('dates-modifiables', () => {
  it('modifiable-sans-ecriture-validee', () => {
    expect(datesModifiables(exercice, 0)).toEqual({ ok: true });
  });

  it('refus-apres-premiere-validation', () => {
    expect(datesModifiables(exercice, 1)).toEqual({ refus: 'ecriture_deja_validee' });
    expect(datesModifiables(exercice, 250)).toEqual({ refus: 'ecriture_deja_validee' });
    // Compteur douteux : refus par prudence.
    expect(datesModifiables(exercice, -1)).toEqual({ refus: 'ecriture_deja_validee' });
    expect(datesModifiables(exercice, Number.NaN)).toEqual({ refus: 'ecriture_deja_validee' });
    expect(datesModifiables(exercice, 0.5)).toEqual({ refus: 'ecriture_deja_validee' });
  });

  it('phrase-explication-presente', () => {
    expect(PHRASE_DATES_MODIFIABLES.length).toBeGreaterThan(0);
    expect(PHRASE_DATES_MODIFIABLES.split(/\s+/).length).toBeLessThanOrEqual(12);
  });

  it('dates-par-defaut', () => {
    expect(datesParDefaut(2026)).toEqual({ debut: '2026-01-01', fin: '2026-12-31' });
  });
});
