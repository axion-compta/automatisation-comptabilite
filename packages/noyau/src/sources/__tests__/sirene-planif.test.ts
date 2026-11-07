import { describe, expect, it } from 'vitest';
import { ErreurPlanif, peutEnvoyer, planifier, respecteLeQuota } from '../sirene-planif.js';

// Valeurs de test inventées (celles de la spec sont à vérifier) : 30 par fenêtre de 60 s, un envoi toutes les 2,5 s.
const o = { quotaParFenetre: 30, fenetreMs: 60000, intervalleMinMs: 2500, tailleLot: 1 };

function luhn(base: string): string {
  let somme = 0;
  for (let i = 0; i < base.length; i++) {
    let c = Number(base[base.length - 1 - i]);
    if (i % 2 === 0) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somme += c;
  }
  return base + String((10 - (somme % 10)) % 10);
}

function sirens(n: number): string[] {
  return Array.from({ length: n }, (_v, k) => luhn(String(10000000 + k)));
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurPlanif) return e.code;
    throw e;
  }
  return undefined;
}

describe('sirene-planif', () => {
  it('mille-siren-jamais-plus-de-trente-par-fenetre', () => {
    const plan = planifier(sirens(1000), 0, o);
    const instants = plan.map((p) => p.a);
    expect(respecteLeQuota(instants, o)).toBe(true);
    for (const t of instants) {
      expect(instants.filter((x) => x > t - o.fenetreMs && x <= t).length).toBeLessThanOrEqual(30);
    }
    expect(respecteLeQuota(Array.from({ length: 31 }, (_v, k) => k * 1000), o)).toBe(false);
    expect(respecteLeQuota(Array.from({ length: 30 }, (_v, k) => k * 1000), o)).toBe(true);
  });

  it('mille-siren-en-quarante-deux-minutes-au-plus', () => {
    const plan = planifier(sirens(1000), 5000, o);
    const dernier = plan[plan.length - 1]!.a;
    expect(plan[0]!.a).toBe(5000);
    expect(dernier - 5000).toBeLessThanOrEqual(42 * 60000);
    expect(dernier - 5000).toBe(999 * 2500);
  });

  it('aucune-demande-perdue-ni-doublee', () => {
    const d = sirens(57);
    const plan = planifier(d, 0, { ...o, tailleLot: 20 });
    const aplat = plan.flatMap((p) => p.lot);
    expect(aplat).toEqual(d);
    expect(new Set(aplat).size).toBe(57);
    expect(planifier(['a', 'a', 'b'], 0, o).flatMap((p) => p.lot)).toEqual(['a', 'a', 'b']);
  });

  it('ordre-d-arrivee-garde', () => {
    const d = ['9', '3', '7', '1'];
    const plan = planifier(d, 100, o);
    expect(plan.map((p) => p.lot[0])).toEqual(d);
    expect(plan.map((p) => p.a)).toEqual([100, 2600, 5100, 7600]);
  });

  it('lots-de-vingt', () => {
    const plan = planifier(sirens(45), 0, { ...o, tailleLot: 20 });
    expect(plan.map((p) => p.lot.length)).toEqual([20, 20, 5]);
    expect(plan.map((p) => p.a)).toEqual([0, 2500, 5000]);
    expect(planifier(sirens(3), 0, { ...o, tailleLot: 20 }).map((p) => p.lot.length)).toEqual([3]);
    expect(planifier(sirens(1), 7, o)).toEqual([{ lot: sirens(1), a: 7 }]);
  });

  it('file-vide-aucun-envoi', () => {
    expect(planifier([], 0, o)).toEqual([]);
    expect(respecteLeQuota([], o)).toBe(true);
    expect(peutEnvoyer([], 0, o)).toBe(true);
  });

  it('peut-envoyer-a-la-limite-exacte', () => {
    const p = { quotaParFenetre: 2, fenetreMs: 100, intervalleMinMs: 10, tailleLot: 1 };
    expect(peutEnvoyer([0, 50], 99, p)).toBe(false);
    expect(peutEnvoyer([0, 50], 100, p)).toBe(true);
    expect(peutEnvoyer([50], 59, { ...p, quotaParFenetre: 5 })).toBe(false);
    expect(peutEnvoyer([50], 60, { ...p, quotaParFenetre: 5 })).toBe(true);
    expect(peutEnvoyer([20], 40, p)).toBe(true);
    expect(peutEnvoyer([10, 20], 40, p)).toBe(false);
    expect(peutEnvoyer([50, 0], 99, p)).toBe(false);
    expect(peutEnvoyer([50, 0], 100, p)).toBe(true);
    expect(peutEnvoyer([50, 0], 60, { ...p, quotaParFenetre: 5 })).toBe(true);
    const plan = planifier(['a', 'b', 'c'], 0, { ...p, intervalleMinMs: 50 });
    expect(plan.map((x) => x.a)).toEqual([0, 50, 100]);
  });

  it('options-invalides-refusees', () => {
    const mauvaises = [Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 1.5];
    for (const cle of ['quotaParFenetre', 'fenetreMs', 'intervalleMinMs', 'tailleLot'] as const) {
      for (const v of mauvaises) {
        const oo = { ...o, [cle]: v };
        expect(code(() => peutEnvoyer([], 0, oo))).toBe('option_invalide');
        expect(code(() => planifier(['a'], 0, oo))).toBe('option_invalide');
        expect(code(() => respecteLeQuota([], oo))).toBe('option_invalide');
      }
    }
    expect(code(() => planifier(['a'], Number.NaN, o))).toBe('option_invalide');
    expect(code(() => planifier(['a'], 1.5, o))).toBe('option_invalide');
  });

  it('instants-invalides-refuses', () => {
    expect(code(() => peutEnvoyer([200], 100, o))).toBe('ordre_inverse');
    expect(code(() => peutEnvoyer([100], 100, o))).toBeUndefined();
    expect(code(() => peutEnvoyer([Number.NaN], 100, o))).toBe('instant_invalide');
    expect(code(() => peutEnvoyer([], Number.POSITIVE_INFINITY, o))).toBe('instant_invalide');
    expect(code(() => respecteLeQuota([1.5], o))).toBe('instant_invalide');
  });

  it('respecte-le-quota-non-trie-et-entree-intacte', () => {
    const p = { ...o, quotaParFenetre: 2, fenetreMs: 100 };
    const desordre = [90, 0, 50];
    expect(respecteLeQuota(desordre, p)).toBe(false);
    expect(desordre).toEqual([90, 0, 50]);
    expect(respecteLeQuota([0, 50, 100], p)).toBe(true);
    expect(respecteLeQuota([0, 0, 0], p)).toBe(false);
  });
});
