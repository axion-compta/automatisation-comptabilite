import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { genererBases, mesurer, ecrireRapport, ECRANS } from '../volume.mjs';

const faux = (refuse = () => false) => {
  let t = 0;
  return {
    horloge: () => t,
    connecter: async (b) => !refuse(b),
    executer: async (nom, b) => { t += 10 + (b.lignes % 7); },
  };
};

describe('volume', () => {
  it('generateur-deterministe', () => {
    const a = genererBases({ graine: 7 });
    expect(a).toEqual(genererBases({ graine: 7 }));
    expect(a).not.toEqual(genererBases({ graine: 8 }));
    expect(a).toHaveLength(200);
    expect(a.reduce((s, b) => s + b.lignes, 0)).toBe(500000);
    expect(new Set(a.map((b) => b.societe_id)).size).toBe(200);
    expect(JSON.stringify(a)).not.toMatch(/@|\d{14}/);
    expect(() => genererBases({ bases: 10, lignes: 5 })).toThrow('parametres_invalides');
  });

  it('mesure-compte-les-refus-et-le-p95', async () => {
    const bases = genererBases({ bases: 20, lignes: 1000 });
    const { horloge, connecter, executer } = faux((b) => b.societe_id === 'soc-0003');
    const r = await mesurer({ bases, connecter, executer, horloge, tirages: 2 });
    expect(r.refus).toBe(1);
    expect(r.connexions_ouvertes).toBe(19);
    for (const n of ECRANS) {
      expect(r.ecrans[n].mesures).toBe(38);
      expect(r.ecrans[n].p95_ms).toBeGreaterThanOrEqual(10);
      expect(r.ecrans[n].p95_ms).toBeLessThanOrEqual(16);
    }
    const erreur = await mesurer({ bases, connecter: async () => { throw new Error('x'); }, executer, horloge });
    expect(erreur.refus).toBe(20);
    expect(erreur.ecrans[ECRANS[0]].p95_ms).toBeNull();
  });

  it('mesure-ecrit-le-rapport', async () => {
    const bases = genererBases({ bases: 5, lignes: 50 });
    const { horloge, connecter, executer } = faux();
    const r = await mesurer({ bases, connecter, executer, horloge, tirages: 1 });
    const chemin = join(mkdtempSync(join(tmpdir(), 'banc-')), 'banc-volume.md');
    ecrireRapport(chemin, r, '2026-11-11');
    const texte = readFileSync(chemin, 'utf8');
    expect(texte).toContain('PROPOSÉ');
    expect(texte).toContain('Refus : 0'.toLowerCase());
    expect(texte).toContain('| grand-livre | 5 |');
    expect(texte).not.toMatch(/conforme|sans erreur|garanti|juriste|PDP/);
  });
});
