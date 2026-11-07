import { describe, expect, it } from 'vitest';
import { genererSources, serialiserSources } from '../sources.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const GRAINES = [0, -1, 1, 2, 3, 4, 5, 6, 7, 8, 20260101, -20260101];

describe('sources fictives', () => {
  it('connecteurs-fictifs-un-degrade', () => {
    const s = genererSources();
    expect(s.connecteurs.map((c) => c.connecteur)).toEqual(['annuaire_entreprises', 'tva_intracom', 'plateforme_agreee']);
    expect(s.connecteurs.filter((c) => c.etat === 'degrade')).toHaveLength(1);
    expect(serialiserSources(genererSources(0))).toBe(serialiserSources(genererSources(0)));
    expect(serialiserSources(genererSources(-3))).toBe(serialiserSources(genererSources(-3)));
  });

  it('veille-en-alerte-depot-interdit', () => {
    const etats = new Set<string>();
    for (const g of GRAINES) {
      const v = genererSources(g).veille;
      etats.add(v.etat);
      if (v.etat === 'alerte') expect(v.depotAutomatiqueAutorise).toBe(false);
      expect(DATE.test(v.dernierBalayage)).toBe(true);
      expect(Number.isNaN(new Date(`${v.dernierBalayage}T00:00:00Z`).getTime())).toBe(false);
    }
    expect(etats.has('alerte')).toBe(true);
  });

  it('option-vide-listes-vides', () => {
    expect(genererSources(undefined, { vide: true }).connecteurs).toEqual([]);
    expect(genererSources(0, { vide: true }).connecteurs).toEqual([]);
  });

  it('aucun-mot-interdit', () => {
    const interdits = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join('').toLowerCase());
    const texte = serialiserSources(genererSources()).toLowerCase();
    for (const mot of interdits) expect(texte).not.toContain(mot);
  });
});
