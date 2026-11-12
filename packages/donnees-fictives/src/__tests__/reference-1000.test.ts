import { describe, expect, it } from 'vitest';
import { STRATES, genererReference } from '../reference-1000.js';

describe('jeu de référence de 1 000 pièces', () => {
  it('mille-pieces', () => {
    const jeu = genererReference({ graine: 7 });
    expect(jeu.pieces).toHaveLength(1000);
    expect(jeu.graine).toBe(7);
    expect(() => genererReference({ graine: 1.5 })).toThrow(RangeError);
    expect(() => genererReference({ graine: Number.NaN })).toThrow(RangeError);
    // hors de 0..2^32-1, deux graines donneraient le même jeu : refusées ; bornes incluses acceptées
    for (const g of [-1, 2 ** 32, 2 ** 32 + 1, Infinity, -Infinity]) expect(() => genererReference({ graine: g })).toThrow(RangeError);
    for (const g of [0, 2 ** 32 - 1]) expect(genererReference({ graine: g }).pieces).toHaveLength(1000);
  });

  it('chaque-strate-au-moins-60', () => {
    const jeu = genererReference({ graine: 7 });
    expect(STRATES.length).toBeGreaterThanOrEqual(10);
    for (const s of STRATES) {
      expect(jeu.pieces.filter((p) => p.strate === s).length).toBeGreaterThanOrEqual(60);
    }
    expect(jeu.pieces.every((p) => (STRATES as readonly string[]).includes(p.strate))).toBe(true);
    // marqueur propre à chaque strate
    for (const p of jeu.pieces) {
      const { strate, pages, devise, degradee, attendu } = p;
      if (strate === 'plusieurs_pages') expect(pages).toBeGreaterThanOrEqual(2);
      else expect(pages).toBe(1);
      expect(degradee).toBe(strate === 'scan_degrade');
      if (strate === 'devise') expect(devise).not.toBe('XXD');
      else expect(devise).toBe('XXD');
      if (strate === 'multi_taux') expect(attendu.codeTva).toMatch(/^TF-\d\+TF-\d$/);
      else expect(attendu.codeTva).not.toContain('+');
      if (strate === 'autoliquidation') expect(attendu.codeTva).toBe('TF-AL');
      else expect(attendu.codeTva).not.toBe('TF-AL');
    }
    // multi_taux : deux taux distincts
    for (const p of jeu.pieces.filter((x) => x.strate === 'multi_taux')) {
      const [a, b] = p.attendu.codeTva.split('+');
      expect(a).not.toBe(b);
    }
  });

  it('meme-graine-meme-jeu', () => {
    expect(genererReference({ graine: 42 })).toEqual(genererReference({ graine: 42 }));
  });

  it('graine-differente-jeu-different', () => {
    const a = genererReference({ graine: 1 });
    const b = genererReference({ graine: 2 });
    expect(JSON.stringify(a.pieces)).not.toBe(JSON.stringify(b.pieces));
    expect(a.pieces.map((p) => p.id)).toEqual(b.pieces.map((p) => p.id));
  });

  it('ht-plus-tva-egal-ttc-au-centime', () => {
    for (const p of genererReference({ graine: 3 }).pieces) {
      const { htCentimes: ht, tvaCentimes: tva, ttcCentimes: ttc } = p.attendu;
      for (const v of [ht, tva, ttc]) expect(Number.isSafeInteger(v)).toBe(true);
      expect(ht + tva).toBe(ttc);
      expect(Math.abs(ht)).toBeGreaterThanOrEqual(1000);
      expect(Math.abs(ht)).toBeLessThan(501000);
      if (p.strate === 'avoir') expect(ttc).toBeLessThan(0);
      else expect(ttc).toBeGreaterThan(0);
      if (p.strate === 'autoliquidation') expect(tva).toBe(0);
      else expect(Math.abs(tva)).toBeGreaterThan(0);
    }
  });

  it('identifiants-uniques', () => {
    const jeu = genererReference({ graine: 5 });
    expect(new Set(jeu.pieces.map((p) => p.id)).size).toBe(1000);
    const texte = JSON.stringify(jeu);
    expect(texte).not.toMatch(/\bFR\d{2}\s?\d{4}/);
    for (const p of jeu.pieces) {
      expect(p.attendu.fournisseur).not.toBe('');
      expect(p.attendu.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.attendu.compte).toMatch(/^\d{3,6}$/);
      expect(p.attendu.codeTva).not.toBe('');
    }
  });
});
