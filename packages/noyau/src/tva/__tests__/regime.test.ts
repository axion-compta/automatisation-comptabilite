import { describe, expect, it } from 'vitest';
import { ajouterPeriodeRegime, ErreurRegimeTva, estTraite, regimeAuJour, type PeriodeRegime } from '../regime.js';

function periode(debut: string, fin: string | null, formulaire: string, regime: PeriodeRegime['regime'] = 'reel_simplifie'): PeriodeRegime {
  return {
    effetDebut: debut,
    effetFin: fin,
    regime,
    periodicite: 'annuelle',
    exigibiliteServices: 'encaissements',
    formulaire,
  };
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurRegimeTva) return e.code;
    throw e;
  }
  return undefined;
}

describe('regimeAuJour', () => {
  it('regime-en-vigueur', () => {
    const h = [periode('2020-01-01', '2024-06-01', 'FORM_A'), periode('2024-06-01', null, 'FORM_B', 'reel_normal')];
    expect(regimeAuJour(h, '2022-03-15').formulaire).toBe('FORM_A');
    expect(regimeAuJour(h, '2024-06-01').formulaire).toBe('FORM_B');
    expect(regimeAuJour(h, '2024-06-01').regime).toBe('reel_normal');
    expect(regimeAuJour(h, '2099-12-31').formulaire).toBe('FORM_B');
  });

  it('fin-exclue', () => {
    const h = [periode('2020-01-01', '2024-06-01', 'FORM_A')];
    expect(regimeAuJour(h, '2024-05-31').formulaire).toBe('FORM_A');
    expect(code(() => regimeAuJour(h, '2024-06-01'))).toBe('regime_absent');
  });

  it('absent-refuse', () => {
    expect(code(() => regimeAuJour([], '2024-01-01'))).toBe('regime_absent');
    expect(code(() => regimeAuJour([periode('2025-01-01', null, 'FORM_A')], '2024-12-31'))).toBe('regime_absent');
  });

  it('ambigu-refuse', () => {
    const h = [periode('2020-01-01', null, 'FORM_A'), periode('2022-01-01', null, 'FORM_B')];
    expect(code(() => regimeAuJour(h, '2023-01-01'))).toBe('regime_ambigu');
    expect(regimeAuJour(h, '2021-01-01').formulaire).toBe('FORM_A');
  });

  it('refuse les dates mal formées et les périodes vides', () => {
    const h = [periode('2020-01-01', null, 'FORM_A')];
    for (const d of ['', '2024-13-01', '2024-02-30', '2024-1-1', 'abc', '2024-01-01T00:00']) {
      expect(code(() => regimeAuJour(h, d))).toBe('date_invalide');
    }
    expect(code(() => regimeAuJour([periode('xx', null, 'FORM_A')], '2024-01-01'))).toBe('date_invalide');
    expect(code(() => regimeAuJour([periode('2020-01-01', '2020-13-40', 'FORM_A')], '2024-01-01'))).toBe('date_invalide');
    expect(code(() => regimeAuJour([periode('2020-01-01', '2020-01-01', 'FORM_A')], '2020-01-01'))).toBe('periode_vide');
    expect(code(() => regimeAuJour([periode('2021-01-01', '2020-01-01', 'FORM_A')], '2020-06-01'))).toBe('periode_vide');
  });

  it("donne le même résultat quand l'ordre de l'historique est inversé", () => {
    const h = [periode('2020-01-01', '2024-06-01', 'FORM_A'), periode('2024-06-01', null, 'FORM_B')];
    const inverse = [...h].reverse();
    for (const d of ['2021-01-01', '2024-05-31', '2024-06-01']) {
      expect(regimeAuJour(inverse, d)).toEqual(regimeAuJour(h, d));
    }
  });
});

describe('ajouterPeriodeRegime', () => {
  it('ajout-sans-modifier-l-entree', () => {
    const h = [periode('2020-01-01', null, 'FORM_A')];
    const copie = structuredClone(h);
    const n = ajouterPeriodeRegime(h, periode('2024-06-01', null, 'FORM_B', 'reel_normal'));
    expect(h).toEqual(copie);
    expect(n).not.toBe(h);
    expect(n).toHaveLength(2);
    expect(n[0]?.effetFin).toBe('2024-06-01');
    expect(n[0]?.formulaire).toBe('FORM_A');
    expect(n[1]?.effetFin).toBeNull();
    expect(regimeAuJour(n, '2024-05-31').formulaire).toBe('FORM_A');
    expect(regimeAuJour(n, '2024-06-01').formulaire).toBe('FORM_B');
  });

  it('accepte un premier ajout et ignore l ordre reçu', () => {
    const premier = ajouterPeriodeRegime([], periode('2020-01-01', null, 'FORM_A'));
    expect(premier).toHaveLength(1);
    const h = [periode('2022-01-01', null, 'FORM_B'), periode('2020-01-01', '2022-01-01', 'FORM_A')];
    const n = ajouterPeriodeRegime(h, periode('2023-01-01', null, 'FORM_C'));
    expect(n.map((p) => p.formulaire)).toEqual(['FORM_A', 'FORM_B', 'FORM_C']);
    expect(n[1]?.effetFin).toBe('2023-01-01');
  });

  it('date-anterieure-refusee', () => {
    const h = [periode('2020-01-01', '2022-01-01', 'FORM_A'), periode('2022-01-01', null, 'FORM_B')];
    expect(code(() => ajouterPeriodeRegime(h, periode('2021-06-01', null, 'FORM_C')))).toBe('date_anterieure');
    expect(code(() => ajouterPeriodeRegime(h, periode('2022-01-01', null, 'FORM_C')))).toBe('periode_vide');
    expect(code(() => ajouterPeriodeRegime(h, periode('pas-une-date', null, 'FORM_C')))).toBe('date_invalide');
  });
});

describe('bascule-propre-a-chaque-societe', () => {
  it('deux sociétés basculent à deux dates différentes', () => {
    const societeUne = ajouterPeriodeRegime([periode('2019-01-01', null, 'FORM_A')], periode('2026-03-01', null, 'FORM_B'));
    const societeDeux = ajouterPeriodeRegime([periode('2019-01-01', null, 'FORM_A')], periode('2027-09-15', null, 'FORM_B'));
    const jour = '2026-12-31';
    expect(regimeAuJour(societeUne, jour).formulaire).toBe('FORM_B');
    expect(regimeAuJour(societeDeux, jour).formulaire).toBe('FORM_A');
  });
});

describe('estTraite', () => {
  it('compare le régime à la liste des régimes traités', () => {
    const r = periode('2020-01-01', null, 'FORM_A', 'franchise');
    expect(estTraite(r, ['franchise', 'reel_normal'])).toBe(true);
    expect(estTraite(r, ['reel_normal'])).toBe(false);
    expect(estTraite(r, [])).toBe(false);
  });
});
