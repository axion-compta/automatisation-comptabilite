import { describe, expect, it } from 'vitest';
import { ParametreDate, parametresFictifs, valeurALaDate } from '../index.js';

describe('parametres datés', () => {
  it('les 2 entrées fictives sont valides', () => {
    expect(parametresFictifs).toHaveLength(2);
    for (const p of parametresFictifs) expect(ParametreDate.safeParse(p).success).toBe(true);
  });

  it('refuse une date mal formée', () => {
    expect(ParametreDate.safeParse({ ...parametresFictifs[0], debut: '01/01/2025' }).success).toBe(false);
  });

  it('refuse une fin antérieure au début', () => {
    expect(ParametreDate.safeParse({ ...parametresFictifs[0], fin: '2024-01-01' }).success).toBe(false);
  });

  it('retourne la valeur en vigueur à la date', () => {
    expect(valeurALaDate(parametresFictifs, 'PARAM_FICTIF_A', '2025-06-15')).toBe('valeur-a');
    expect(valeurALaDate(parametresFictifs, 'PARAM_FICTIF_A', '2026-03-01')).toBe('valeur-b');
    expect(valeurALaDate(parametresFictifs, 'PARAM_FICTIF_A', '2024-12-31')).toBeUndefined();
    expect(valeurALaDate(parametresFictifs, 'INCONNU', '2026-03-01')).toBeUndefined();
  });
});
