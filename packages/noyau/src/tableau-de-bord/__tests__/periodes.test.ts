import { describe, expect, it } from 'vitest';
import { ErreurPeriode, periodeComparaison, periodeDeVue, periodeLibre, type ExerciceBorne } from '../periodes.js';

const civil: ExerciceBorne = {
  id: 'e2026',
  debut: '2026-01-01',
  fin: '2026-12-31',
};
const civilPrec: ExerciceBorne = {
  id: 'e2025',
  debut: '2025-01-01',
  fin: '2025-12-31',
};
const avril: ExerciceBorne = {
  id: 'e2026a',
  debut: '2026-04-01',
  fin: '2027-03-31',
};
const court: ExerciceBorne = {
  id: 'e2025c',
  debut: '2025-07-01',
  fin: '2025-12-31',
};

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurPeriode ? e.code : 'autre';
  }
  return undefined;
};

describe('périodes des trois vues', () => {
  it('vue-mois-coupee-aux-bornes', () => {
    expect(periodeDeVue('mois', civil, '2026-02-15')).toEqual({
      debut: '2026-02-01',
      fin: '2026-02-28',
    });
    expect(periodeDeVue('mois', civil, '2026-12-10')).toEqual({
      debut: '2026-12-01',
      fin: '2026-12-31',
    });
    expect(periodeDeVue('mois', civil, '2026-01-31')).toEqual({
      debut: '2026-01-01',
      fin: '2026-01-31',
    });
    const milieu: ExerciceBorne = {
      id: 'm',
      debut: '2026-03-10',
      fin: '2026-09-20',
    };
    expect(periodeDeVue('mois', milieu, '2026-03-25')).toEqual({
      debut: '2026-03-10',
      fin: '2026-03-31',
    });
    expect(periodeDeVue('mois', milieu, '2026-09-02')).toEqual({
      debut: '2026-09-01',
      fin: '2026-09-20',
    });
    const bissextile: ExerciceBorne = {
      id: 'b',
      debut: '2028-01-01',
      fin: '2028-12-31',
    };
    expect(periodeDeVue('mois', bissextile, '2028-02-03').fin).toBe('2028-02-29');
  });

  it('vue-exercice-decale-avril-mars', () => {
    expect(periodeDeVue('exercice', avril, '2026-11-07')).toEqual({
      debut: '2026-04-01',
      fin: '2027-03-31',
    });
    expect(periodeDeVue('mois', avril, '2027-03-12')).toEqual({
      debut: '2027-03-01',
      fin: '2027-03-31',
    });
  });

  it('depuis-debut-jusqu-au-jour', () => {
    expect(periodeDeVue('depuis_debut', civil, '2026-05-20')).toEqual({
      debut: '2026-01-01',
      fin: '2026-05-20',
    });
    expect(periodeDeVue('depuis_debut', civil, '2026-01-01')).toEqual({
      debut: '2026-01-01',
      fin: '2026-01-01',
    });
  });

  it('jour-hors-exercice-refuse', () => {
    expect(code(() => periodeDeVue('mois', civil, '2025-12-31'))).toBe('jour_hors_exercice');
    expect(code(() => periodeDeVue('exercice', civil, '2027-01-01'))).toBe('jour_hors_exercice');
    expect(code(() => periodeDeVue('depuis_debut', avril, '2027-04-01'))).toBe('jour_hors_exercice');
  });

  it('periode-libre-ordre-inverse-refusee', () => {
    expect(code(() => periodeLibre('2026-05-02', '2026-05-01', civil))).toBe('ordre_inverse');
    expect(code(() => periodeLibre('2025-12-31', '2026-01-05', civil))).toBe('hors_exercice');
    expect(code(() => periodeLibre('2026-12-01', '2027-01-01', civil))).toBe('hors_exercice');
    expect(periodeLibre('2026-05-04', '2026-05-10', civil)).toEqual({
      debut: '2026-05-04',
      fin: '2026-05-10',
    });
    expect(periodeLibre('2026-05-04', '2026-05-04', civil)).toEqual({
      debut: '2026-05-04',
      fin: '2026-05-04',
    });
  });

  it('comparaison-meme-duree', () => {
    const p = periodeDeVue('depuis_debut', civil, '2026-03-15');
    expect(periodeComparaison(p, civil, civilPrec)).toEqual({
      debut: '2025-01-01',
      fin: '2025-03-15',
    });
    const m = periodeDeVue('mois', civil, '2026-02-10');
    expect(periodeComparaison(m, civil, civilPrec)).toEqual({
      debut: '2025-02-01',
      fin: '2025-02-28',
    });
    const e = periodeDeVue('exercice', civil, '2026-02-10');
    expect(periodeComparaison(e, civil, civilPrec)).toEqual({
      debut: '2025-01-01',
      fin: '2025-12-31',
    });
  });

  it('comparaison-exercice-precedent-court-tronquee', () => {
    const e = periodeDeVue('exercice', civil, '2026-02-10');
    expect(periodeComparaison(e, civil, court)).toEqual({
      debut: '2025-07-01',
      fin: '2025-12-31',
      tronquee: true,
    });
    const debut = periodeComparaison({ debut: '2026-01-01', fin: '2026-03-31' }, civil, court);
    expect(debut).toEqual({ debut: '2025-07-01', fin: '2025-09-28' });
    const apres = periodeComparaison({ debut: '2026-11-01', fin: '2026-11-30' }, civil, court);
    expect(apres).toEqual({ vide: 'precedent_trop_court' });
  });

  it('sans-precedent-vide', () => {
    expect(periodeComparaison({ debut: '2026-01-01', fin: '2026-01-31' }, civil)).toEqual({
      vide: 'pas_d_exercice_precedent',
    });
    expect(periodeComparaison({ debut: '2026-01-01', fin: '2026-01-31' }, civil, undefined)).toEqual({
      vide: 'pas_d_exercice_precedent',
    });
  });

  it('dates-invalides-refusees', () => {
    for (const d of ['', '2026-02-30']) {
      expect(code(() => periodeDeVue('mois', civil, d))).toBe('date_invalide');
      expect(code(() => periodeLibre(d, '2026-05-01', civil))).toBe('date_invalide');
      expect(code(() => periodeLibre('2026-05-01', d, civil))).toBe('date_invalide');
      expect(code(() => periodeComparaison({ debut: d, fin: '2026-05-01' }, civil, civilPrec))).toBe('date_invalide');
      expect(code(() => periodeDeVue('mois', { id: 'x', debut: d, fin: '2026-12-31' }, '2026-05-01'))).toBe(
        'date_invalide',
      );
    }
    expect(code(() => periodeDeVue('annee' as never, civil, '2026-05-01'))).toBe('vue_inconnue');
  });
});
