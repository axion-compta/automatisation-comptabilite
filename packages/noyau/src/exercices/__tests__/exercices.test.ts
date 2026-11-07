import { describe, expect, it } from 'vitest';
import {
  creerExercice,
  dureeEnMois,
  estVerrouillee,
  periodeDe,
  periodesMensuelles,
} from '../exercices.js';

// Bornes de test inventées : ce ne sont pas des valeurs légales.
const bornes = { minMois: 3, maxMois: 30 };

describe('exercices', () => {
  it('exercice-avril-mars', () => {
    const r = creerExercice({ id: 'ex1', debut: '2026-04-01', fin: '2027-03-31' }, bornes);
    expect(r.resultat).toBe('accepte');
    expect(r.exercice).toEqual({ id: 'ex1', debut: '2026-04-01', fin: '2027-03-31' });
    expect(dureeEnMois('2026-04-01', '2027-03-31')).toEqual({ mois: 12, aligne: true });
    const p = periodesMensuelles(r.exercice!);
    expect(p[0]).toEqual({ debut: '2026-04-01', fin: '2026-04-30', cle: '2026-04' });
    expect(p[11]).toEqual({ debut: '2027-03-01', fin: '2027-03-31', cle: '2027-03' });
  });

  it('duree-hors-bornes-refusee', () => {
    const court = creerExercice({ id: 'a', debut: '2026-01-01', fin: '2026-02-28' }, bornes);
    expect(court).toEqual({ resultat: 'refuse', motif: 'duree_hors_bornes' });
    const long = creerExercice({ id: 'b', debut: '2026-01-01', fin: '2028-12-31' }, bornes);
    expect(long.resultat).toBe('refuse');
    expect(long.motif).toBe('duree_hors_bornes');
    expect(long.exercice).toBeUndefined();
    // Les bornes elles-mêmes sont acceptées.
    expect(creerExercice({ id: 'c', debut: '2026-01-01', fin: '2026-03-31' }, bornes).resultat).toBe('accepte');
    expect(creerExercice({ id: 'd', debut: '2026-01-01', fin: '2028-06-30' }, bornes).resultat).toBe('accepte');
  });

  it('fin-avant-debut-refusee', () => {
    const r = creerExercice({ id: 'a', debut: '2026-06-01', fin: '2026-05-31' }, bornes);
    expect(r).toEqual({ resultat: 'refuse', motif: 'fin_avant_debut' });
  });

  it('dates-non-alignees-a-verifier', () => {
    const r = creerExercice({ id: 'a', debut: '2026-01-15', fin: '2026-12-31' }, bornes);
    expect(r.resultat).toBe('a_verifier');
    expect(r.exercice).toBeUndefined();
    expect(creerExercice({ id: 'b', debut: '2026-01-01', fin: '2026-12-30' }, bornes).resultat).toBe('a_verifier');
    expect(dureeEnMois('2026-01-15', '2026-12-31').aligne).toBe(false);
    expect(dureeEnMois('2026-01-01', '2026-12-30').aligne).toBe(false);
    expect(dureeEnMois('2024-02-01', '2024-02-29')).toEqual({ mois: 1, aligne: true });
    expect(dureeEnMois('2024-02-01', '2024-02-28').aligne).toBe(false);
    expect(dureeEnMois('2025-02-01', '2025-02-28').aligne).toBe(true);
    expect(dureeEnMois('2025-02-01', '2025-02-29').aligne).toBe(false);
    expect(dureeEnMois('2026-04-01', '2026-04-30').aligne).toBe(true);
    expect(dureeEnMois('2026-04-01', '2026-04-31').aligne).toBe(false);
  });

  it('douze-periodes-mensuelles', () => {
    const p = periodesMensuelles({ id: 'ex', debut: '2024-01-01', fin: '2024-12-31' });
    expect(p).toHaveLength(12);
    expect(p.map((x) => x.cle)).toEqual([
      '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
      '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
    ]);
    expect(p[1]).toEqual({ debut: '2024-02-01', fin: '2024-02-29', cle: '2024-02' });
    expect(p[3]?.fin).toBe('2024-04-30');
    expect(p[0]?.fin).toBe('2024-01-31');
    const n = periodesMensuelles({ id: 'ex', debut: '2025-01-01', fin: '2025-12-31' });
    expect(n[1]?.fin).toBe('2025-02-28');
    // Siècle non bissextile, et multiple de 400 bissextile.
    expect(periodesMensuelles({ id: 'x', debut: '2100-02-01', fin: '2100-02-28' })[0]?.fin).toBe('2100-02-28');
    expect(periodesMensuelles({ id: 'x', debut: '2000-02-01', fin: '2000-02-29' })[0]?.fin).toBe('2000-02-29');
    // Exercice de 18 mois.
    expect(periodesMensuelles({ id: 'l', debut: '2026-07-01', fin: '2027-12-31' })).toHaveLength(18);
  });

  it('periode-hors-exercice', () => {
    const ex = { id: 'ex', debut: '2026-04-01', fin: '2027-03-31' };
    expect(periodeDe('2026-04-01', ex)).toBe('2026-04');
    expect(periodeDe('2027-03-31', ex)).toBe('2027-03');
    expect(periodeDe('2026-12-15', ex)).toBe('2026-12');
    expect(periodeDe('2026-03-31', ex)).toBeUndefined();
    expect(periodeDe('2027-04-01', ex)).toBeUndefined();
  });

  it('mois-verrouille-refuse', () => {
    const etat = { periodesVerrouillees: ['2026-04', '2026-05'], exerciceCloture: false };
    expect(estVerrouillee('2026-04-15', etat)).toBe(true);
    expect(estVerrouillee('2026-05-31', etat)).toBe(true);
    expect(estVerrouillee('2026-06-01', etat)).toBe(false);
    expect(estVerrouillee('2026-06-01', { periodesVerrouillees: [], exerciceCloture: true })).toBe(true);
    expect(estVerrouillee('2026-06-01', { periodesVerrouillees: [], exerciceCloture: false })).toBe(false);
  });
});
