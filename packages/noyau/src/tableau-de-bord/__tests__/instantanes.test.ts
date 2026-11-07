import { describe, expect, it } from 'vitest';
import { appliquerEvenement, carteAntidatee, doitRecalculer, type EvenementEcriture, type Instantane } from '../instantanes.js';

const inst = (debut: string, fin: string, invalide = false): Instantane => ({
  periode: { debut, fin },
  bloc: 'tresorerie',
  versionEcritures: 5,
  invalide,
});

describe('instantanés du tableau de bord', () => {
  it('version-egale-pas-de-recalcul', () => {
    expect(doitRecalculer(inst('2026-01-01', '2026-01-31'), 5)).toBe(false);
  });

  it('version-differente-recalcul', () => {
    expect(doitRecalculer(inst('2026-01-01', '2026-01-31'), 6)).toBe(true);
    expect(doitRecalculer(inst('2026-01-01', '2026-01-31'), 4)).toBe(true);
  });

  it('invalide-recalcul', () => {
    expect(doitRecalculer(inst('2026-01-01', '2026-01-31', true), 5)).toBe(true);
  });

  it('evenement-invalide-seulement-les-periodes-couvrantes', () => {
    const liste = [inst('2026-01-01', '2026-01-31'), inst('2026-02-01', '2026-02-28'), inst('2026-01-01', '2026-12-31')];
    const res = appliquerEvenement(liste, { type: 'validee', date: '2026-01-15' });
    expect(res.map((i) => i.invalide)).toEqual([true, false, true]);
  });

  it('bornes-incluses', () => {
    const liste = [inst('2026-01-01', '2026-01-31')];
    expect(appliquerEvenement(liste, { type: 'corrigee', date: '2026-01-01' })[0]?.invalide).toBe(true);
    expect(appliquerEvenement(liste, { type: 'corrigee', date: '2026-01-31' })[0]?.invalide).toBe(true);
    expect(appliquerEvenement(liste, { type: 'corrigee', date: '2025-12-31' })[0]?.invalide).toBe(false);
    expect(appliquerEvenement(liste, { type: 'corrigee', date: '2026-02-01' })[0]?.invalide).toBe(false);
  });

  it('entree-non-modifiee', () => {
    const a = Object.freeze({ ...inst('2026-01-01', '2026-01-31'), periode: Object.freeze({ debut: '2026-01-01', fin: '2026-01-31' }) });
    const liste = Object.freeze([a]);
    const res = appliquerEvenement(liste, { type: 'contre_passee', date: '2026-01-10' });
    expect(a.invalide).toBe(false);
    expect(liste[0]).toBe(a);
    expect(res[0]).not.toBe(a);
    expect(res[0]?.invalide).toBe(true);
  });

  it('carte-antidatee-periode-declaree', () => {
    const declarees = [{ debut: '2026-01-01', fin: '2026-03-31' }];
    expect(carteAntidatee('2026-02-10', declarees)).toBe(true);
    expect(carteAntidatee('2026-03-31', declarees)).toBe(true);
    expect(carteAntidatee('2026-04-01', declarees)).toBe(false);
    expect(carteAntidatee('2026-02-10', [])).toBe(false);
  });

  it('valeurs-invalides-refusees', () => {
    const i = inst('2026-01-01', '2026-01-31');
    for (const v of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => doitRecalculer(i, v)).toThrow();
    expect(() => appliquerEvenement([i], { type: 'inconnu' as EvenementEcriture, date: '2026-01-10' })).toThrow();
    expect(() => appliquerEvenement([i], { type: 'validee', date: '2026-13-40' })).toThrow();
    expect(() => carteAntidatee('pas-une-date', [])).toThrow();
  });
});
