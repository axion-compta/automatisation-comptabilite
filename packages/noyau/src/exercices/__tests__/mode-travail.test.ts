import { describe, expect, it } from 'vitest';
import { ErreurModeTravail, lireModeTravail, modeDeLExercice } from '../mode-travail.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurModeTravail ? e.code : 'autre';
  }
  return undefined;
};

describe('mode-travail', () => {
  it('mode-trois-valeurs-acceptees', () => {
    for (const m of ['autonome', 'saisie_seule', 'expert_complet']) {
      expect(lireModeTravail(m)).toBe(m);
    }
  });
  it('mode-assiste-refuse', () => {
    for (const v of ['assiste', 'Autonome', 'EXPERT_COMPLET', ' autonome', 'saisie-seule']) {
      expect(code(() => lireModeTravail(v))).toBe('mode_inconnu');
    }
  });
  it('mode-vide-refuse', () => {
    for (const v of ['', ' ', undefined, null, 0, NaN, {}, ['autonome']]) {
      expect(code(() => lireModeTravail(v))).toBe('mode_inconnu');
    }
  });
  it('exercice-herite-de-la-societe', () => {
    const societe = { modeTravail: 'saisie_seule' } as const;
    expect(modeDeLExercice(societe)).toBe('saisie_seule');
    expect(modeDeLExercice(societe, {})).toBe('saisie_seule');
    expect(modeDeLExercice(societe, { modeTravail: undefined })).toBe('saisie_seule');
  });
  it('exercice-surcharge-la-societe', () => {
    const societe = { modeTravail: 'autonome' } as const;
    expect(modeDeLExercice(societe, { modeTravail: 'expert_complet' })).toBe('expert_complet');
    expect(modeDeLExercice(societe, { modeTravail: 'saisie_seule' })).toBe('saisie_seule');
  });
});
