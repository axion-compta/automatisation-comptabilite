import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FORMAT_CANONIQUE, ErreurJournal, contenuCanonique, empreinteChainee, empreinteInitiale, sha256Hex } from '../canonique.js';

const h = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const depart = 'a'.repeat(64);
const refus = { name: 'ErreurJournal', code: 'contenu_invalide' };

describe('journal/canonique', () => {
  it('vecteur-connu-abc', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(empreinteChainee(depart, 'abc')).toBe(h(`${depart}\n"abc"`));
    expect(empreinteChainee(depart, 'abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ordre-des-cles-sans-effet', () => {
    expect(contenuCanonique({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(empreinteChainee(depart, { b: 1, a: 2 })).toBe(empreinteChainee(depart, { a: 2, b: 1 }));
    expect(contenuCanonique({ z: null, y: true, x: 'é"', w: -3, v: 0, u: {}, t: [] })).toBe(
      '{"t":[],"u":{},"v":0,"w":-3,"x":"é\\"","y":true,"z":null}',
    );
    expect(contenuCanonique(Object.assign(Object.create(null) as object, { b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });

  it('ordre-des-tableaux-compte', () => {
    expect(contenuCanonique([1, 2, 'x'])).toBe('[1,2,"x"]');
    expect(empreinteChainee(depart, [1, 2])).not.toBe(empreinteChainee(depart, [2, 1]));
  });

  it('imbrication-triee', () => {
    expect(contenuCanonique({ b: [{ d: 1, c: 2 }], a: { z: 1, y: { q: 1, p: 2 } } })).toBe('{"a":{"y":{"p":2,"q":1},"z":1},"b":[{"c":2,"d":1}]}');
    const v = { b: 1, a: [{ y: 1, x: 2 }] };
    contenuCanonique(v);
    expect(Object.keys(v)).toEqual(['b', 'a']);
  });

  it('nan-infini-decimal-refuses', () => {
    for (const mauvais of [Number.NaN, Infinity, -Infinity, 1.5, -0.25, 2 ** 53, 10n, new Date(0), () => 1, Symbol('s'), new Map(), new Set(), new (class X {})()]) {
      expect(() => contenuCanonique(mauvais)).toThrowError(expect.objectContaining(refus));
      expect(() => contenuCanonique({ a: [mauvais] })).toThrowError(expect.objectContaining(refus));
      expect(() => empreinteChainee(depart, mauvais)).toThrowError(ErreurJournal);
    }
    expect(contenuCanonique(-5)).toBe('-5');
    expect(contenuCanonique(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991');
  });

  it('undefined-refuse', () => {
    expect(() => contenuCanonique({ a: undefined })).toThrowError(expect.objectContaining(refus));
    expect(() => contenuCanonique(undefined)).toThrowError(expect.objectContaining(refus));
    expect(() => contenuCanonique([undefined])).toThrowError(expect.objectContaining(refus));
    // eslint-disable-next-line no-sparse-arrays
    expect(() => contenuCanonique([1, , 2])).toThrowError(expect.objectContaining(refus));
    const cycle: Record<string, unknown> = {};
    cycle.soi = cycle;
    expect(() => contenuCanonique(cycle)).toThrowError(expect.objectContaining(refus));
    const partage = { n: 1 };
    expect(contenuCanonique({ a: partage, b: partage })).toBe('{"a":{"n":1},"b":{"n":1}}');
  });

  it('precedente-mal-formee-refusee', () => {
    const mauvaises = ['A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '', 'g'.repeat(64), `${'a'.repeat(63)}\n`, ` ${'a'.repeat(63)}`, 12, null, undefined];
    for (const m of mauvaises) {
      expect(() => empreinteChainee(m as string, 'x')).toThrowError(expect.objectContaining({ name: 'ErreurJournal', code: 'precedente_invalide' }));
    }
    expect(empreinteChainee('0123456789abcdef'.repeat(4), 'x')).toHaveLength(64);
  });

  it('initiale-differente-par-societe', () => {
    const a = empreinteInitiale('A', '2026-01-05T10:00:00Z');
    expect(a).toBe(h(contenuCanonique({ societeId: 'A', creeLe: '2026-01-05T10:00:00Z', formatCanonique: FORMAT_CANONIQUE })));
    expect(a).toBe(h('{"creeLe":"2026-01-05T10:00:00Z","formatCanonique":1,"societeId":"A"}'));
    expect(a).not.toBe(empreinteInitiale('B', '2026-01-05T10:00:00Z'));
    expect(a).not.toBe(empreinteInitiale('A', '2026-01-05T10:00:01Z'));
    expect(FORMAT_CANONIQUE).toBe(1);
    for (const mauvais of [['', 'x'], ['A', ''], [1, 'x'], ['A', 2], [undefined, 'x']]) {
      expect(() => empreinteInitiale(mauvais[0] as string, mauvais[1] as string)).toThrowError(expect.objectContaining(refus));
    }
  });

  it('un-caractere-change-l-empreinte', () => {
    const e1 = empreinteChainee(depart, { libelle: 'Café' });
    const e2 = empreinteChainee(depart, { libelle: 'Café' });
    expect(e1).not.toBe(e2);
    expect(empreinteChainee(depart, { libelle: 'Cafe' })).not.toBe(empreinteChainee(depart, { libelle: 'Cafd' }));
    expect(empreinteChainee('b'.repeat(64), 'x')).not.toBe(empreinteChainee(depart, 'x'));
    expect(empreinteChainee(depart, 'x')).not.toBe(empreinteChainee(depart, 'y'));
  });
});
