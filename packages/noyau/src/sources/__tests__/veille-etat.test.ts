import { describe, expect, it } from 'vitest';
import { enPeriodeRapprochee, ErreurEtatVeille, etatVeille, ficheEnRetard, modeDegrade, type Calendrier } from '../veille-etat.js';

// Calendrier de test : seule arithmétique de date du dépôt pour ces règles. Nombres INVENTÉS repris de la spec.
const cal: Calendrier = {
  ajouterJours(date, n) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  },
};
const PERIODE = { debutMoisJour: '12-15', finMoisJour: '01-15' };
const NORMAL = 8;
const RAPPROCHE = 2;

function etat(dernierBalayage: string | null, maintenant: string, extra: Record<string, unknown> = {}) {
  return etatVeille({ dernierBalayage, maintenant, maxJoursNormal: NORMAL, maxJoursRapproche: RAPPROCHE, periode: PERIODE, ...extra } as never, cal);
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurEtatVeille);
    return (e as ErreurEtatVeille).code;
  }
  return undefined;
}

describe('etatVeille', () => {
  it('balayage-recent-ok', () => {
    expect(etat('2026-06-10', '2026-06-10')).toBe('ok');
    expect(etat('2026-06-10', '2026-06-12')).toBe('ok');
    // égalité exacte à la limite = ok
    expect(etat('2026-06-01', '2026-06-09')).toBe('ok');
  });

  it('huit-jours-plus-un-alerte', () => {
    expect(etat('2026-06-01', '2026-06-10')).toBe('alerte');
    expect(etat('2026-06-01', '2026-07-01')).toBe('alerte');
    expect(etat(null, '2026-06-10')).toBe('alerte');
  });

  it('periode-rapprochee-plus-stricte', () => {
    // même écart de trois jours : ok hors période, alerte en période
    expect(etat('2026-06-17', '2026-06-20')).toBe('ok');
    expect(etat('2026-12-17', '2026-12-20')).toBe('alerte');
    // égalité exacte à la limite en période = ok
    expect(etat('2026-12-17', '2026-12-19')).toBe('ok');
    expect(etat(null, '2026-12-20')).toBe('alerte');
  });

  it('refuse-les-entrees-invalides', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 1.5, '8' as unknown as number]) {
      expect(code(() => etat('2026-06-01', '2026-06-02', { maxJoursNormal: mauvais }))).toBe('nombre_invalide');
      expect(code(() => etat('2026-06-01', '2026-06-02', { maxJoursRapproche: mauvais }))).toBe('nombre_invalide');
      expect(code(() => etat(null, '2026-06-02', { maxJoursNormal: mauvais }))).toBe('nombre_invalide');
    }
    expect(etat('2026-06-01', '2026-06-01', { maxJoursNormal: 0 })).toBe('ok');
    expect(code(() => etat('2026-06-05', '2026-06-04'))).toBe('ordre_inverse');
    expect(code(() => etat('2026-06-01', '2026-06-0'))).toBe('date_invalide');
    expect(code(() => etat('2026-6-01', '2026-06-02'))).toBe('date_invalide');
    expect(code(() => etat('2026-06-01', ''))).toBe('date_invalide');
    expect(code(() => etat('2026-06-01', '2026-13-01'))).toBe('date_invalide');
    expect(code(() => etat('2026-06-01', '2026-06-02', { periode: { debutMoisJour: '13-01', finMoisJour: '01-15' } }))).toBe('periode_invalide');
  });
});

describe('enPeriodeRapprochee', () => {
  it('periode-qui-passe-le-31-decembre', () => {
    for (const d of ['2026-12-15', '2026-12-31', '2027-01-01', '2027-01-15']) expect(enPeriodeRapprochee(d, PERIODE)).toBe(true);
    for (const d of ['2026-12-14', '2027-01-16', '2026-06-15', '2026-07-01']) expect(enPeriodeRapprochee(d, PERIODE)).toBe(false);
  });

  it('periode-dans-la-meme-annee', () => {
    const p = { debutMoisJour: '03-10', finMoisJour: '04-20' };
    expect(enPeriodeRapprochee('2026-03-10', p)).toBe(true);
    expect(enPeriodeRapprochee('2026-04-20', p)).toBe(true);
    expect(enPeriodeRapprochee('2026-03-09', p)).toBe(false);
    expect(enPeriodeRapprochee('2026-04-21', p)).toBe(false);
    expect(enPeriodeRapprochee('2026-01-01', p)).toBe(false);
    expect(enPeriodeRapprochee('2026-12-31', p)).toBe(false);
    expect(enPeriodeRapprochee('2026-05-01', { debutMoisJour: '05-01', finMoisJour: '05-01' })).toBe(true);
  });

  it('refuse-les-periodes-et-dates-invalides', () => {
    const ko = (debutMoisJour: string, finMoisJour: string) => code(() => enPeriodeRapprochee('2026-06-01', { debutMoisJour, finMoisJour }));
    expect(ko('13-01', '01-15')).toBe('periode_invalide');
    expect(ko('00-10', '01-15')).toBe('periode_invalide');
    expect(ko('12-15', '02-30')).toBe('periode_invalide');
    expect(ko('04-31', '05-01')).toBe('periode_invalide');
    expect(ko('12-00', '01-15')).toBe('periode_invalide');
    expect(ko('12-32', '01-15')).toBe('periode_invalide');
    expect(ko('1-15', '01-15')).toBe('periode_invalide');
    expect(ko('12-15', '01-15 ')).toBe('periode_invalide');
    expect(ko('', '')).toBe('periode_invalide');
    expect(ko('12-15', undefined as unknown as string)).toBe('periode_invalide');
    expect(ko('02-29', '03-01')).toBeUndefined();
    expect(ko('01-31', '12-31')).toBeUndefined();
    expect(code(() => enPeriodeRapprochee('2026-02-30', PERIODE))).toBe('date_invalide');
    expect(code(() => enPeriodeRapprochee('2026-00-10', PERIODE))).toBe('date_invalide');
    expect(code(() => enPeriodeRapprochee('2026-12-00', PERIODE))).toBe('date_invalide');
    expect(code(() => enPeriodeRapprochee('2026-04-31', PERIODE))).toBe('date_invalide');
    expect(code(() => enPeriodeRapprochee('x2026-06-01', PERIODE))).toBe('date_invalide');
    expect(code(() => enPeriodeRapprochee('2026-06-01x', PERIODE))).toBe('date_invalide');
    expect(code(() => enPeriodeRapprochee(undefined as unknown as string, PERIODE))).toBe('date_invalide');
  });
});

describe('ficheEnRetard', () => {
  const base = { detecteeLe: '2026-06-01', ficheCreeeLe: null as string | null, maintenant: '2026-06-05', maxJours: 7 };
  const f = (o: Record<string, unknown>) => ficheEnRetard({ ...base, ...o } as never, cal);

  it('fiche-creee-a-temps', () => {
    expect(f({ ficheCreeeLe: '2026-06-02' })).toBe(false);
    expect(f({ ficheCreeeLe: '2026-06-08', maintenant: '2026-07-30' })).toBe(false); // égalité à la limite
    expect(f({ ficheCreeeLe: null, maintenant: '2026-06-08' })).toBe(false); // pas encore en retard, égalité
    expect(f({ ficheCreeeLe: '2026-06-01', maxJours: 0 })).toBe(false);
  });

  it('fiche-en-retard', () => {
    expect(f({ ficheCreeeLe: null, maintenant: '2026-06-09' })).toBe(true);
    expect(f({ ficheCreeeLe: '2026-06-09', maintenant: '2026-06-09' })).toBe(true);
    expect(f({ ficheCreeeLe: '2026-06-09', maintenant: '2026-08-01' })).toBe(true);
    expect(f({ ficheCreeeLe: null, maintenant: '2026-06-02', maxJours: 0 })).toBe(true);
  });

  it('refuse-les-entrees-invalides', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, -1, 2.5]) {
      expect(code(() => f({ maxJours: mauvais }))).toBe('nombre_invalide');
    }
    expect(code(() => f({ maintenant: '2026-05-31' }))).toBe('ordre_inverse');
    expect(code(() => f({ ficheCreeeLe: '2026-05-31' }))).toBe('ordre_inverse');
    expect(code(() => f({ ficheCreeeLe: '2026-06-06', maintenant: '2026-06-05' }))).toBe('ordre_inverse');
    expect(code(() => f({ detecteeLe: 'bientôt' }))).toBe('date_invalide');
    expect(code(() => f({ ficheCreeeLe: 'bientôt' }))).toBe('date_invalide');
    expect(code(() => f({ maintenant: '' }))).toBe('date_invalide');
  });
});

describe('modeDegrade', () => {
  it('veille-en-alerte-bloque-le-depot-et-pose-le-bandeau', () => {
    expect(modeDegrade({ etat: 'alerte', parametresPerimes: 0 })).toEqual({ depotAutomatiqueAutorise: false, bandeau: 'regles_possiblement_perimees' });
    expect(modeDegrade({ etat: 'ok', parametresPerimes: 2 })).toEqual({ depotAutomatiqueAutorise: false, bandeau: 'regles_possiblement_perimees' });
    expect(modeDegrade({ etat: 'alerte', parametresPerimes: 1 })).toEqual({ depotAutomatiqueAutorise: false, bandeau: 'regles_possiblement_perimees' });
    expect(modeDegrade({ etat: 'ok', parametresPerimes: 0 })).toEqual({ depotAutomatiqueAutorise: true, bandeau: null });
  });

  it('refuse-les-nombres-invalides', () => {
    for (const mauvais of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '0' as unknown as number]) {
      expect(code(() => modeDegrade({ etat: 'ok', parametresPerimes: mauvais }))).toBe('nombre_invalide');
    }
  });
});
