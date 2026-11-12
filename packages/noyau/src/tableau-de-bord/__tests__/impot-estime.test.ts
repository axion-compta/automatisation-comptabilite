import { describe, expect, it } from 'vitest';
import { ErreurArgent, centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import { chiffreAffaires, resultatProvisoire, type DefinitionsIndicateurs } from '../chiffres.js';
import { estimerIs, type BaremeIs, type ContexteIs } from '../impot-estime.js';

const DEF: DefinitionsIndicateurs = {
  ca: { prefixes: ['91'], deduire: [] },
  charges: { prefixes: ['92'], exclure: [] },
  produits: { prefixes: ['91'] },
  tresorerie: { prefixes: ['94'] },
};
const P = { debut: '2026-01-01', fin: '2026-12-31' };
const BAREME: BaremeIs = {
  tauxNormal: 2500,
  tauxReduit: 1500,
  plafondBeneficeReduit: centimes(4250000),
  chiffreAffairesMax: centimes(1000000000),
  detentionMin: 7500,
  moisReference: 12,
  verifie: true,
};
const CTX: ContexteIs = { detention: 10000 };
const ecr = (id: string, d: string, c: string, montant: number): Ecriture => ({
  id, date: '2026-03-01', statut: 'valide', journal: 'OD',
  lignes: [
    { compte: d, libelle: 'x', debit: centimes(montant), credit: centimes(0) },
    { compte: c, libelle: 'x', debit: centimes(0), credit: centimes(montant) },
  ],
});
// Banc : produits 150 000,00 et charges 50 000,00, soit un résultat de 100 000,00.
const BANC = [ecr('a', '94', '911', 15000000), ecr('b', '921', '94', 5000000)];

describe('impôt sur les sociétés estimé', () => {
  it('is-banc-fictif-egal-reference-au-centime', () => {
    const resultat = resultatProvisoire(BANC, P, DEF);
    const ca = chiffreAffaires(BANC, P, DEF);
    expect(resultat).toBe(10000000);
    // Référence à la main : 42 500,00 x 15 % = 6 375,00 ; 57 500,00 x 25 % = 14 375,00 ; total 20 750,00.
    const e = estimerIs(resultat, ca, BAREME, CTX);
    expect([e.montant, e.partieReduite, e.aVerifier]).toEqual([2075000, 4250000, false]);
    expect(estimerIs(centimes(3333), ca, BAREME, CTX).montant).toBe(500);
  });

  it('taux-reduit-jusqu-au-plafond', () => {
    const ca = centimes(5000000);
    expect(estimerIs(centimes(4250000), ca, BAREME, CTX).montant).toBe(637500);
    expect(estimerIs(centimes(4250100), ca, BAREME, CTX).montant).toBe(637525);
    expect(estimerIs(centimes(4250000), BAREME.chiffreAffairesMax, BAREME, CTX).montant).toBe(1062500);
    expect(estimerIs(centimes(4250000), ca, BAREME, { detention: 7499 }).montant).toBe(1062500);
    expect(estimerIs(centimes(4250000), ca, BAREME, { detention: BAREME.detentionMin }).montant).toBe(637500);
    const court = estimerIs(centimes(4250000), ca, BAREME, { detention: 10000, moisExercice: 6 });
    expect([court.partieReduite, court.montant]).toEqual([2125000, 318750 + 531250]);
  });

  it('resultat-negatif-is-nul', () => {
    expect(estimerIs(centimes(-120000), centimes(900000), BAREME, CTX).montant).toBe(0);
    expect(estimerIs(centimes(0), centimes(900000), BAREME, CTX).montant).toBe(0);
    for (const r of [Number.NaN, Infinity, 1.5]) expect(() => estimerIs(r as never, centimes(1), BAREME, CTX)).toThrow(ErreurArgent);
    const f = (b: BaremeIs, c: ContexteIs) => () => estimerIs(centimes(1000000), centimes(5000000), b, c);
    for (const m of [-6, 0, 1.5, Number.NaN]) expect(f(BAREME, { detention: 10000, moisExercice: m })).toThrow(ErreurArgent);
    expect(f({ ...BAREME, moisReference: 0 }, CTX)).toThrow(ErreurArgent);
    for (const d of [Number.NaN, -1, 10001]) expect(f(BAREME, { detention: d })).toThrow(ErreurArgent);
  });

  it('bareme-non-verifie-marque-a-verifier', () => {
    const e = estimerIs(centimes(1000000), centimes(5000000), { ...BAREME, verifie: false }, CTX);
    expect([e.aVerifier, e.montant]).toEqual([true, 150000]);
  });

  it('detention-inconnue-a-verifier', () => {
    const e = estimerIs(centimes(1000000), centimes(5000000), BAREME, { detention: null });
    expect([e.aVerifier, e.montant, e.raisons]).toEqual([true, 250000, ['detention_inconnue']]);
  });

  it('toujours-marque-estimation', () => {
    expect(estimerIs(centimes(1000000), centimes(5000000), BAREME, CTX).mot).toBe('estimation');
    expect(estimerIs(centimes(-5), centimes(0), BAREME, CTX).mot).toBe('estimation');
    expect(estimerIs(centimes(1), centimes(0), { ...BAREME, verifie: false }, { detention: null }).mot).toBe('estimation');
  });
});
