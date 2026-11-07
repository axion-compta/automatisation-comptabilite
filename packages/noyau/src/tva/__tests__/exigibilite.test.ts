import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurExigibilite, tvaExigible } from '../exigibilite.js';

const c = centimes;

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurExigibilite) return e.code;
    throw e;
  }
  return undefined;
}

function pay(id: string, date: string, montant: number) {
  return { id, date, montant: c(montant) };
}

function totalParTaux(res: ReturnType<typeof tvaExigible>, cle: string): number {
  return res.reduce((s, r) => s + (r.parTaux.find((t) => t.cle === cle)?.tva ?? 0), 0);
}

describe('tvaExigible', () => {
  it('deux-paiements-egaux', () => {
    const res = tvaExigible({
      ttc: c(720000),
      tvaParTaux: [{ cle: 'T1', tva: c(120000) }],
      paiements: [pay('p1', '2026-01-10', 360000), pay('p2', '2026-02-10', 360000)],
    });
    expect(res.map((r) => r.paiementId)).toEqual(['p1', 'p2']);
    expect(res.map((r) => r.date)).toEqual(['2026-01-10', '2026-02-10']);
    expect(res.map((r) => r.parTaux)).toEqual([[{ cle: 'T1', tva: 60000 }], [{ cle: 'T1', tva: 60000 }]]);
  });

  it('dernier-paiement-solde', () => {
    // 1/3 puis 1/3 puis le reste : la somme retombe exactement sur la TVA.
    const res = tvaExigible({
      ttc: c(1000),
      tvaParTaux: [{ cle: 'T1', tva: c(100) }],
      paiements: [pay('a', '2026-01-01', 333), pay('b', '2026-01-02', 333), pay('c', '2026-01-03', 334)],
    });
    expect(totalParTaux(res, 'T1')).toBe(100);
    expect(res.map((r) => r.parTaux[0]?.tva)).toEqual([33, 34, 33]);
  });

  it('ajout-d-un-paiement-ne-change-pas-le-passe', () => {
    const base = {
      ttc: c(1000),
      tvaParTaux: [{ cle: 'T1', tva: c(167) }],
    };
    const avant = tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 333)] });
    const apres = tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 333), pay('b', '2026-02-01', 400)] });
    expect(apres[0]).toEqual(avant[0]);
    const fin = tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 333), pay('b', '2026-02-01', 400), pay('c', '2026-03-01', 267)] });
    expect(fin[0]).toEqual(avant[0]);
    expect(fin[1]).toEqual(apres[1]);
    expect(totalParTaux(fin, 'T1')).toBe(167);
  });

  it('plusieurs-taux', () => {
    const res = tvaExigible({
      ttc: c(1000),
      tvaParTaux: [
        { cle: 'T1', tva: c(100) },
        { cle: 'T2', tva: c(55) },
      ],
      paiements: [pay('a', '2026-01-01', 500), pay('b', '2026-01-02', 500)],
    });
    expect(res[0]?.parTaux.map((t) => t.cle)).toEqual(['T1', 'T2']);
    expect(totalParTaux(res, 'T1')).toBe(100);
    expect(totalParTaux(res, 'T2')).toBe(55);
    expect(res[0]?.parTaux.map((t) => t.tva)).toEqual([50, 28]);
    expect(res[1]?.parTaux.map((t) => t.tva)).toEqual([50, 27]);
  });

  it('ordre-des-paiements-indifferent', () => {
    const base = { ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: c(167) }] };
    const p = [pay('a', '2026-01-01', 333), pay('b', '2026-02-01', 400), pay('c', '2026-03-01', 267)];
    const droit = tvaExigible({ ...base, paiements: p });
    const inverse = tvaExigible({ ...base, paiements: [...p].reverse() });
    expect(inverse).toEqual(droit);
  });

  it('trop-encaisse-refuse', () => {
    const base = { ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: c(100) }] };
    expect(code(() => tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 1001)] }))).toBe('trop_encaisse');
    expect(code(() => tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 600), pay('b', '2026-01-02', 401)] }))).toBe('trop_encaisse');
    expect(tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 600), pay('b', '2026-01-02', 400)] })).toHaveLength(2);
  });

  it('somme-exacte-mille-cas', () => {
    let graine = 123456789;
    const alea = (max: number): number => {
      graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0;
      return graine % max;
    };
    for (let i = 0; i < 1000; i++) {
      const ttc = 1 + alea(500000);
      const t1 = alea(Math.floor(ttc / 2) + 1);
      const t2 = alea(Math.floor(ttc / 2) + 1);
      const n = 1 + alea(5);
      const coupures = Array.from({ length: n - 1 }, () => 1 + alea(Math.max(1, ttc - 1))).sort((x, y) => x - y);
      const bornes = [0, ...coupures, ttc];
      const paiements = [];
      for (let k = 1; k < bornes.length; k++) {
        const montant = (bornes[k] as number) - (bornes[k - 1] as number);
        if (montant > 0) paiements.push(pay(`p${k}`, `2026-01-${String(k).padStart(2, '0')}`, montant));
      }
      const res = tvaExigible({
        ttc: c(ttc),
        tvaParTaux: [
          { cle: 'T1', tva: c(t1) },
          { cle: 'T2', tva: c(t2) },
        ],
        paiements,
      });
      expect(totalParTaux(res, 'T1')).toBe(t1);
      expect(totalParTaux(res, 'T2')).toBe(t2);
      expect(res.every((r) => r.parTaux.every((t) => Number.isInteger(t.tva) && t.tva >= 0))).toBe(true);
    }
  });

  it('gère les cas limites', () => {
    const base = { ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: c(100) }] };
    expect(tvaExigible({ ...base, paiements: [] })).toEqual([]);
    expect(tvaExigible({ ...base, paiements: [pay('a', '2026-01-01', 1000)] })[0]?.parTaux).toEqual([{ cle: 'T1', tva: 100 }]);
    expect(tvaExigible({ ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: c(0) }], paiements: [pay('a', '2026-01-01', 400)] })[0]?.parTaux).toEqual([
      { cle: 'T1', tva: 0 },
    ]);
    // Même date : tri par identifiant.
    const res = tvaExigible({ ...base, paiements: [pay('b', '2026-01-01', 500), pay('a', '2026-01-01', 500)] });
    expect(res.map((r) => r.paiementId)).toEqual(['a', 'b']);
  });

  it('refuse les montants invalides', () => {
    const base = { ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: c(100) }] };
    for (const m of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => tvaExigible({ ...base, paiements: [{ id: 'a', date: '2026-01-01', montant: m as never }] }))).toBe('montant_invalide');
    }
    expect(code(() => tvaExigible({ ttc: Number.NaN as never, tvaParTaux: [], paiements: [] }))).toBe('montant_invalide');
    expect(code(() => tvaExigible({ ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: -1 as never }], paiements: [] }))).toBe('montant_invalide');
    expect(code(() => tvaExigible({ ttc: c(1000), tvaParTaux: [{ cle: 'T1', tva: 0.5 as never }], paiements: [] }))).toBe('montant_invalide');
  });

  it('refuse une TVA supérieure au TTC', () => {
    expect(
      code(() =>
        tvaExigible({
          ttc: c(1000),
          tvaParTaux: [
            { cle: 'T1', tva: c(600) },
            { cle: 'T2', tva: c(401) },
          ],
          paiements: [],
        }),
      ),
    ).toBe('tva_superieure_au_ttc');
  });
});
