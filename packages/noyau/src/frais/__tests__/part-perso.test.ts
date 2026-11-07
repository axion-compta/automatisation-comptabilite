import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { partRemboursable, repartirPiece } from '../part-perso.js';
import { ErreurFrais } from '../types.js';

const c = centimes;
const rep = (ttc: number, tva: number, perso: number) =>
  repartirPiece({ ttc: c(ttc), tva: c(tva), partPersoTtc: c(perso) });

describe('repartirPiece', () => {
  it('nf15-moitie-personnelle', () => {
    const r = rep(11000, 1000, 5500);
    expect(r.societe).toEqual({ ttc: 5500, ht: 5000, tva: 500 });
    expect(r.perso).toEqual({ ttc: 5500 });
    expect(partRemboursable(r, 'personne')).toBe(5500);
  });

  it('part-perso-nulle', () => {
    const r = rep(12000, 2000, 0);
    expect(r.societe).toEqual({ ttc: 12000, ht: 10000, tva: 2000 });
    expect(r.perso.ttc).toBe(0);
  });

  it('tout-personnel', () => {
    const r = rep(8400, 1400, 8400);
    expect(r.societe).toEqual({ ttc: 0, ht: 0, tva: 0 });
    expect(r.perso.ttc).toBe(8400);
    expect(partRemboursable(r, 'personne')).toBe(0);
  });

  it('tva-impaire-somme-exacte', () => {
    const r = rep(1000, 1, 500);
    expect(r.societe.tva).toBe(1);
    expect(r.societe.ht + r.societe.tva + r.perso.ttc).toBe(1000);
    expect(r.societe.ttc + r.perso.ttc).toBe(1000);
  });

  it('somme-exacte-boucle', () => {
    let graine = 12345;
    const suivant = (borne: number): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % (borne + 1);
    };
    for (let i = 0; i < 1000; i += 1) {
      const ttc = suivant(1000000);
      const tva = suivant(ttc);
      const perso = suivant(ttc);
      const r = rep(ttc, tva, perso);
      expect(r.societe.ttc + r.perso.ttc).toBe(ttc);
      expect(r.societe.ht + r.societe.tva + r.perso.ttc).toBe(ttc);
      expect(r.societe.tva).toBeGreaterThanOrEqual(0);
      expect(r.societe.tva).toBeLessThanOrEqual(tva);
    }
  });

  it('part-superieure-refusee', () => {
    for (const [ttc, tva, perso] of [
      [1000, 100, 1001],
      [1000, 1001, 0],
      [0, 0, 1],
    ] as const) {
      expect(() => rep(ttc, tva, perso)).toThrow(ErreurFrais);
    }
  });

  it('entrees-invalides', () => {
    const mauvaises = [Number.NaN, Number.POSITIVE_INFINITY, Number('1.5'), -1];
    for (const m of mauvaises) {
      for (const [ttc, tva, perso] of [
        [m, 0, 0],
        [1000, m, 0],
        [1000, 0, m],
      ]) {
        const essai = () =>
          repartirPiece({ ttc: ttc as never, tva: tva as never, partPersoTtc: perso as never });
        expect(essai).toThrow(ErreurFrais);
        try {
          essai();
        } catch (e) {
          expect((e as ErreurFrais).code).toBe('entree_invalide');
        }
      }
    }
  });

  it('paye-societe-rien-a-rembourser', () => {
    const r = rep(11000, 1000, 5500);
    expect(partRemboursable(r, 'societe')).toBe(0);
    expect(partRemboursable(r, 'a_confirmer')).toBe(0);
  });
});
