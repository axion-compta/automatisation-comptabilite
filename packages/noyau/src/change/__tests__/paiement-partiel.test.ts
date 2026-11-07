import { describe, expect, it } from 'vitest';
import { ErreurChange } from '../taux.js';
import { paiementPartiel } from '../paiement-partiel.js';

const PIECE = { montantDevise: 100000, tauxE8: 92000000, montantEuros: 92000 };
const RIEN = { devise: 0, euros: 0 };
const APRES_40K = { devise: 40000, euros: 36800 };
const paiement = (montantDevise: number, eurosPayes: number, frais = 0) => ({ montantDevise, eurosPayes, frais });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChange ? e.code : 'autre';
  }
  return undefined;
};

describe('paiementPartiel', () => {
  it('premier-paiement-gain', () => {
    const r = paiementPartiel(PIECE, RIEN, paiement(40000, 36000), 'demi-superieur');
    expect(r).toMatchObject({ partEuros: 36800, ecart: -800, sens: 'gain', dernier: false, surplusDevise: 0, eurosSurplus: 0 });
    expect(r).toMatchObject({ deviseImputee: 40000, eurosImputes: 36000 });
  });

  it('dernier-paiement-solde-le-reliquat-perte', () => {
    const r = paiementPartiel(PIECE, APRES_40K, paiement(60000, 57000), 'demi-superieur');
    expect(r).toMatchObject({ partEuros: 55200, ecart: 1800, sens: 'perte', dernier: true });
  });

  it('somme-des-parts-egale-la-piece', () => {
    const p1 = paiementPartiel(PIECE, RIEN, paiement(40000, 36000), 'demi-superieur');
    const p2 = paiementPartiel(PIECE, { devise: 40000, euros: p1.partEuros }, paiement(60000, 57000), 'demi-superieur');
    expect(p1.partEuros + p2.partEuros).toBe(PIECE.montantEuros);
  });

  it('arrondi-du-dernier-solde-trace', () => {
    const piece = { montantDevise: 10000, tauxE8: 92000000, montantEuros: 9200 };
    const payes = [3066, 3066, 3067];
    const devises = [3333, 3333, 3334];
    let deja = { devise: 0, euros: 0 };
    const parts: number[] = [];
    const ecarts: number[] = [];
    devises.forEach((d, i) => {
      const r = paiementPartiel(piece, deja, paiement(d, payes[i] ?? 0), 'demi-superieur');
      parts.push(r.partEuros);
      ecarts.push(r.ecart);
      deja = { devise: deja.devise + d, euros: deja.euros + r.partEuros };
    });
    expect(parts).toEqual([3066, 3066, 3068]);
    expect(ecarts).toEqual([0, 0, -1]);
    expect(deja.euros).toBe(piece.montantEuros);
  });

  it('surplus-hors-ecart', () => {
    const r = paiementPartiel(PIECE, APRES_40K, paiement(70000, 66500), 'demi-superieur');
    expect(r).toMatchObject({ eurosImputes: 57000, ecart: 1800, surplusDevise: 10000, eurosSurplus: 9500, dernier: true });
    expect(r.deviseImputee).toBe(60000);
  });

  it('frais-deduits-de-l-ecart', () => {
    const r = paiementPartiel(PIECE, RIEN, paiement(40000, 36000, 500), 'demi-superieur');
    expect(r.ecart).toBe(-1300);
    expect(r.sens).toBe('gain');
  });

  it('ecart-nul-sens-aucun', () => {
    expect(paiementPartiel(PIECE, RIEN, paiement(40000, 36800), 'demi-superieur').sens).toBe('aucun');
  });

  it('taux-nul-ou-negatif-refuse', () => {
    for (const t of [0, -1]) {
      expect(code(() => paiementPartiel({ ...PIECE, tauxE8: t }, RIEN, paiement(1, 1), 'demi-superieur'))).toBe('taux_invalide');
    }
  });

  it('piece-deja-soldee-refusee', () => {
    const soldee = { devise: 100000, euros: 92000 };
    expect(code(() => paiementPartiel(PIECE, soldee, paiement(1, 1), 'demi-superieur'))).toBe('parametre_invalide');
  });

  it('paiement-nul-ou-frais-negatifs-refuses', () => {
    expect(code(() => paiementPartiel(PIECE, RIEN, paiement(0, 0), 'demi-superieur'))).toBe('parametre_invalide');
    expect(code(() => paiementPartiel(PIECE, RIEN, paiement(1, 1, -1), 'demi-superieur'))).toBe('parametre_invalide');
  });

  it('entrees-non-entieres', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(code(() => paiementPartiel(PIECE, RIEN, paiement(v, 1), 'demi-superieur'))).toBe('parametre_invalide');
      expect(code(() => paiementPartiel(PIECE, RIEN, paiement(1, v), 'demi-superieur'))).toBe('parametre_invalide');
      expect(code(() => paiementPartiel(PIECE, RIEN, paiement(1, 1, v), 'demi-superieur'))).toBe('parametre_invalide');
      expect(code(() => paiementPartiel({ ...PIECE, montantDevise: v }, RIEN, paiement(1, 1), 'demi-superieur'))).toBe('parametre_invalide');
      expect(code(() => paiementPartiel(PIECE, { devise: v, euros: 0 }, paiement(1, 1), 'demi-superieur'))).toBe('parametre_invalide');
      expect(code(() => paiementPartiel({ ...PIECE, tauxE8: v }, RIEN, paiement(1, 1), 'demi-superieur'))).toBe('taux_invalide');
    }
  });
});
