import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { genererBanc, chronometrer, rapport, TACHES } from '../temps-gagne.mjs';

const horlogeFaux = (pas) => {
  let t = 1000;
  return () => (t += pas.shift() ?? 0);
};

describe('temps gagné', () => {
  it('banc-60-pieces-120-lignes', () => {
    const b = genererBanc({ graine: 3, pieces: 60, lignes: 120 });
    expect(b.pieces).toHaveLength(60);
    expect(b.lignes).toHaveLength(120);
    expect(new Set(b.pieces.map((p) => p.id)).size).toBe(60);
    expect(new Set(b.lignes.map((l) => l.id)).size).toBe(120);
    expect(genererBanc({ graine: 3 }).pieces).toHaveLength(60);
    expect(genererBanc({ graine: 3 }).lignes).toHaveLength(120);
    expect(JSON.stringify(b)).not.toMatch(/@|\d{14}/);
    for (const mauvais of [0, -1, NaN, Infinity, 2.5]) {
      expect(() => genererBanc({ graine: 1, pieces: mauvais, lignes: 120 })).toThrow('parametres_invalides');
      expect(() => genererBanc({ graine: 1, pieces: 60, lignes: mauvais })).toThrow('parametres_invalides');
    }
    expect(genererBanc({ graine: 1, pieces: 1, lignes: 1 }).pieces).toHaveLength(1);
  });

  it('meme-graine-meme-banc', () => {
    expect(genererBanc({ graine: 7 })).toEqual(genererBanc({ graine: 7 }));
    expect(genererBanc({ graine: 7 })).not.toEqual(genererBanc({ graine: 8 }));
  });

  it('trois-taches-chronometrees', async () => {
    expect(TACHES.map((t) => t.id)).toEqual(['classer-valider', 'rapprocher-releve', 'preparer-tva']);
    const ports = Object.fromEntries(TACHES.map((t) => [t.id, async () => {}]));
    const h = horlogeFaux([0, 12.4, 0, 30, 0, 7.6]);
    const m = await chronometrer(TACHES.map((t) => t.id), ports, h);
    expect(m).toEqual({ 'classer-valider': 12, 'rapprocher-releve': 30, 'preparer-tva': 8 });
    for (const v of Object.values(m)) expect(Number.isInteger(v)).toBe(true);
  });

  it('sans-mesure-non-mesure', async () => {
    const m = await chronometrer(['a', 'b', 'c', 'd'], {
      a: async () => { throw new Error('panne'); },
      c: async () => {},
      d: async () => {},
    }, (() => { const v = [10, 20, 5, 30, 30]; return () => v.shift(); })());
    // a : erreur ; b : port absent ; c : durée négative ; d : durée nulle (valide)
    expect(m.a).toBeNull();
    expect(m.b).toBeNull();
    expect(m.c).toBeNull();
    expect(m.d).toBe(0);
    const r = rapport({ 'classer-valider': null, 'rapprocher-releve': 0 }, {});
    const lignes = r.split('\n');
    expect(lignes.find((l) => l.includes('classer-valider'))).toContain('NON MESURÉ');
    expect(lignes.find((l) => l.includes('preparer-tva'))).toContain('NON MESURÉ');
    expect(lignes.find((l) => l.includes('rapprocher-releve'))).not.toContain('NON MESURÉ');
    expect(lignes.find((l) => l.includes('rapprocher-releve'))).toContain('| 0 ');
    const nan = await chronometrer(['x'], { x: async () => {} }, () => NaN);
    expect(nan.x).toBeNull();
  });

  it('estimation-jamais-affichee-comme-mesure', () => {
    const r = rapport({ 'classer-valider': null, 'rapprocher-releve': 50 }, { 'classer-valider': 999, 'rapprocher-releve': 777 });
    const l1 = r.split('\n').find((l) => l.includes('classer-valider'));
    const cols = l1.split('|').map((c) => c.trim());
    expect(cols[2]).toBe('NON MESURÉ');
    expect(cols[3]).toBe('999 (estimation, non mesurée)');
    const l2 = r.split('\n').find((l) => l.includes('rapprocher-releve')).split('|').map((c) => c.trim());
    expect(l2[2]).toBe('50');
    expect(l2[3]).toBe('777 (estimation, non mesurée)');
    const l3 = r.split('\n').find((l) => l.includes('preparer-tva')).split('|').map((c) => c.trim());
    expect(l3[3]).toBe('aucune');
    expect(r).not.toMatch(/NaN|undefined/);
  });

  it('aucun-reseau', () => {
    const src = readFileSync('outils/banc/temps-gagne.mjs', 'utf8');
    expect(src).not.toMatch(/node:(http|https|net|dns|tls|dgram)|\bfetch\s*\(|XMLHttpRequest|WebSocket/);
    const doc = readFileSync('docs/temps-gagne.md', 'utf8');
    expect(doc).toContain('NON MESURÉ');
    expect(doc).not.toMatch(/€|\d\s?%|prix|tarif/i);
    for (const mot of [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join('')))
      expect(doc.toLowerCase().includes(mot.toLowerCase()), mot).toBe(false);
  });
});
