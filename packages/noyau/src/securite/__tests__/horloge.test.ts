import { describe, expect, it } from 'vitest';
import { dateComptable, observerHorloge } from '../horloge.js';

const arg = { code: 'argument_invalide', name: 'ErreurSecurite' };
const PARIS = 'Europe/Paris';
const JOUR = 86_400_000;
const T0 = 1_800_000_000_000;

describe('securite/horloge — date comptable', () => {
  it('paris-23h30-utc-reste-le-31', () => {
    expect(dateComptable('2026-12-31T22:30:00Z', PARIS)).toBe('2026-12-31');
    expect(dateComptable('2026-12-31T22:30:00Z', 'UTC')).toBe('2026-12-31');
    expect(dateComptable('2026-12-31T23:30:00Z', PARIS)).toBe('2027-01-01');
    expect(dateComptable('2026-12-31T23:30:00Z', 'UTC')).toBe('2026-12-31');
    expect(dateComptable('2027-01-01T00:30:00+01:00', 'UTC')).toBe('2026-12-31');
    expect(dateComptable('2027-01-01T00:30:00.250Z', 'America/Cayenne')).toBe('2026-12-31');
    expect(dateComptable('0500-03-04T12:00:00Z', 'UTC')).toBe('0500-03-04');
  });

  it('utc-minuit-pile', () => {
    expect(dateComptable('2026-06-15T00:00:00Z', 'UTC')).toBe('2026-06-15');
    expect(dateComptable('2026-06-14T23:59:59Z', 'UTC')).toBe('2026-06-14');
    expect(dateComptable('2024-02-29T00:00:00Z', 'UTC')).toBe('2024-02-29');
  });

  it('changement-d-heure-ete-et-hiver', () => {
    expect(dateComptable('2026-03-29T21:59:59Z', PARIS)).toBe('2026-03-29');
    expect(dateComptable('2026-03-29T22:00:00Z', PARIS)).toBe('2026-03-30');
    expect(dateComptable('2026-10-25T22:59:59Z', PARIS)).toBe('2026-10-25');
    expect(dateComptable('2026-10-25T23:00:00Z', PARIS)).toBe('2026-10-26');
  });

  it('fuseau-inconnu-refuse', () => {
    for (const f of ['Mars/Olympe', '', ' ', undefined, null, 5, {}]) {
      expect(() => dateComptable('2026-01-01T00:00:00Z', f as never)).toThrow(expect.objectContaining(arg));
    }
  });

  it('instant-invalide-refuse', () => {
    const mauvais = [
      '', '2026-02-30T00:00:00Z', '2026-13-01T00:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T00:60:00Z',
      '2026-01-01T00:00:60Z', '2026-01-01T00:00:00', '2026-01-01', 'abc', NaN, undefined, null, 0,
      new Date(0), '2025-02-29T00:00:00Z', '2026-01-01T00:00:00Z ',
    ];
    for (const i of mauvais) {
      expect(() => dateComptable(i as never, PARIS)).toThrow(expect.objectContaining(arg));
    }
  });
});

describe('securite/horloge — horloge monotone', () => {
  const tol = 5000;

  it('recul-de-trente-jours-bloque-et-alerte', () => {
    const vue = { plusGrandInstantMs: T0 };
    const r = observerHorloge(vue, T0 - 30 * JOUR, tol);
    expect(r).toEqual({ bloque: true, alerte: true, vue: { plusGrandInstantMs: T0 } });
    expect(vue).toEqual({ plusGrandInstantMs: T0 });
    expect(observerHorloge(vue, T0 - tol - 1, tol)).toMatchObject({ bloque: true, alerte: true });
  });

  it('recul-egal-a-la-tolerance-accepte', () => {
    const vue = { plusGrandInstantMs: T0 };
    expect(observerHorloge(vue, T0 - tol, tol)).toEqual({ bloque: false, alerte: false, vue: { plusGrandInstantMs: T0 } });
    expect(observerHorloge(vue, T0, 0)).toEqual({ bloque: false, alerte: false, vue: { plusGrandInstantMs: T0 } });
    expect(observerHorloge(vue, T0 - 1, 0)).toMatchObject({ bloque: true, alerte: true });
  });

  it('avance-normale-met-a-jour', () => {
    const vue = { plusGrandInstantMs: T0 };
    expect(observerHorloge(vue, T0 + 1, tol)).toEqual({ bloque: false, alerte: false, vue: { plusGrandInstantMs: T0 + 1 } });
    expect(vue).toEqual({ plusGrandInstantMs: T0 });
    expect(observerHorloge(null, T0, tol)).toEqual({ bloque: false, alerte: false, vue: { plusGrandInstantMs: T0 } });
    expect(observerHorloge(null, 0, 0)).toEqual({ bloque: false, alerte: false, vue: { plusGrandInstantMs: 0 } });
  });

  it('tolerance-invalide-refusee', () => {
    const vue = { plusGrandInstantMs: T0 };
    for (const t of [NaN, -1, 1.5, Infinity, -Infinity, '5', undefined, null]) {
      expect(() => observerHorloge(vue, T0, t as never)).toThrow(expect.objectContaining(arg));
    }
    for (const m of [NaN, -1, 1.5, Infinity, '5', undefined, null]) {
      expect(() => observerHorloge(vue, m as never, tol)).toThrow(expect.objectContaining(arg));
    }
    for (const v of [undefined, {}, { plusGrandInstantMs: NaN }, { plusGrandInstantMs: 1.5 }, { plusGrandInstantMs: -1 }, 5]) {
      expect(() => observerHorloge(v as never, T0, tol)).toThrow(expect.objectContaining(arg));
    }
  });
});
