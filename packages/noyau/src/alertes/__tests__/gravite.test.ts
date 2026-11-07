import { describe, expect, it } from 'vitest';
import type { GraviteAlerte } from '../../interface/types.js';
import type { Alerte } from '../moteur.js';
import { alertesDuJour, compteursParEntree, ErreurGravite, graviteCourante, type Escalade } from '../gravite.js';

const AVANT: Escalade = [
  { type: 'avant_echeance', jours: 7, vers: 'a_faire' },
  { type: 'avant_echeance', jours: 2, vers: 'urgent' },
];
const AGE: Escalade = [{ type: 'age', jours: 5, vers: 'urgent' }];
const ctx = (jour: string, echeanceLe?: string) => ({ jour, ouverteLe: '2026-09-01', ...(echeanceLe ? { echeanceLe } : {}) });
const alerte = (id: string, gravite: GraviteAlerte, p: Partial<Alerte> = {}): Alerte => ({
  id,
  regle: 'R1',
  objetType: 'piece',
  objetId: id,
  cle: `R1|piece|${id}`,
  gravite,
  etat: 'ouverte',
  version: 1,
  ...p,
});

describe('gravité des alertes', () => {
  it('palier-avant-echeance-atteint-a-la-limite', () => {
    expect(graviteCourante('info', AVANT, ctx('2026-10-08', '2026-10-10'), 'echeance_legale')).toBe('urgent');
    expect(graviteCourante('info', AVANT, ctx('2026-10-03', '2026-10-10'), 'echeance_legale')).toBe('a_faire');
    expect(graviteCourante('info', AGE, { jour: '2026-09-06', ouverteLe: '2026-09-01' }, 'argent')).toBe('urgent');
  });

  it('palier-non-atteint-la-veille', () => {
    expect(graviteCourante('info', AVANT, ctx('2026-10-02', '2026-10-10'), 'echeance_legale')).toBe('info');
    expect(graviteCourante('info', AVANT, ctx('2026-10-07', '2026-10-10'), 'echeance_legale')).toBe('a_faire');
    expect(graviteCourante('info', AGE, { jour: '2026-09-05', ouverteLe: '2026-09-01' }, 'argent')).toBe('info');
    expect(graviteCourante('info', AVANT, ctx('2026-10-09'), 'argent')).toBe('info');
  });

  it('echeance-depassee-palier-max', () => {
    const e: Escalade = [
      { type: 'avant_echeance', jours: 2, vers: 'urgent' },
      { type: 'avant_echeance', jours: 7, vers: 'a_faire' },
      { type: 'avant_echeance', jours: 1, vers: 'bloquant' },
    ];
    expect(graviteCourante('info', e, ctx('2026-10-20', '2026-10-10'), 'echeance_legale')).toBe('bloquant');
  });

  it('jamais-sous-la-base', () => {
    expect(graviteCourante('bloquant', AVANT, ctx('2026-10-08', '2026-10-10'), 'blocage')).toBe('bloquant');
    expect(graviteCourante('urgent', [], ctx('2026-10-08'), 'argent')).toBe('urgent');
    expect(graviteCourante('a_faire', AVANT, ctx('2026-10-01', '2026-10-10'), 'argent')).toBe('a_faire');
  });

  it('urgent-plafonne-si-nature-autre', () => {
    expect(graviteCourante('info', AVANT, ctx('2026-10-08', '2026-10-10'), 'autre')).toBe('a_faire');
    expect(graviteCourante('urgent', [], ctx('2026-10-08'), 'autre')).toBe('a_faire');
    expect(graviteCourante('a_faire', [], ctx('2026-10-08'), 'autre')).toBe('a_faire');
    expect(graviteCourante('bloquant', [], ctx('2026-10-08'), 'autre')).toBe('bloquant');
  });

  it('escalade-invalide-refusee', () => {
    for (const jours of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const e: Escalade = [{ type: 'age', jours, vers: 'urgent' }];
      expect(() => graviteCourante('info', e, ctx('2026-10-08'), 'argent')).toThrow(ErreurGravite);
      try {
        graviteCourante('info', e, ctx('2026-10-08'), 'argent');
      } catch (x) {
        expect((x as ErreurGravite).code).toBe('escalade_invalide');
      }
    }
  });

  it('alertes-du-jour-trois-cartes-et-total', () => {
    const l = [
      alerte('d', 'urgent', { echeanceLe: '2026-10-20' }),
      alerte('c', 'urgent', { echeanceLe: '2026-10-05' }),
      alerte('b', 'urgent'),
      alerte('a', 'urgent', { echeanceLe: '2026-10-05' }),
      alerte('z', 'bloquant', { echeanceLe: '2026-12-01' }),
      alerte('i', 'a_faire'),
    ];
    const r = alertesDuJour(l, 3);
    expect(r.cartes.map((x) => x.id)).toEqual(['z', 'a', 'c']);
    expect(r.urgentesTotal).toBe(5);
    expect(alertesDuJour(l, 0)).toEqual({ cartes: [], urgentesTotal: 5 });
    expect(() => alertesDuJour(l, -1)).toThrow(ErreurGravite);
    expect(() => alertesDuJour(l, 1.5)).toThrow(ErreurGravite);
    expect(l[0]!.id).toBe('d');
  });

  it('point-exclamation-si-urgent-ou-bloquant', () => {
    const l = [
      alerte('1', 'urgent', { regle: 'RA' }),
      alerte('2', 'a_faire', { regle: 'RA' }),
      alerte('3', 'bloquant', { regle: 'RB' }),
      alerte('4', 'info', { regle: 'RC' }),
      alerte('5', 'a_faire', { regle: 'RC' }),
    ];
    const r = compteursParEntree(l, (regle) => (regle === 'RA' ? 'banque' : regle === 'RB' ? 'tva' : 'pieces'));
    expect(r.banque).toEqual({ ouvertes: 2, urgentes: 1, pointExclamation: true });
    expect(r.tva).toEqual({ ouvertes: 1, urgentes: 1, pointExclamation: true });
    expect(r.pieces).toEqual({ ouvertes: 2, urgentes: 0, pointExclamation: false });
  });

  it('ignorees-et-resolues-non-comptees', () => {
    const l = [
      alerte('1', 'urgent', { etat: 'ignoree' }),
      alerte('2', 'bloquant', { etat: 'resolue' }),
      alerte('3', 'urgent', { etat: 'resolue_auto' }),
      alerte('4', 'urgent', { etat: 'reportee' }),
      alerte('5', 'a_faire', { etat: 'ignoree', regle: 'RZ' }),
    ];
    expect(compteursParEntree(l, () => 'e')).toEqual({ e: { ouvertes: 1, urgentes: 1, pointExclamation: true } });
    expect(alertesDuJour(l, 3).urgentesTotal).toBe(1);
  });
});
