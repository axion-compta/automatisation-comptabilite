import { describe, expect, it } from 'vitest';
import { ErreurEcriture } from '../modele.js';
import { attribuer, formaterNumero, verifierSuite } from '../numerotation.js';

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurEcriture) return e.code;
    throw e;
  }
  return undefined;
}

function tentatives(n: number, echec: readonly number[]) {
  return Array.from({ length: n }, (_, i) => ({ id: 'e' + String(i + 1), reussit: !echec.includes(i + 1) }));
}

describe('numérotation continue', () => {
  it('format-numero-exemple', () => {
    expect(formaterNumero('AC', 2026, 1, 6)).toBe('AC-2026-000001');
    expect(formaterNumero('VT2', 2027, 123456, 6)).toBe('VT2-2027-123456');
    expect(formaterNumero('AC', 2026, 7, 3)).toBe('AC-2026-007');
    // Journal, année, rang et largeur invalides : refus.
    for (const j of ['', 'ac', 'A-C', 'A C', 'É1']) {
      expect(() => formaterNumero(j, 2026, 1, 6)).toThrow(RangeError);
    }
    for (const a of [Number.NaN, Infinity, 2026.5, 0, -1]) {
      expect(() => formaterNumero('AC', a, 1, 6)).toThrow(RangeError);
    }
    for (const r of [0, -1, Number.NaN, Infinity, -Infinity, 1.5]) {
      expect(() => formaterNumero('AC', 2026, r, 6)).toThrow(RangeError);
    }
    for (const l of [0, -1, Number.NaN, Infinity, 2.5]) {
      expect(() => formaterNumero('AC', 2026, 1, l)).toThrow(RangeError);
    }
  });

  it('annee-quatre-chiffres', () => {
    expect(formaterNumero('AC', 1000, 1, 6)).toBe('AC-1000-000001');
    expect(formaterNumero('AC', 9999, 1, 6)).toBe('AC-9999-000001');
    expect(formaterNumero('AC', 2026, 1, 6)).toBe('AC-2026-000001');
    for (const a of [999, 10000, Number.NaN, Infinity, -Infinity, 2026.5, 1000.5, 9999.5, 1, 0]) {
      expect(() => formaterNumero('AC', a, 1, 6)).toThrow(RangeError);
    }
  });

  it('id-en-double-refuse', () => {
    const ok = (id: string) => ({ id, reussit: true });
    const ko = (id: string) => ({ id, reussit: false });
    expect(() => attribuer(0, [ok('a'), ok('a')])).toThrow(RangeError);
    expect(() => attribuer(0, [ok('a'), ko('a')])).toThrow(RangeError);
    expect(() => attribuer(0, [ko('a'), ok('a')])).toThrow(RangeError);
    expect(() => attribuer(0, [ko('a'), ko('a')])).toThrow(RangeError);
    expect(() => attribuer(0, [ok('a'), ok('b'), ok('c'), ok('b')])).toThrow(RangeError);
    // Doublon refusé même quand le compteur est invalide ou valide : toujours RangeError.
    expect(() => attribuer(3, [ok('a'), ok('a')])).toThrow(RangeError);
    // Sans doublon : accepté, y compris liste vide.
    expect(attribuer(0, [ok('a'), ok('b')]).compteur).toBe(2);
    expect(attribuer(4, [])).toEqual({ attribues: [], compteur: 4 });
    // Ordre inversé : mêmes rangs selon l'ordre reçu.
    expect(attribuer(0, [ok('a'), ok('b')]).attribues).toEqual([
      { id: 'a', rang: 1 },
      { id: 'b', rang: 2 },
    ]);
    expect(attribuer(0, [ok('b'), ok('a')]).attribues).toEqual([
      { id: 'b', rang: 1 },
      { id: 'a', rang: 2 },
    ]);
    // Les rangs ne dépendent pas des identifiants : un échec change qui reçoit le rang 1.
    expect(attribuer(0, [ko('b'), ok('a')]).attribues).toEqual([{ id: 'a', rang: 1 }]);
    expect(attribuer(0, [ok('a'), ko('b')]).attribues).toEqual([{ id: 'a', rang: 1 }]);
  });

  it('rang-trop-grand-refuse', () => {
    expect(formaterNumero('AC', 2026, 999999, 6)).toBe('AC-2026-999999');
    expect(code(() => formaterNumero('AC', 2026, 1000000, 6))).toBe('rang_trop_grand');
    expect(code(() => formaterNumero('AC', 2026, 10, 1))).toBe('rang_trop_grand');
    expect(code(() => formaterNumero('AC', 2026, 999999, 6))).toBeUndefined();
  });

  it('echec-septieme-sans-trou', () => {
    const r = attribuer(0, tentatives(20, [7]));
    expect(r.attribues).toHaveLength(19);
    expect(r.attribues.map((a) => a.rang)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1));
    expect(r.attribues.some((a) => a.id === 'e7')).toBe(false);
    expect(r.attribues[6]).toEqual({ id: 'e8', rang: 7 });
    expect(r.attribues[0]).toEqual({ id: 'e1', rang: 1 });
    expect(r.compteur).toBe(19);
    const suite = verifierSuite(r.attribues.map((a) => a.rang));
    expect(suite).toEqual({ trous: [], doublons: [] });
  });

  it('suite-avec-trou-detectee', () => {
    expect(verifierSuite([1, 2, 4, 7])).toEqual({ trous: [3, 5, 6], doublons: [] });
    expect(verifierSuite([2, 3])).toEqual({ trous: [1], doublons: [] });
    expect(verifierSuite([4, 1, 2])).toEqual({ trous: [3], doublons: [] });
    expect(verifierSuite([1, 2, 3])).toEqual({ trous: [], doublons: [] });
    expect(verifierSuite([])).toEqual({ trous: [], doublons: [] });
  });

  it('suite-avec-doublon-detectee', () => {
    expect(verifierSuite([1, 2, 2, 3])).toEqual({ trous: [], doublons: [2] });
    expect(verifierSuite([1, 1, 1, 3, 3])).toEqual({ trous: [2], doublons: [1, 3] });
    // Valeurs impossibles : refus.
    for (const v of [Number.NaN, Infinity, -Infinity, 1.5, 0, -2]) {
      expect(() => verifierSuite([1, v])).toThrow(RangeError);
    }
  });

  it('compteur-repris-apres-echec', () => {
    const a = attribuer(5, [
      { id: 'a', reussit: false },
      { id: 'b', reussit: true },
    ]);
    expect(a).toEqual({ attribues: [{ id: 'b', rang: 6 }], compteur: 6 });
    // Tout échoue : le compteur ne bouge pas.
    expect(attribuer(5, [{ id: 'a', reussit: false }])).toEqual({ attribues: [], compteur: 5 });
    // Liste vide : rien ne change.
    expect(attribuer(0, [])).toEqual({ attribues: [], compteur: 0 });
    // Reprise avec le compteur rendu : pas de doublon, pas de trou.
    const b = attribuer(a.compteur, [{ id: 'c', reussit: true }]);
    expect(b.attribues).toEqual([{ id: 'c', rang: 7 }]);
    expect(b.compteur).toBe(7);
    // Compteur invalide : refus.
    for (const c of [Number.NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
      expect(() => attribuer(c, [{ id: 'x', reussit: true }])).toThrow(RangeError);
    }
    expect(() => attribuer(-1, [])).toThrow(RangeError);
    expect(attribuer(Number.MAX_SAFE_INTEGER, [{ id: 'x', reussit: false }]).compteur).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});
