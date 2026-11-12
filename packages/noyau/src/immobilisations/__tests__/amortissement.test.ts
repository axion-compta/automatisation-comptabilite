import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ecritureDotation, dotationExercice } from '../amortissement.js';
import { ErreurImmobilisation, creerBien, type Bien } from '../registre.js';

const exercice = (annee: number) => ({ id: `EX${annee}`, debut: `${annee}-01-01`, fin: `${annee}-12-31` });
const bien = (miseEnService: string, extra: Partial<Bien> = {}): Bien => ({
  id: 'b1',
  compte: '218',
  libelle: 'Bureau fictif',
  miseEnService,
  base: centimes(120000),
  dureeMois: 48,
  amortissable: true,
  ...extra,
});
/** Dotations successives de 2024 à 2031. */
function dotations(b: Bien): number[] {
  const liste: number[] = [];
  let cumul = centimes(0);
  for (let a = 2024; a <= 2031; a += 1) {
    const d = dotationExercice(b, exercice(a), cumul);
    liste.push(d);
    cumul = centimes(cumul + d);
  }
  return liste;
}
function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErreurImmobilisation ? e.code : 'autre';
  }
  return undefined;
}

describe('amortissement linéaire', () => {
  it('annee-pleine-1200-sur-4-ans-300', () => {
    expect(dotationExercice(bien('2024-01-01'), exercice(2024))).toBe(30000);
    expect(dotations(bien('2024-01-01'))).toEqual([30000, 30000, 30000, 30000, 0, 0, 0, 0]);
    // Exercice de 18 mois : l'annuité suit la durée de l'exercice.
    const long = { id: 'EX18', debut: '2024-01-01', fin: '2025-06-30' };
    expect(dotationExercice(bien('2024-01-01'), long)).toBe(45000);
    expect(dotationExercice(bien('2024-01-01'), { id: 'EX6', debut: '2024-01-01', fin: '2024-06-30' })).toBe(15000);
    // Année bissextile : le prorata reste une année pleine.
    expect(dotationExercice(bien('2023-01-01'), exercice(2024), centimes(30000))).toBe(30000);
  });

  it('prorata-mise-en-service-1er-juillet', () => {
    expect(dotationExercice(bien('2025-07-01'), exercice(2025))).toBe(15123);
    expect(dotationExercice(bien('2025-07-02'), exercice(2025))).toBe(15041);
    expect(dotationExercice(bien('2025-07-01'), exercice(2024))).toBe(0);
    // Arrondi au centime supérieur : 14 958,9 centimes → 14959.
    expect(dotationExercice(bien('2025-07-03'), exercice(2025))).toBe(14959);
    expect(dotations(bien('2025-07-01'))).toEqual([0, 15123, 30000, 30000, 30000, 14877, 0, 0]);
    expect(code(() => dotationExercice(bien('2025-07-01'), { id: 'X', debut: '2025-13-01', fin: '2025-12-31' }))).toBe(
      'date_invalide',
    );
    // Dates inversées, et exercice qui ne suit pas les mois entiers : refusés.
    expect(code(() => dotationExercice(bien('2025-07-01'), { id: 'X', debut: '2025-12-31', fin: '2025-01-01' }))).toBe('date_invalide');
    expect(code(() => dotationExercice(bien('2024-01-01'), { id: 'X', debut: '2024-03-15', fin: '2024-12-31' }))).toBe('exercice_non_aligne');
    expect(code(() => dotationExercice(bien('2024-01-01'), { id: 'X', debut: '2024-01-01', fin: '2024-12-30' }))).toBe('exercice_non_aligne');
  });

  it('terrain-non-amorti', () => {
    const terrain = bien('2024-01-01', { compte: '211', amortissable: false, dureeMois: 0 });
    expect(dotations(terrain).every((d) => d === 0)).toBe(true);
    expect(ecritureDotation(terrain, exercice(2024))).toBeNull();
  });

  it('dotation-ecriture-6811-2818-brouillon', () => {
    const e = ecritureDotation(bien('2025-07-01'), exercice(2025));
    if (e === null) throw new Error('écriture attendue');
    expect(e.statut).toBe('brouillon');
    expect(e.date).toBe('2025-12-31');
    expect(e.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['6811', 15123, 0],
      ['2818', 0, 15123],
    ]);
    expect(verifierEcriture(e).equilibree).toBe(true);
    expect(ecritureDotation(bien('2025-07-01'), exercice(2024))).toBeNull();
    expect(ecritureDotation(bien('2025-07-01', { compte: '2183' }), exercice(2025))?.lignes[1]?.compte).toBe('28183');
    expect(code(() => ecritureDotation(bien('2025-07-01', { compte: '275' }), exercice(2025)))).toBe(
      'compte_non_amortissable',
    );
  });

  it('cumul-jamais-superieur-a-la-base', () => {
    for (const base of [1, 99, 100001, 120000]) {
      for (const mise of ['2024-01-01', '2025-03-17', '2025-12-31', '2026-07-01']) {
        const liste = dotations(bien(mise, { base: centimes(base), dureeMois: 36 }));
        let cumul = 0;
        for (const d of liste) {
          expect(d).toBeGreaterThanOrEqual(0);
          cumul += d;
          expect(cumul).toBeLessThanOrEqual(base);
        }
        expect(cumul).toBe(base);
      }
    }
    // La fin du plan tombe le jour de clôture : le dernier exercice solde, rien après.
    const tiers = bien('2024-01-01', { base: centimes(100000), dureeMois: 36 });
    expect(dotations(tiers)).toEqual([33333, 33333, 33334, 0, 0, 0, 0, 0]);
    expect(dotations(bien('2024-01-01', { base: centimes(1), dureeMois: 36 }))).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
    expect(code(() => dotationExercice(bien('2024-01-01'), exercice(2024), centimes(120001)))).toBe('cumul_invalide');
    expect(code(() => dotationExercice(bien('2024-01-01'), exercice(2024), centimes(-1)))).toBe('cumul_invalide');
    expect(dotationExercice(bien('2024-01-01'), exercice(2024), centimes(120000))).toBe(0);
  });

  it('duree-nulle-refusee', () => {
    const saisie = { id: 'b2', compte: '218', libelle: 'Fictif', miseEnService: '2025-01-01', base: centimes(1000) };
    expect(code(() => creerBien({ ...saisie, dureeMois: 0, amortissable: true }))).toBe('duree_invalide');
    expect(code(() => creerBien({ ...saisie, dureeMois: -12, amortissable: true }))).toBe('duree_invalide');
    expect(code(() => creerBien({ ...saisie, dureeMois: Number.NaN, amortissable: true }))).toBe('duree_invalide');
    expect(code(() => creerBien({ ...saisie, dureeMois: 12.5, amortissable: true }))).toBe('duree_invalide');
    expect(creerBien({ ...saisie, dureeMois: 1, amortissable: true }).dureeMois).toBe(1);
    expect(creerBien({ ...saisie, dureeMois: 0, amortissable: false }).amortissable).toBe(false);
    expect(code(() => creerBien({ ...saisie, dureeMois: 12, amortissable: true, base: centimes(0) }))).toBe('base_invalide');
    for (const base of [Number.NaN, Number.POSITIVE_INFINITY, 12.5, -1]) {
      expect(code(() => creerBien({ ...saisie, dureeMois: 12, amortissable: true, base: base as Centimes }))).toBe('base_invalide');
    }
    expect(code(() => creerBien({ ...saisie, dureeMois: 12, amortissable: true, miseEnService: '2025-02-30' }))).toBe(
      'date_invalide',
    );
  });
});
