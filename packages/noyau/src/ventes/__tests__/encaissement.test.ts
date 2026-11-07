import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { partEncaissee } from '../encaissement.js';

const c = (n: number): Centimes => n as Centimes;
type Entree = Parameters<typeof partEncaissee>[0];
type Taux = Entree['parTaux'][number];
const tx = (tauxPdb: number, tva: number, base: number, tvaDeja = 0, baseDeja = 0): Taux => ({
  tauxPdb,
  tvaInitiale: c(tva),
  baseInitiale: c(base),
  tvaDejaExigible: c(tvaDeja),
  baseDejaExigible: c(baseDeja),
});
const run = (ttc: number, deja: number, paiement: number, parTaux: Taux[]) =>
  partEncaissee({ ttcFacture: c(ttc), dejaEncaisse: c(deja), paiement: c(paiement), parTaux });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const un = [tx(2000, 20000, 100000)];

describe('part encaissée (TVA et base exigibles à l\'encaissement)', () => {
  it('v03-paiement-total', () => {
    const r = run(220000, 0, 220000, un);
    expect(r.parTaux).toEqual([{ tauxPdb: 2000, tva: 20000, base: 100000 }]);
    expect(r.dernier).toBe(true);
    expect(r.tropPercu).toBe(0);
  });

  it('v04-deux-moities', () => {
    const p1 = run(220000, 0, 110000, un);
    expect(p1.parTaux).toEqual([{ tauxPdb: 2000, tva: 10000, base: 50000 }]);
    expect(p1.dernier).toBe(false);
    const p2 = run(220000, 110000, 110000, [tx(2000, 20000, 100000, 10000, 50000)]);
    expect(p2.parTaux).toEqual([{ tauxPdb: 2000, tva: 10000, base: 50000 }]);
    expect(p2.dernier).toBe(true);
  });

  it('v05-trois-paiements-le-dernier-solde', () => {
    const base = 1000000;
    let tvaDeja = 0;
    let baseDeja = 0;
    let encaisse = 0;
    const tvas: number[] = [];
    for (const p of [73333, 73333, 73334]) {
      const r = run(220000, encaisse, p, [tx(1000, 20000, base, tvaDeja, baseDeja)]);
      tvas.push(r.parTaux[0]?.tva ?? -1);
      tvaDeja += r.parTaux[0]?.tva ?? 0;
      baseDeja += r.parTaux[0]?.base ?? 0;
      encaisse += p;
    }
    expect(tvas).toEqual([6667, 6667, 6666]);
    expect(tvaDeja).toBe(20000);
    expect(baseDeja).toBe(base);
  });

  it('v07-deux-taux', () => {
    const r = run(170000, 0, 85000, [tx(600, 5000, 50000 * 2), tx(900, 5000, 50000)]);
    expect(r.parTaux).toEqual([
      { tauxPdb: 600, tva: 2500, base: 50000 },
      { tauxPdb: 900, tva: 2500, base: 25000 },
    ]);
    expect(r.dernier).toBe(false);
  });

  it('trop-percu-isole', () => {
    const r = run(220000, 0, 225000, un);
    expect(r.parTaux).toEqual([{ tauxPdb: 2000, tva: 20000, base: 100000 }]);
    expect(r.dernier).toBe(true);
    expect(r.tropPercu).toBe(5000);
    const p = run(220000, 200000, 20000, [tx(2000, 20000, 100000, 18182, 90909)]);
    expect(p.tropPercu).toBe(0);
    expect(p.parTaux[0]).toEqual({ tauxPdb: 2000, tva: 1818, base: 9091 });
  });

  it('paiement-invalide-refuse', () => {
    for (const p of [0, -1, 1.5, NaN, Infinity]) {
      expect(code(() => run(220000, 0, p, un))).toBe('paiement_invalide');
    }
  });

  it('ttc-nul-refuse', () => {
    for (const t of [0, -5, 1.5, NaN, Infinity]) {
      expect(code(() => run(t, 0, 100, un))).toBe('ttc_invalide');
    }
  });

  it('deja-solde-refuse', () => {
    expect(code(() => run(220000, 220000, 100, un))).toBe('deja_solde');
    expect(code(() => run(220000, 230000, 100, un))).toBe('deja_solde');
    expect(code(() => run(220000, 219999, 1, un))).toBeUndefined();
    for (const d of [-1, 1.5, NaN, Infinity]) {
      expect(code(() => run(220000, d, 100, un))).toBe('deja_encaisse_invalide');
    }
    expect(code(() => run(220000, 0, 100, [tx(2000, 20000, 100000, 20001, 0)]))).toBe('deja_exigible_incoherent');
    expect(code(() => run(220000, 0, 100, [tx(2000, 20000, 100000, 0, 100001)]))).toBe('deja_exigible_incoherent');
    expect(code(() => run(220000, 0, 100, [tx(2000, 20000, 100000, 20000, 100000)]))).toBeUndefined();
    expect(code(() => run(220000, 0, 100, [tx(2000, 20000, 100000, -1, 0)]))).toBe('deja_exigible_incoherent');
  });

  it('ordre-des-taux-sans-effet', () => {
    const a = [tx(600, 3333, 40001), tx(900, 5555, 50003), tx(1900, 7777, 60007)];
    const droit = run(250000, 0, 77777, a).parTaux;
    const envers = run(250000, 0, 77777, [...a].reverse()).parTaux;
    const tri = (l: typeof droit) => [...l].sort((x, y) => x.tauxPdb - y.tauxPdb);
    expect(tri(envers)).toEqual(tri(droit));
    expect(run(250000, 0, 77777, []).parTaux).toEqual([]);
  });

  it('somme-exacte-boucle', () => {
    let graine = 12345;
    const suivant = (max: number): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return (graine % max) + 1;
    };
    for (let i = 0; i < 1000; i++) {
      const ttc = 100 + suivant(900000);
      const tva1 = suivant(ttc);
      const tva2 = suivant(ttc);
      const base1 = suivant(ttc);
      const base2 = suivant(ttc);
      const n = 1 + (i % 6);
      const coupes = new Set<number>();
      while (coupes.size < n - 1 && coupes.size < ttc - 1) coupes.add(suivant(ttc - 1));
      const bornes = [0, ...[...coupes].sort((x, y) => x - y), ttc];
      const etat = [
        { tauxPdb: 600, tva: tva1, base: base1, dT: 0, dB: 0 },
        { tauxPdb: 900, tva: tva2, base: base2, dT: 0, dB: 0 },
      ];
      for (let k = 1; k < bornes.length; k++) {
        const deja = bornes[k - 1] ?? 0;
        const p = (bornes[k] ?? 0) - deja;
        const r = run(ttc, deja, p, etat.map((e) => tx(e.tauxPdb, e.tva, e.base, e.dT, e.dB)));
        expect(r.dernier).toBe(k === bornes.length - 1);
        r.parTaux.forEach((part, j) => {
          const e = etat[j];
          if (e === undefined) return;
          e.dT += part.tva;
          e.dB += part.base;
        });
      }
      for (const e of etat) {
        expect(e.dT).toBe(e.tva);
        expect(e.dB).toBe(e.base);
      }
    }
  });
});
