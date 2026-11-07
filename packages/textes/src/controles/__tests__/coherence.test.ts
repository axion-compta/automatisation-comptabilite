import { describe, expect, it } from 'vitest';
import { textesCoherence, type ValeursCoherence } from '../coherence.js';

const IDS = [
  'CC-K01', 'CC-K02', 'CC-K03', 'CC-K04', 'CC-K05', 'CC-K06', 'CC-K07', 'CC-K08', 'CC-K09', 'CC-K10',
  'CC-K11', 'CC-K11M', 'CC-K12', 'CC-K12H', 'CC-K13', 'CC-K13S', 'CC-K14',
];
const V: ValeursCoherence = { montant: '0,30 €', date: '12/10/2026', nom: 'Lemoine Claire', compte: '401000', nombre: '3' };
const phrases = (): string[] => Object.values(textesCoherence).map((f) => f(V));
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));

describe('textes de cohérence', () => {
  it('une-phrase-par-controle', () => {
    expect(Object.keys(textesCoherence)).toEqual(IDS);
    for (const id of IDS) expect(textesCoherence[id]?.(V).length ?? 0).toBeGreaterThan(10);
    expect(new Set(phrases()).size).toBe(IDS.length);
  });

  it('vouvoiement', () => {
    for (const p of phrases()) expect(p).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})/iu);
    expect(textesCoherence['CC-K04']?.(V)).toContain('Relisez-les');
    expect(textesCoherence['CC-K03']?.(V)).toContain('Relisez');
  });

  it('mots-interdits-absents', () => {
    for (const p of phrases()) for (const m of INTERDITS) expect(p.toLowerCase()).not.toContain(m.toLowerCase());
    expect(INTERDITS).toHaveLength(5);
  });

  it('valeurs-inserees', () => {
    expect(textesCoherence['CC-K04']?.(V)).toBe('Les montants de cette facture ne tombent pas juste (écart 0,30 €). Relisez-les.');
    expect(textesCoherence['CC-K13']?.({ ...V, nombre: '3', montant: '758,40 €' })).toBe('3 paiements sans facture (758,40 €).');
    expect(textesCoherence['CC-K14']?.(V)).toBe("Ce document contient des instructions inhabituelles. Il est mis de côté : regardez-le avant de l'utiliser.");
    expect(textesCoherence['CC-K02']?.(V)).toContain('nous corrigeons avant toute déclaration');
    expect(textesCoherence['CC-K02']?.(V)).toContain('12/10/2026');
    expect(textesCoherence['CC-K07']?.(V)).toContain('Lemoine Claire');
    expect(textesCoherence['CC-K08']?.(V)).toContain('401000');
  });

  it('aucun-montant-calcule', () => {
    const v: ValeursCoherence = { montant: 'M', date: 'D', nom: 'N', compte: 'C', nombre: 'X' };
    for (const f of Object.values(textesCoherence)) {
      const p = f(v);
      expect(p.replace(/[MDNCX]/g, '')).not.toMatch(/\d/);
      expect(f.length).toBeLessThanOrEqual(1);
    }
    expect(textesCoherence['CC-K04']?.({ ...v, montant: '1,5' })).toContain('(écart 1,5)');
  });

  it('phrases-terminees', () => {
    for (const p of phrases()) {
      expect(p).toMatch(/[.]$/);
      expect(p).not.toMatch(/\s$|\s{2}|undefined/);
    }
  });
});
