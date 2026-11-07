import { describe, expect, it } from 'vitest';
import {
  carteTva,
  datesDeRappel,
  ErreurRappelTva,
  rappelsRestants,
  type Calendrier,
} from '../rappel-paiement.js';

// Calendrier de test : samedi et dimanche non ouvrés. Dates et montants INVENTÉS.
const JOUR_MS = 86_400_000;
const calendrier: Calendrier = {
  ajouterJours(date, n) {
    const t = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
    return new Date(t + n * JOUR_MS).toISOString().slice(0, 10);
  },
  estOuvre(date) {
    const j = new Date(`${date}T00:00:00Z`).getUTCDay();
    return j !== 0 && j !== 6;
  },
};

const PAIEMENT = { par: 'Camille Exemple', le: '2026-11-05', origine: 'rapprochement' as const };

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurRappelTva) return e.code;
    throw e;
  }
  return undefined;
}

describe('datesDeRappel', () => {
  it('d1-rappels-05-13-17-novembre', () => {
    // Échéance du vendredi 20/11/2026, rappels à 15, 7 et 3 jours.
    expect(datesDeRappel('2026-11-20', [15, 7, 3], calendrier, 5)).toEqual(['2026-11-05', '2026-11-13', '2026-11-17']);
  });

  it('d5-dimanche-08-11-avance-au-vendredi-06-11', () => {
    expect(calendrier.estOuvre('2026-11-08')).toBe(false);
    expect(datesDeRappel('2026-11-11', [3], calendrier, 5)).toEqual(['2026-11-06']);
    // Samedi : un seul jour de recul.
    expect(datesDeRappel('2026-11-10', [3], calendrier, 5)).toEqual(['2026-11-06']);
    // Jamais après la date visée.
    expect(datesDeRappel('2026-11-11', [3], calendrier, 5)[0]! <= '2026-11-08').toBe(true);
  });

  it('desordre-doublons-et-vide', () => {
    expect(datesDeRappel('2026-11-20', [3, 15, 7], calendrier, 5)).toEqual(
      datesDeRappel('2026-11-20', [15, 7, 3], calendrier, 5),
    );
    // 12, 13 et 14 jours avant le 20/11 : dimanche 08, samedi 07, vendredi 06 → un seul rappel.
    expect(datesDeRappel('2026-11-20', [12, 13, 14], calendrier, 5)).toEqual(['2026-11-06']);
    expect(datesDeRappel('2026-11-20', [], calendrier, 5)).toEqual([]);
    expect(datesDeRappel('2026-11-20', [0], calendrier, 5)).toEqual(['2026-11-20']);
  });

  it('refus-des-entrees-invalides', () => {
    for (const j of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => datesDeRappel('2026-11-20', [j], calendrier, 5))).toBe('jours_invalides');
    }
    for (const m of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => datesDeRappel('2026-11-20', [3], calendrier, m))).toBe('recul_invalide');
    }
    expect(code(() => datesDeRappel('20/11/2026', [3], calendrier, 5))).toBe('date_invalide');
    expect(code(() => datesDeRappel('2026-02-30', [3], calendrier, 5))).toBe('date_invalide');
  });

  it('recul-maximal-atteint-refuse', () => {
    // 08/11 dimanche : 2 reculs nécessaires (08 → 07 → 06).
    expect(datesDeRappel('2026-11-11', [3], calendrier, 2)).toEqual(['2026-11-06']);
    expect(code(() => datesDeRappel('2026-11-11', [3], calendrier, 1))).toBe('calendrier_sans_jour_ouvre');
    expect(code(() => datesDeRappel('2026-11-11', [3], calendrier, 0))).toBe('calendrier_sans_jour_ouvre');
    const jamais: Calendrier = { ...calendrier, estOuvre: () => false };
    expect(code(() => datesDeRappel('2026-11-20', [3], jamais, 10))).toBe('calendrier_sans_jour_ouvre');
  });
});

describe('carteTva', () => {
  const validee = (c: number) => ({ statut: 'validee' as const, aDecaisserCentimes: c });

  it('d1-montant-345-678', () => {
    expect(carteTva({ declaration: validee(345_678), piecesEnDoute: 0, paiement: null })).toEqual({
      etat: 'montant',
      centimes: 345_678,
    });
    // Crédit de TVA : montant négatif accepté.
    expect(carteTva({ declaration: validee(-1200), piecesEnDoute: 0, paiement: null })).toEqual({
      etat: 'montant',
      centimes: -1200,
    });
    expect(carteTva({ declaration: validee(0), piecesEnDoute: 0, paiement: null })).toEqual({ etat: 'montant', centimes: 0 });
  });

  it('d2-deux-pieces-en-doute-aucun-montant', () => {
    const r = carteTva({ declaration: validee(345_678), piecesEnDoute: 2, paiement: null });
    expect(r).toEqual({ etat: 'bloquee', pieces: 2 });
    expect(JSON.stringify(r)).not.toContain('345');
  });

  it('d2-apres-levee-montant', () => {
    expect(carteTva({ declaration: validee(345_678), piecesEnDoute: 0, paiement: null }).etat).toBe('montant');
  });

  it('non-validee-a-confirmer', () => {
    const preparee = { statut: 'preparee' as const, aDecaisserCentimes: 345_678 };
    const r = carteTva({ declaration: preparee, piecesEnDoute: 0, paiement: null });
    expect(r).toEqual({ etat: 'a_confirmer' });
    expect(carteTva({ declaration: null, piecesEnDoute: 0, paiement: null })).toEqual({ etat: 'a_confirmer' });
  });

  it('doute-prioritaire-sur-validee', () => {
    expect(carteTva({ declaration: validee(100), piecesEnDoute: 1, paiement: null })).toEqual({
      etat: 'bloquee',
      pieces: 1,
    });
    // Le doute passe aussi avant un paiement.
    expect(carteTva({ declaration: validee(100), piecesEnDoute: 1, paiement: PAIEMENT }).etat).toBe('bloquee');
  });

  it('paiement-prioritaire-sur-statut', () => {
    expect(carteTva({ declaration: null, piecesEnDoute: 0, paiement: PAIEMENT })).toEqual({
      etat: 'payee',
      par: 'Camille Exemple',
      le: '2026-11-05',
      origine: 'rapprochement',
    });
    expect(
      carteTva({ declaration: validee(5), piecesEnDoute: 0, paiement: { ...PAIEMENT, origine: 'coche' } }),
    ).toMatchObject({ etat: 'payee', origine: 'coche' });
  });

  it('refus-des-entrees-invalides', () => {
    for (const n of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => carteTva({ declaration: null, piecesEnDoute: n, paiement: null }))).toBe('pieces_invalides');
    }
    for (const m of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => carteTva({ declaration: validee(m), piecesEnDoute: 0, paiement: null }))).toBe('montant_invalide');
    }
    expect(code(() => carteTva({ declaration: null, piecesEnDoute: 0, paiement: { ...PAIEMENT, par: '' } }))).toBe(
      'trace_invalide',
    );
    expect(code(() => carteTva({ declaration: null, piecesEnDoute: 0, paiement: { ...PAIEMENT, le: '5/11' } }))).toBe(
      'date_invalide',
    );
  });
});

describe('rappelsRestants', () => {
  it('d3-rapprochement-supprime-les-rappels', () => {
    const dates = ['2026-11-05', '2026-11-13', '2026-11-17'];
    expect(rappelsRestants(dates, PAIEMENT)).toEqual([]);
    expect(rappelsRestants(dates, { ...PAIEMENT, origine: 'coche' })).toEqual([]);
    const sans = rappelsRestants(dates, null);
    expect(sans).toEqual(dates);
    expect(sans).not.toBe(dates);
  });
});
