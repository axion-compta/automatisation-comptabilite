import { describe, expect, it } from 'vitest';
import { ErreurAffectation, affecter } from '../affectation.js';

type It = { id: string; cle: string };
const it_ = (ids: string[]): It[] => ids.map((id) => ({ id, cle: id }));
const jour = (id: string): number => Number(id.slice(1));
const ecart = (l: It, p: It): number => Math.abs(jour(l.id) - jour(p.id));
const table =
  (m: Record<string, Record<string, number | null>>) =>
  (l: It, p: It): number | null =>
    m[l.id]?.[p.id] ?? null;
const resume = (r: ReturnType<typeof affecter>): string[] =>
  r.paires.map((x) => `${x.ligneId}>${x.pieceId}:${x.cout}`).sort();

describe('affectation optimale', () => {
  it('t06-2-trois-cafes', () => {
    const r = affecter(it_(['l02', 'l09', 'l16']), it_(['p01', 'p08', 'p15']), ecart, 10);
    expect(resume(r)).toEqual(['l02>p01:1', 'l09>p08:1', 'l16>p15:1']);
    expect(r.coutTotal).toBe(3);
    expect(r.unique).toBe(true);
  });

  it('ordre-d-entree-sans-effet', () => {
    const L = ['l02', 'l09', 'l16'];
    const P = ['p01', 'p08', 'p15'];
    const base = affecter(it_(L), it_(P), ecart, 10);
    for (const [a, b] of [
      [[2, 1, 0], [0, 1, 2]],
      [[1, 2, 0], [2, 0, 1]],
      [[0, 2, 1], [1, 2, 0]],
    ] as const) {
      const r = affecter(it_(a.map((i) => L[i] as string)), it_(b.map((i) => P[i] as string)), ecart, 10);
      expect(r).toEqual(base);
    }
  });

  it('egalite-de-cout-non-unique', () => {
    const r = affecter(it_(['a', 'b']), it_(['x', 'y']), () => 1, 5);
    expect(r.coutTotal).toBe(2);
    expect(r.unique).toBe(false);
    expect(r.paires.map((x) => `${x.ligneId}>${x.pieceId}`)).toEqual(['a>x', 'b>y']);
  });

  it('rectangulaire-plus-de-pieces', () => {
    const r = affecter(it_(['l05']), it_(['p01', 'p04', 'p09']), ecart, 5);
    expect(resume(r)).toEqual(['l05>p04:1']);
    expect(r.unique).toBe(true);
  });

  it('rectangulaire-plus-de-lignes', () => {
    const r = affecter(it_(['l01', 'l04', 'l09']), it_(['p05']), ecart, 5);
    expect(resume(r)).toEqual(['l04>p05:1']);
    expect(r.coutTotal).toBe(1);
  });

  it('paire-impossible-respectee', () => {
    const c = table({ a: { x: null, y: 4 }, b: { x: 1, y: null } });
    const r = affecter(it_(['a', 'b']), it_(['x', 'y']), c, 5);
    expect(resume(r)).toEqual(['a>y:4', 'b>x:1']);
    const partiel = affecter(it_(['a', 'b']), it_(['x']), table({ a: { x: null }, b: { x: 9 } }), 5);
    expect(resume(partiel)).toEqual(['b>x:9']);
  });

  it('jamais-glouton', () => {
    const c = table({ l1: { p1: 1, p2: 2 }, l2: { p1: 2, p2: 100 } });
    const r = affecter(it_(['l1', 'l2']), it_(['p1', 'p2']), c, 5);
    expect(resume(r)).toEqual(['l1>p2:2', 'l2>p1:2']);
    expect(r.coutTotal).toBe(4);
  });

  it('cas limites : vides, une paire, tout impossible', () => {
    const vide = { paires: [], coutTotal: 0, unique: true };
    expect(affecter([], [], () => 1, 5)).toEqual(vide);
    expect(affecter(it_(['a']), [], () => 1, 5)).toEqual(vide);
    expect(affecter([], it_(['a']), () => 1, 5)).toEqual(vide);
    expect(affecter(it_(['a', 'b']), it_(['x', 'y']), () => null, 5)).toEqual(vide);
    const un = affecter(it_(['a']), it_(['x']), () => 0, 5);
    expect(un).toEqual({ paires: [{ ligneId: 'a', pieceId: 'x', cout: 0 }], coutTotal: 0, unique: true });
  });

  it('départage stable par cle puis id', () => {
    const L = [{ id: 'b', cle: '1' }, { id: 'a', cle: '1' }];
    const r = affecter(L, [{ id: 'y', cle: '2' }, { id: 'x', cle: '2' }], () => 1, 5);
    expect(r.paires.map((x) => `${x.ligneId}>${x.pieceId}`)).toEqual(['a>x', 'b>y']);
  });

  it('refuse coûts, maximum et taille invalides', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(() => affecter(it_(['a']), it_(['x']), () => v, 5)).toThrow('cout_invalide');
    }
    for (const m of [Number.NaN, 0, -1, 2.5, Number.POSITIVE_INFINITY]) {
      expect(() => affecter(it_(['a']), it_(['x']), () => 1, m)).toThrow('maximum_invalide');
    }
    expect(() => affecter(it_(['a', 'b', 'c']), it_(['x']), () => 1, 2)).toThrow('trop_grand');
    expect(() => affecter(it_(['a']), it_(['x', 'y', 'z']), () => 1, 2)).toThrow('trop_grand');
    expect(affecter(it_(['a', 'b']), it_(['x', 'y']), () => 1, 2).paires).toHaveLength(2);
    expect(new ErreurAffectation('x')).toBeInstanceOf(Error);
  });

  it('propriete-egale-recherche-exhaustive', () => {
    let graine = 12345;
    const alea = (n: number): number => {
      graine = (Math.imul(graine, 1103515245) + 12345) >>> 0;
      return (graine >>> 8) % n;
    };
    for (let cas = 0; cas < 300; cas++) {
      const n = 1 + alea(6);
      const m = 1 + alea(6);
      const mat = Array.from({ length: n }, () =>
        Array.from({ length: m }, () => (alea(4) === 0 ? null : alea(6))),
      );
      const num = (x: It): number => Number(x.id.slice(1));
      const r = affecter(
        it_(Array.from({ length: n }, (_, i) => 'l' + String(i))),
        it_(Array.from({ length: m }, (_, i) => 'p' + String(i))),
        (l, p) => mat[num(l)]?.[num(p)] ?? null,
        6,
      );
      let meilleur = [-1, 0];
      let nb = 0;
      const rec = (i: number, pris: number, paires: number, cout: number): void => {
        if (i === n) {
          const [bp = 0, bc = 0] = meilleur;
          if (paires > bp || (paires === bp && cout < bc) || bp === -1) {
            meilleur = [paires, cout];
            nb = 1;
          } else if (paires === bp && cout === bc) nb++;
          return;
        }
        rec(i + 1, pris, paires, cout);
        for (let j = 0; j < m; j++) {
          const c = mat[i]?.[j];
          if ((pris & (1 << j)) === 0 && c !== null && c !== undefined) rec(i + 1, pris | (1 << j), paires + 1, cout + c);
        }
      };
      rec(0, 0, 0, 0);
      expect([r.paires.length, r.coutTotal, r.unique]).toEqual([meilleur[0], meilleur[1], nb === 1]);
    }
  });
});
