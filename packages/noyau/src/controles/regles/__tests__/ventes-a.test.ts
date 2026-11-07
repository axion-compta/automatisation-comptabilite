import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../../argent/index.js';
import { executerControles, type RegleControle } from '../../moteur.js';
import * as R from '../ventes-a.js';

const { regleCCV01: V01, regleCCV02: V02, regleCCV03: V03, regleCCV04: V04, regleCCV05: V05 } = R;
const { regleCCV06: V06, regleCCV07: V07, regleCCV08: V08, regleCCV09: V09, regleCCV10: V10 } = R;
const TAUX = [600, 900, 1900];
const ligne = (tauxPdb: number, base: number, tva: number) => ({ tauxPdb, baseCentimes: c(base), tvaLueCentimes: c(tva) });
const piece = (id: string, numero: string, dateFacture: string, ttc: number) => ({ id, numero, dateFacture, ttc: c(ttc) });
const rec = (id: string, recuLe: string, cle: string | null) => ({ id, recuLe, cle });
const ev = <T>(r: RegleControle<T>, o: unknown) => r.evaluer(o as T);
const res = <T>(r: RegleControle<T>, o: unknown) => ev(r, o).resultat;
const taux = (lignes: unknown[], tauxAttendus = TAUX) => ({ lignes, tauxAttendus });
const serie = (pieces: unknown[], maxTrous = 5) => ({ pieces, maxTrous });
const A = (valeur: string | number) => ({ resultat: 'ALERTE', valeur });

describe('CC-V01 totaux (A1)', () => {
  const t = (ht: number, tva: number, ttc: number) => ({ ht: c(ht), tva: c(tva), ttc: c(ttc) });
  it('CT-V01 totaux coherents : OK', () => {
    expect(ev(V01, t(10000, 1900, 11900))).toEqual({ resultat: 'OK' });
    expect(ev(V01, t(0, 0, 0))).toEqual({ resultat: 'OK' });
  });
  it('CT-V01 ecart d un centime : ALERTE avec ecart signe', () => {
    expect(ev(V01, t(10000, 1900, 11901))).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(ev(V01, t(10000, 1900, 11899))).toEqual({ resultat: 'ALERTE', ecartCentimes: -1 });
  });
});

describe('CC-V02 ecart de TVA (A2)', () => {
  const o = (tva: number) => taux([ligne(1900, 10000, tva)]);
  it('CT-V02 TVA lue egale a la TVA attendue ou a un centime : OK', () => {
    for (const tva of [1900, 1901]) expect(res(V02, o(tva))).toBe('OK');
    expect(res(V02, taux([]))).toBe('OK');
  });
  it('CT-V02 ecart de trois centimes : ALERTE avec ecart signe', () => {
    expect(ev(V02, o(1903))).toEqual({ resultat: 'ALERTE', ecartCentimes: 3 });
    expect(ev(V02, o(1897))).toEqual({ resultat: 'ALERTE', ecartCentimes: -3 });
  });
  it('CT-V02 un taux inconnu seul ne declenche pas A2', () => {
    expect(res(V02, taux([ligne(700, 10000, 5)]))).toBe('OK');
  });
});

describe('CC-V03 taux inconnu (A3)', () => {
  it('CT-V03 taux attendus : OK', () => {
    expect(res(V03, taux([ligne(600, 100, 6), ligne(1900, 100, 19)]))).toBe('OK');
  });
  it('CT-V03 taux hors liste : ALERTE avec le taux', () => {
    expect(ev(V03, taux([ligne(1900, 100, 19), ligne(700, 100, 7)]))).toEqual(A(700));
    expect(res(V03, taux([ligne(600, 100, 6)], []))).toBe('ALERTE');
  });
  it('CT-V03 un ecart de TVA seul ne declenche pas A3', () => {
    expect(res(V03, taux([ligne(1900, 10000, 1950)]))).toBe('OK');
  });
});

describe('CC-V04 trou dans la serie (A4)', () => {
  const p1 = piece('a', 'FA-001', '2026-03-01', 1);
  it('CT-V04 suite continue, vide ou series separees : OK', () => {
    expect(res(V04, serie([p1, piece('b', 'FA-002', '2026-03-02', 1)]))).toBe('OK');
    expect(res(V04, serie([]))).toBe('OK');
    expect(res(V04, serie([p1, piece('b', 'XX-005', '2026-03-02', 1)]))).toBe('OK');
  });
  it('CT-V04 numero manquant, ordre d entree inverse : ALERTE avec le nombre de trous', () => {
    expect(ev(V04, serie([piece('b', 'FA-004', '2026-03-02', 1), p1]))).toEqual(A(2));
  });
  it('CT-V04 trop de trous : ALERTE', () => {
    expect(ev(V04, serie([p1, piece('b', 'FA-100', '2026-03-02', 1)], 2))).toEqual(A(2));
  });
});

describe('CC-V05 meme numero, montants differents (A5)', () => {
  const o = (a: number, b: number) => serie([piece('a', 'FA-001', '2026-03-01', a), piece('b', 'FA-001', '2026-03-01', b)]);
  it('CT-V05 meme numero et memes montants : OK', () => {
    expect(res(V05, o(100, 100))).toBe('OK');
  });
  it('CT-V05 meme numero et montants differents : ALERTE', () => {
    expect(ev(V05, o(100, 101))).toEqual(A(1));
  });
});

describe('CC-V06 date qui recule (A6)', () => {
  const p = (d1: string, d2: string) => [piece('a', 'FA-001', d1, 1), piece('b', 'FA-002', d2, 1)];
  it('CT-V06 dates croissantes ou egales : OK', () => {
    expect(res(V06, serie(p('2026-03-01', '2026-03-02')))).toBe('OK');
    expect(res(V06, serie(p('2026-03-01', '2026-03-01')))).toBe('OK');
  });
  it('CT-V06 date qui recule, ordre d entree inverse : ALERTE', () => {
    expect(ev(V06, serie(p('2026-03-10', '2026-03-05').reverse()))).toEqual(A(1));
  });
});

describe('CC-V07 mention de franchise (A7)', () => {
  const mention = { code: 'M-FRANCHISE', condition: 'franchise' as const };
  const o = (lues: Record<string, string>, franchise = true, ...r: unknown[]) => ({
    requises: r.length === 0 ? [mention] : r[0],
    lues,
    contexte: { natureClient: 'professionnel', franchise, htCentimes: c(100) },
  });
  it('CT-V07 mention presente, non exigee ou liste absente : OK', () => {
    expect(res(V07, o({ 'M-FRANCHISE': 'presente' }))).toBe('OK');
    expect(res(V07, o({}, false))).toBe('OK');
    expect(res(V07, o({}, true, undefined))).toBe('OK');
  });
  it('CT-V07 mention de franchise absente ou illisible : ALERTE', () => {
    expect(ev(V07, o({}))).toEqual(A('M-FRANCHISE'));
    expect(res(V07, o({ 'M-FRANCHISE': 'illisible' }))).toBe('ALERTE');
  });
  it('CT-V07 une autre mention absente ne declenche pas A7', () => {
    expect(res(V07, o({}, true, [{ code: 'M-AUTRE', condition: 'toujours' }]))).toBe('OK');
  });
});

describe('CC-V08 date de l operation absente (A8)', () => {
  const o = (cas: string, nature: string, dateOperation?: string) => ({ cas, nature, dates: { dateFacture: '2026-03-01', dateOperation } });
  it('CT-V08 date presente, service ou cas sans supposition : OK', () => {
    expect(res(V08, o('A', 'bien', '2026-02-20'))).toBe('OK');
    expect(res(V08, o('A', 'service'))).toBe('OK');
    expect(res(V08, o('C', 'bien'))).toBe('OK');
  });
  it('CT-V08 bien sans date d operation : ALERTE', () => {
    expect(res(V08, o('A', 'bien'))).toBe('ALERTE');
  });
});

describe('CC-V09 hors exercice (A9)', () => {
  const exercices = [{ id: 'E1', debut: '2026-01-01', fin: '2026-12-31' }];
  const o = (dateFacture: string, ex = exercices) => ({ dateFacture, exercices: ex, periodesVerrouillees: [] });
  it('CT-V09 date dans un exercice : OK', () => {
    expect(res(V09, o('2026-06-15'))).toBe('OK');
  });
  it('CT-V09 date hors de tout exercice ou sans exercice : ALERTE', () => {
    expect(res(V09, o('2027-01-01'))).toBe('ALERTE');
    expect(res(V09, o('2026-06-15', []))).toBe('ALERTE');
  });
  it('CT-V09 periode verrouillee seule : pas d A9', () => {
    expect(res(V09, { ...o('2026-06-15'), periodesVerrouillees: ['2026-06'] })).toBe('OK');
  });
});

describe('CC-V10 doublon par deux canaux (A10)', () => {
  it('CT-V10 pieces distinctes ou sans cle : OK', () => {
    expect(res(V10, [rec('a', '2026-03-01', 'k1'), rec('b', '2026-03-02', 'k2')])).toBe('OK');
    expect(res(V10, [rec('a', '2026-03-01', null), rec('b', '2026-03-02', null)])).toBe('OK');
    expect(res(V10, [])).toBe('OK');
  });
  it('CT-V10 meme cle recue deux fois : ALERTE avec le nombre de doublons', () => {
    expect(ev(V10, [rec('b', '2026-03-02', 'k1'), rec('a', '2026-03-01', 'k1')])).toEqual(A(1));
  });
});

const lignesCsv = readFileSync(new URL('../../../../../../docs/controles.csv', import.meta.url), 'utf8').split('\n');
const tous = R.reglesVentesA as unknown as RegleControle<never>[];
const lancer = (r: RegleControle<never>, donnee: unknown, d: 'arrivee' | 'avant_tva' = 'arrivee') =>
  executerControles([r], [{ type: 'vente', id: 'x', donnee: donnee as never }], d, 'h');

describe('moteur', () => {
  it('exception-donne-impossible : donnee malformee = IMPOSSIBLE, jamais OK', () => {
    for (const r of tous) {
      for (const mauvaise of [null, {}, { ht: Number.NaN }]) expect(lancer(r, mauvaise)[0]?.resultat, r.id).toBe('IMPOSSIBLE');
    }
    expect(lancer(V01 as never, { ht: c(1), tva: c(1), ttc: Number.NaN })[0]?.resultat).toBe('IMPOSSIBLE');
    const inf = [{ ...piece('a', 'FA-001', '2026-03-01', 1), ttc: Number.POSITIVE_INFINITY }];
    expect(lancer(V04 as never, serie(inf))[0]?.resultat).toBe('IMPOSSIBLE');
    expect(lancer(V04 as never, serie([], 0))[0]?.resultat).toBe('IMPOSSIBLE');
  });

  it('exigence-et-version-renseignees : ids, version 1, gravite, blocages, declencheurs, catalogue', () => {
    const arr = ['arrivee', 'a_la_demande'];
    const tva = ['arrivee', 'avant_tva', 'a_la_demande'];
    const attendu = [
      ['CC-V01', 'M', [], arr],
      ['CC-V02', 'M', [], tva],
      ['CC-V03', 'B', ['tva'], tva],
      ['CC-V04', 'M', [], arr],
      ['CC-V05', 'M', ['validation'], arr],
      ['CC-V06', 'm', [], arr],
      ['CC-V07', 'M', [], arr],
      ['CC-V08', 'm', [], arr],
      ['CC-V09', 'M', [], tva],
      ['CC-V10', 'm', [], arr],
    ];
    expect(tous.map((r) => [r.id, r.gravite, r.bloque, r.declencheurs])).toEqual(attendu);
    for (const r of tous) {
      expect([r.version, r.actif]).toEqual([1, true]);
      const l = lignesCsv.find((x) => x.startsWith(r.id + ','));
      expect(l, r.id).toMatch(/^CC-V\d\d,V3-VEN-021,.*,oui$/);
      expect(l).toContain(',CT-V' + r.id.slice(-2) + ',');
    }
  });

  it('une trace par regle et par objet, y compris OK ; hors declencheur : aucune trace', () => {
    const donnee = { ht: c(1), tva: c(0), ttc: c(1) };
    expect(lancer(V01 as never, donnee, 'arrivee')).toHaveLength(1);
    expect(lancer(V01 as never, donnee, 'avant_tva')).toHaveLength(0);
  });
});
