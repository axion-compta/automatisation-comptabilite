import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { genererCompta, serialiserCompta, type JeuCompta } from '../compta.js';

const EMPREINTE = '2e6611017266012a848bb1d97bbc01c71b9f81000162be1265e8629e1d8ae470';

describe('données comptables fictives', () => {
  const jeu = genererCompta();
  const pleine = jeu.societes.find((s) => s.profil === 'pleine');
  const vide = jeu.societes.find((s) => s.profil === 'vide');
  if (!pleine || !vide) throw new Error('profils manquants');

  it('meme-graine-meme-empreinte', () => {
    const sha = (j: JeuCompta): string => createHash('sha256').update(serialiserCompta(j)).digest('hex');
    expect(sha(jeu)).toBe(EMPREINTE);
    expect(sha(genererCompta())).toBe(sha(jeu));
    expect(sha(genererCompta(1))).not.toBe(sha(jeu));
  });

  it('ecritures-equilibrees', () => {
    expect(pleine.ecritures.filter((e) => e.statut === 'validee')).toHaveLength(40);
    expect(pleine.ecritures.filter((e) => e.statut === 'brouillon')).toHaveLength(3);
    for (const e of pleine.ecritures) {
      const debit = e.lignes.reduce((t, l) => t + l.debitCentimes, 0);
      const credit = e.lignes.reduce((t, l) => t + l.creditCentimes, 0);
      expect(debit).toBe(credit);
      expect(debit).toBeGreaterThan(0);
      for (const l of e.lignes) {
        expect(Number.isInteger(l.debitCentimes)).toBe(true);
        expect(Number.isInteger(l.creditCentimes)).toBe(true);
      }
    }
  });

  it('codes-tiers-uniques', () => {
    const codes = pleine.tiers.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.filter((c) => /^CLI\d{3}$/.test(c))).toHaveLength(6);
    expect(codes.filter((c) => /^FOU\d{3}$/.test(c))).toHaveLength(6);
  });

  it('emails-exemple-fr', () => {
    expect(pleine.tiers.length).toBeGreaterThan(0);
    for (const t of pleine.tiers) expect(t.email).toMatch(/^[a-z0-9.]+@exemple\.fr$/);
  });

  it('profil-vide-sans-ecriture', () => {
    expect(vide.ecritures).toEqual([]);
    expect(vide.tiers).toEqual([]);
    expect(vide.plan).toEqual([]);
    expect(vide.exercices.map((x) => x.statut)).toEqual(['ouvert']);
  });

  it('un-exercice-clos-un-ouvert', () => {
    expect(pleine.exercices.map((x) => x.statut)).toEqual(['cloture', 'ouvert']);
    for (const x of pleine.exercices) expect(x.debut < x.fin).toBe(true);
  });

  it('comptes-des-ecritures-dans-le-plan', () => {
    const numeros = new Set(pleine.plan.map((c) => c.numero));
    expect(pleine.plan.length).toBeGreaterThanOrEqual(24);
    expect(new Set(pleine.plan.map((c) => c.classe))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    const codes = new Set(pleine.tiers.map((t) => t.code));
    for (const e of pleine.ecritures) {
      for (const l of e.lignes) {
        expect(numeros.has(l.compte)).toBe(true);
        if (l.auxiliaire !== undefined) expect(codes.has(l.auxiliaire)).toBe(true);
      }
    }
  });
});
