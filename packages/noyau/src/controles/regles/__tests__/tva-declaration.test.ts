import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../../argent/index.js';
import type { CaseDeclaration } from '../../../declarations/cases.js';
import { executerControles } from '../../moteur.js';
import { regleTvaC09, regleTvaC10, regleTvaC11, regleTvaC13, reglesTvaDeclaration } from '../tva-declaration.js';

const brut = (n: number): never => n as never;
const cas = (code: string, montant: number): CaseDeclaration => ({ code, montant: c(montant), sources: [], aCalculer: false });
const codes = { ligneCredit: 'L-CREDIT', ligneReport: 'L-REPORT' };
const c09 = (ca: number, produits: number, seuil: number) => ({
  caDeclareCumule: brut(ca),
  totalComptesProduits: brut(produits),
  seuilEcart: brut(seuil),
});
const res = (sortie: { resultat: string }): string => sortie.resultat;

describe('TVA-C09', () => {
  it('CT-D01 ok jusqu au seuil inclus, alerte signee au dela, impossible sans seuil valide', () => {
    for (const [ca, prod] of [[100000, 100000], [105000, 100000], [95000, 100000], [0, 0]]) {
      expect(res(regleTvaC09.evaluer(c09(ca ?? 0, prod ?? 0, 5000)))).toBe('OK');
    }
    expect(regleTvaC09.evaluer(c09(110000, 100000, 5000))).toEqual({ resultat: 'ALERTE', valeur: 10000, ecartCentimes: 10000 });
    expect(regleTvaC09.evaluer(c09(105001, 100000, 5000))).toMatchObject({ resultat: 'ALERTE', ecartCentimes: 5001 });
    expect(regleTvaC09.evaluer(c09(90000, 100000, 5000))).toMatchObject({ resultat: 'ALERTE', ecartCentimes: -10000 });
    for (const seuil of [Number.NaN, -1, Number.POSITIVE_INFINITY, 1.5]) {
      expect(res(regleTvaC09.evaluer(c09(1, 1, seuil)))).toBe('IMPOSSIBLE');
    }
    expect(res(regleTvaC09.evaluer({ caDeclareCumule: c(1), totalComptesProduits: c(1) } as never))).toBe('IMPOSSIBLE');
    expect(res(regleTvaC09.evaluer(c09(Number.NaN, 1, 5)))).toBe('IMPOSSIBLE');
  });
});

describe('TVA-C10', () => {
  const prec = [cas('L-CREDIT', 4200), cas('AUTRE', 1)];
  const ev = (precedente: CaseDeclaration[] | null, actuelle: CaseDeclaration[], cd = codes) =>
    regleTvaC10.evaluer({ precedente, actuelle, codes: cd });
  it('CT-D02 le report egale le credit precedent, ecart d un centime en alerte', () => {
    expect(ev(prec, [cas('L-REPORT', 4200)])).toMatchObject({ resultat: 'OK', valeur: 4200 });
    expect(ev(prec, [cas('L-REPORT', 4201)])).toMatchObject({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(ev(prec, [cas('L-REPORT', 4199)])).toMatchObject({ resultat: 'ALERTE', ecartCentimes: -1 });
    expect(res(ev(null, [cas('L-REPORT', 0)]))).toBe('OK');
    expect(res(ev(null, [cas('L-REPORT', 1)]))).toBe('ALERTE');
    expect(res(ev(prec, []))).toBe('IMPOSSIBLE');
    expect(res(ev([cas('AUTRE', 1)], [cas('L-REPORT', 0)]))).toBe('IMPOSSIBLE');
    expect(res(ev(prec, [cas('L-REPORT', 4200)], { ligneCredit: 'X', ligneReport: 'X' }))).toBe('IMPOSSIBLE');
  });
});

describe('TVA-C11', () => {
  const ev = (col: number, ded: number, nette: number) =>
    regleTvaC11.evaluer({ soldeCollectee: brut(col), soldeDeductible: brut(ded), tvaNetteDeclaree: brut(nette) });
  it('CT-D03 collectee moins deductible egale la TVA nette, ecart d un centime en alerte', () => {
    expect(ev(10000, 4000, 6000)).toMatchObject({ resultat: 'OK', valeur: 6000 });
    expect(res(ev(0, 0, 0))).toBe('OK');
    expect(res(ev(4000, 10000, -6000))).toBe('OK');
    expect(ev(10000, 4000, 6001)).toMatchObject({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(ev(10000, 4000, 5999)).toMatchObject({ resultat: 'ALERTE', ecartCentimes: -1 });
    expect(res(ev(Number.NaN, 1, 0))).toBe('IMPOSSIBLE');
    expect(res(ev(1, 1, 0.5))).toBe('IMPOSSIBLE');
    expect(res(ev(1, Number.POSITIVE_INFINITY, 0))).toBe('IMPOSSIBLE');
  });
});

describe('TVA-C13', () => {
  const b = (code: string, montant: number, base = true) => ({ code, montant: brut(montant), base });
  const ev = (...cases: ReturnType<typeof b>[]) => regleTvaC13.evaluer({ cases });
  it('CT-D04 alerte si une case base est negative, un centime suffit', () => {
    expect(res(ev(b('A', 100), b('B', 0)))).toBe('OK');
    expect(res(ev())).toBe('OK');
    expect(ev(b('A', 100), b('B', -1))).toEqual({ resultat: 'ALERTE', valeur: -1, ecartCentimes: -1 });
    expect(ev(b('A', -5), b('B', -9))).toMatchObject({ resultat: 'ALERTE', valeur: -14 });
    expect(res(ev(b('T', -500, false)))).toBe('OK');
    expect(res(ev(b('A', Number.NaN)))).toBe('IMPOSSIBLE');
  });
});

describe('moteur', () => {
  it('exigence-et-version-renseignees', () => {
    expect(Object.keys(reglesTvaDeclaration)).toEqual(['TVA-C09', 'TVA-C10', 'TVA-C11', 'TVA-C13']);
    for (const [id, r] of Object.entries(reglesTvaDeclaration)) {
      expect([r.id, r.version, r.actif]).toEqual([id, 1, true]);
    }
    expect([regleTvaC09.gravite, regleTvaC10.gravite, regleTvaC11.gravite, regleTvaC13.gravite]).toEqual(['M', 'B', 'B', 'B']);
    expect(regleTvaC09.bloque).toEqual([]);
    expect(regleTvaC09.declencheurs).toEqual(['avant_tva']);
    for (const r of [regleTvaC10, regleTvaC11, regleTvaC13]) expect(r.bloque).toEqual(['tva']);
  });
  it('impossible n est jamais compte OK', () => {
    const donnee = c09(1, 1, Number.NaN);
    const traces = executerControles([regleTvaC09], [{ type: 'declaration', id: 'd1', donnee }], 'avant_tva', '2026-01-01T00:00:00Z');
    expect(traces.map((t) => t.resultat)).toEqual(['IMPOSSIBLE']);
  });
});
