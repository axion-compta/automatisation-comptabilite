import { describe, expect, it } from 'vitest';
import { ErreurScore, appliquerAmbiguite, etatSelonScore, scorer, type Bareme, type Constats } from '../score.js';

const bareme: Bareme = {
  version: 'test-1',
  montantExact: 45,
  montantCentime: 43,
  contrepartieConnue: 25,
  contrepartieSimilaire: 15,
  referenceComplete: 20,
  referenceFin: 8,
  dateDansTolerance: 7,
  dateDouble: 3,
  sensEtMoyen: 3,
  regleApprise: 15,
  penalitePartielle: 10,
  penaliteEcartPeriode: 10,
  joursEcartPeriode: 60,
  plafond: 100,
  ecartAmbiguite: 5,
  plafondAmbigu: 79,
  seuils: { rapprochee: 95, proposee: 80, douteuse: 60 },
};
const plein: Constats = {
  montant: 'exact', contrepartie: 'connue', reference: 'complete', date: 'tolerance',
  sensCoherent: true, regleApprise: false, dejaPartielle: false, joursEcart: 0,
};
const nul: Constats = {
  montant: 'aucun', contrepartie: 'aucune', reference: 'aucune', date: 'hors',
  sensCoherent: false, regleApprise: false, dejaPartielle: false, joursEcart: 0,
};
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as ErreurScore).code;
  }
  return undefined;
};

describe('score', () => {
  it('t05-1-cent', () => {
    const r = scorer(plein, bareme);
    expect([r.brut, r.score]).toEqual([100, 100]);
    expect(r.facteurs.map((f) => f.points)).toEqual([45, 25, 20, 7, 3, 0]);
  });
  it('t05-2-quatre-vingts', () => {
    const r = scorer({ ...plein, reference: 'aucune' }, bareme);
    expect(r.score).toBe(80);
    expect(etatSelonScore(r.score, bareme)).toBe('PROPOSEE');
    expect(scorer({ ...plein, montant: 'centime', contrepartie: 'similaire', reference: 'fin', date: 'double' }, bareme).brut).toBe(72);
  });
  it('t05-3-regle-apprise-quatre-vingt-quinze', () => {
    const r = scorer({ ...plein, reference: 'aucune', regleApprise: true }, bareme);
    expect(r.score).toBe(95);
    expect(etatSelonScore(r.score, bareme)).toBe('RAPPROCHEE');
  });
  it('t05-4-plafond-cent', () => {
    const r = scorer({ ...plein, regleApprise: true }, bareme);
    expect([r.brut, r.score]).toEqual([115, 100]);
  });
  it('penalites-cumulees', () => {
    const c = { ...plein, dejaPartielle: true, joursEcart: 61 };
    const r = scorer(c, bareme);
    expect(r.score).toBe(80);
    expect(r.penalites.map((p) => p.points)).toEqual([-10, -10]);
    expect(scorer({ ...c, joursEcart: -61 }, bareme).score).toBe(80);
    expect(scorer({ ...c, joursEcart: -60 }, bareme).score).toBe(90);
    expect(scorer({ ...c, joursEcart: 60 }, bareme).score).toBe(90);
    expect(scorer({ ...plein, joursEcart: 61 }, bareme).score).toBe(90);
  });
  it('jamais-negatif', () => {
    expect(scorer({ ...nul, dejaPartielle: true, joursEcart: 99 }, bareme).score).toBe(0);
    expect(scorer(nul, bareme).score).toBe(0);
  });
  it('ambiguite-plafonne-a-soixante-dix-neuf', () => {
    expect(appliquerAmbiguite([95, 91], bareme)).toEqual([79, 79]);
    expect(appliquerAmbiguite([91, 95, 40], bareme)).toEqual([79, 79, 40]);
    expect(appliquerAmbiguite([95, 90], bareme)).toEqual([95, 90]);
    expect(appliquerAmbiguite([70, 68], bareme)).toEqual([70, 68]);
    expect(appliquerAmbiguite([95], bareme)).toEqual([95]);
    expect(appliquerAmbiguite([], bareme)).toEqual([]);
  });
  it('seuils-aux-bornes', () => {
    const etats = [94, 95, 79, 80, 59, 60].map((s) => etatSelonScore(s, bareme));
    expect(etats).toEqual(['PROPOSEE', 'RAPPROCHEE', 'DOUTEUSE', 'PROPOSEE', null, 'DOUTEUSE']);
    expect(code(() => scorer(plein, { ...bareme, montantExact: Number.NaN }))).toBe('bareme_invalide');
    for (const v of [Infinity, -1, 1.5, '5' as unknown as number])
      expect(code(() => scorer(plein, { ...bareme, plafond: v }))).toBe('bareme_invalide');
    for (const seuils of [
      { rapprochee: 80, proposee: 80, douteuse: 60 },
      { rapprochee: 95, proposee: 60, douteuse: 60 },
      { rapprochee: 60, proposee: 80, douteuse: 95 },
      { rapprochee: 95, proposee: 80, douteuse: Number.NaN },
    ])
      expect(code(() => etatSelonScore(70, { ...bareme, seuils }))).toBe('bareme_invalide');
    expect(code(() => appliquerAmbiguite([1, 2], { ...bareme, ecartAmbiguite: -1 }))).toBe('bareme_invalide');
  });
  it('facteur-nul-liste', () => {
    const r = scorer(nul, bareme);
    expect(r.facteurs.map((f) => f.nom)).toEqual(['montant', 'contrepartie', 'reference', 'date', 'sens_et_moyen', 'regle_apprise']);
    expect(r.facteurs.every((f) => f.points === 0)).toBe(true);
    expect(r.penalites).toHaveLength(2);
    expect(r.penalites.every((p) => p.points === 0)).toBe(true);
  });
});
