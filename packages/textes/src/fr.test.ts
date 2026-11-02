import { describe, expect, it } from 'vitest';
import { fr } from './fr.ts';

function feuilles(o: Record<string, unknown>): string[] {
  return Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : feuilles(v as Record<string, unknown>)));
}

describe('textes fr', () => {
  it('aucun texte vide ni espace superflu', () => {
    for (const t of feuilles(fr)) {
      expect(t.length).toBeGreaterThan(0);
      expect(t).toBe(t.trim());
    }
  });
  it('contient les actions de base', () => {
    expect(fr.actions.enregistrer).toBe('Enregistrer');
  });
});
