import { describe, expect, it } from 'vitest';
import {
  ErreurArgent,
  ajouter,
  centimes,
  formater,
  multiplier,
  pourcentage,
  repartir,
  soustraire,
} from '../argent/index.js';

const c = centimes;

describe('centimes', () => {
  it('accepte les entiers, y compris 0 et négatifs', () => {
    expect(c(0)).toBe(0);
    expect(c(-250)).toBe(-250);
  });
  it('normalise -0 en +0', () => {
    expect(Object.is(c(-0), 0)).toBe(true);
    expect(Object.is(multiplier(c(-5), 0), 0)).toBe(true);
  });
  it('refuse flottants, NaN, infinis et entiers non sûrs', () => {
    for (const v of [0.1, 1.5, NaN, Infinity, 2 ** 53]) {
      expect(() => c(v)).toThrow(ErreurArgent);
    }
  });
});

describe('opérations', () => {
  it('ajoute et soustrait sans dérive', () => {
    expect(ajouter(c(10), c(20))).toBe(30);
    expect(soustraire(c(10), c(20))).toBe(-10);
  });
  it('lève une erreur au dépassement', () => {
    expect(() => ajouter(c(Number.MAX_SAFE_INTEGER), c(1))).toThrow(ErreurArgent);
    expect(() => multiplier(c(Number.MAX_SAFE_INTEGER), 2)).toThrow(ErreurArgent);
  });
  it('multiplie par un entier seulement', () => {
    expect(multiplier(c(125), 3)).toBe(375);
    expect(() => multiplier(c(125), 1.5)).toThrow(ErreurArgent);
  });
});

describe('pourcentage et arrondis', () => {
  it('calcule exactement quand il n’y a pas de reste', () => {
    expect(pourcentage(c(10000), 2000, 'demi-superieur')).toBe(2000);
    expect(pourcentage(c(0), 2000, 'demi-superieur')).toBe(0);
  });
  it('arrondit selon le mode sur un cas positif non exact (1,2 centime)', () => {
    expect(pourcentage(c(6), 2000, 'inferieur')).toBe(1);
    expect(pourcentage(c(6), 2000, 'superieur')).toBe(2);
    expect(pourcentage(c(6), 2000, 'demi-superieur')).toBe(1);
    expect(pourcentage(c(6), 2000, 'demi-pair')).toBe(1);
  });
  it('gère les demis exacts (0,5 / 1,5 / 2,5 centime)', () => {
    expect(pourcentage(c(1), 5000, 'demi-superieur')).toBe(1);
    expect(pourcentage(c(1), 5000, 'demi-pair')).toBe(0);
    expect(pourcentage(c(3), 5000, 'demi-pair')).toBe(2);
    expect(pourcentage(c(5), 5000, 'demi-pair')).toBe(2);
    expect(pourcentage(c(5), 5000, 'demi-superieur')).toBe(3);
  });
  it('gère les montants négatifs symétriquement', () => {
    expect(pourcentage(c(-6), 2000, 'inferieur')).toBe(-2);
    expect(pourcentage(c(-6), 2000, 'superieur')).toBe(-1);
    expect(pourcentage(c(-6), 2000, 'demi-superieur')).toBe(-1);
    expect(pourcentage(c(-1), 5000, 'demi-superieur')).toBe(-1);
    expect(pourcentage(c(-1), 5000, 'demi-pair')).toBe(0);
    expect(pourcentage(c(-3), 5000, 'demi-pair')).toBe(-2);
  });
  it('supérieur reste exact quand le reste est nul', () => {
    expect(pourcentage(c(100), 5000, 'superieur')).toBe(50);
    expect(pourcentage(c(-100), 5000, 'inferieur')).toBe(-50);
  });
  it('refuse un taux non entier', () => {
    expect(() => pourcentage(c(100), 12.5, 'inferieur')).toThrow(ErreurArgent);
  });
  it('ne perd pas de précision sur de gros montants', () => {
    expect(pourcentage(c(9_000_000_000_000), 1, 'inferieur')).toBe(900_000_000);
  });
});

describe('répartition', () => {
  it('conserve toujours le total', () => {
    expect(repartir(c(100), [1, 1, 1])).toEqual([34, 33, 33]);
    expect(repartir(c(100), [1, 1, 1]).reduce((s, p) => s + p, 0)).toBe(100);
  });
  it('donne le reliquat aux plus grands restes, pas aux premiers poids', () => {
    expect(repartir(c(2), [1, 1, 100])).toEqual([0, 0, 2]);
    expect(repartir(c(1), [1, 3])).toEqual([0, 1]);
  });
  it('à reste égal, l’indice le plus petit passe d’abord', () => {
    expect(repartir(c(1), [1, 1])).toEqual([1, 0]);
  });
  it('un total négatif donne l’opposé du total positif', () => {
    expect(repartir(c(100), [1, 1, 1])).toEqual([34, 33, 33]);
    const neg = repartir(c(-100), [1, 1, 1]);
    expect(neg).toEqual([-34, -33, -33]);
    expect(neg.reduce((s, q) => s + q, 0)).toBe(-100);
    expect(repartir(c(-2), [1, 1, 100])).toEqual([0, 0, -2]);
    expect(Object.is(repartir(c(-1), [0, 1])[0], 0)).toBe(true);
  });
  it('respecte les poids et saute les poids nuls', () => {
    expect(repartir(c(10), [0, 1, 1])).toEqual([0, 5, 5]);
    expect(repartir(c(1), [0, 1, 1])).toEqual([0, 1, 0]);
    expect(repartir(c(30), [1, 2])).toEqual([10, 20]);
  });
  it('refuse les entrées invalides', () => {
    expect(() => repartir(c(10), [])).toThrow(ErreurArgent);
    expect(() => repartir(c(10), [0, 0])).toThrow(ErreurArgent);
    expect(() => repartir(c(10), [1, -1])).toThrow(ErreurArgent);
    expect(() => repartir(c(10), [1, 0.5])).toThrow(ErreurArgent);
  });
});

describe('formatage', () => {
  it('formate sans flottant', () => {
    expect(formater(c(123456))).toBe('1234,56');
    expect(formater(c(5))).toBe('0,05');
    expect(formater(c(0))).toBe('0,00');
    expect(formater(c(-1999))).toBe('-19,99');
    expect(formater(c(100))).toBe('1,00');
    expect(formater(c(99))).toBe('0,99');
    expect(formater(c(-5))).toBe('-0,05');
    expect(formater(c(Number.MAX_SAFE_INTEGER))).toBe('90071992547409,91');
  });
});
