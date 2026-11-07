import { describe, expect, it } from 'vitest';
import {
  type Alias,
  type ReglageAlias,
  aliasApplicable,
  bloqueParJamais,
  enregistrerDecision,
  reactiver,
} from '../alias.js';

const reglage: ReglageAlias = { acceptationsMin: 5, tauxMinPb: 9500, rejetsConsecutifsMax: 2 };
const base: Alias = {
  id: 'a1',
  contrepartieId: 'c1',
  motif: 'ATELIER DU PAIN',
  type: 'exact',
  source: 'ia',
  acceptes: 0,
  rejets: 0,
  rejetsConsecutifs: 0,
  etat: 'propose',
};
const suite = (a: Alias, ds: ('accepte' | 'rejete')[], r = reglage) =>
  ds.reduce((x, d) => enregistrerDecision(x, d, r), a);
const A = 'accepte' as const;
const R = 'rejete' as const;

describe('vie d’un alias appris', () => {
  it('t04-4-quatre-puis-cinq', () => {
    const quatre = suite(base, [A, A, A, A]);
    expect(quatre.etat).toBe('propose');
    expect(quatre.acceptes).toBe(4);
    const cinq = enregistrerDecision(quatre, A, reglage);
    expect(cinq.etat).toBe('actif');
    const un = enregistrerDecision(cinq, R, reglage);
    expect(un.etat).toBe('actif');
    const deux = enregistrerDecision(un, R, reglage);
    expect(deux.etat).toBe('desactive');
    expect(deux.rejets).toBe(2);
  });

  it('taux-insuffisant-reste-propose', () => {
    const a = suite(base, [R, A, A, A, A, A]);
    expect(a).toMatchObject({ acceptes: 5, rejets: 1, etat: 'propose' });
    const b = suite(a, [A, A, A, A, A, A, A, A, A, A, A, A, A, A]);
    expect(b.etat).toBe('actif');
    const exact = suite(base, [R, ...Array<'accepte'>(19).fill(A)]);
    expect(exact.etat).toBe('actif');
    expect(suite(base, [R, ...Array<'accepte'>(18).fill(A)]).etat).toBe('propose');
  });

  it('deux-rejets-consecutifs-desactive', () => {
    expect(suite(base, [R]).etat).toBe('propose');
    const a = suite(base, [R, R]);
    expect(a).toMatchObject({ etat: 'desactive', rejetsConsecutifs: 2 });
    expect(suite(base, [R, R], { ...reglage, rejetsConsecutifsMax: 3 }).etat).toBe('propose');
    const d = enregistrerDecision(a, A, reglage);
    expect(d.etat).toBe('desactive');
    expect(reactiver(d).etat).toBe('propose');
    expect(reactiver(d).rejetsConsecutifs).toBe(0);
  });

  it('acceptation-remet-a-zero', () => {
    const a = suite(base, [R, A]);
    expect(a.rejetsConsecutifs).toBe(0);
    expect(suite(a, [R]).etat).toBe('propose');
    expect(suite(base, [A, A, A, A, A, R, A, R]).etat).toBe('actif');
  });

  it('jamais-ca-bloque', () => {
    const actif = suite(base, [A, A, A, A, A]);
    const jamais = [{ motif: 'ATELIER DU PAIN', contrepartieId: 'c1' }];
    expect(aliasApplicable(actif, 'ATELIER DU PAIN', [])).toBe(true);
    expect(bloqueParJamais(actif, jamais)).toBe(true);
    expect(aliasApplicable(actif, 'ATELIER DU PAIN', jamais)).toBe(false);
    expect(bloqueParJamais(actif, [{ motif: 'ATELIER DU PAIN', contrepartieId: 'c2' }])).toBe(false);
    expect(bloqueParJamais(actif, [{ motif: 'AUTRE', contrepartieId: 'c1' }])).toBe(false);
    expect(aliasApplicable(base, 'ATELIER DU PAIN', [])).toBe(false);
    expect(aliasApplicable(suite(base, [R, R]), 'ATELIER DU PAIN', [])).toBe(false);
  });

  it('prefixe-applicable', () => {
    const p = suite({ ...base, type: 'prefixe', motif: 'ATELIER' }, [A, A, A, A, A]);
    expect(aliasApplicable(p, 'ATELIER DU PAIN 12', [])).toBe(true);
    expect(aliasApplicable(p, 'ATELIER', [])).toBe(true);
    expect(aliasApplicable(p, 'LE ATELIER', [])).toBe(false);
    expect(aliasApplicable(p, 'ATELIER DU PAIN', [{ motif: 'ATELIER DU PAIN', contrepartieId: 'c1' }])).toBe(false);
    expect(aliasApplicable(suite(base, [A, A, A, A, A]), 'ATELIER DU PAIN 12', [])).toBe(false);
  });

  it('entree-non-modifiee', () => {
    const copie = structuredClone(base);
    const r = enregistrerDecision(base, A, reglage);
    expect(base).toEqual(copie);
    expect(r).not.toBe(base);
    const d = suite(base, [R, R]);
    const figee = structuredClone(d);
    expect(reactiver(d)).not.toBe(d);
    expect(d).toEqual(figee);
  });

  it('refuse les réglages invalides et les motifs vides', () => {
    const mauvais: Partial<ReglageAlias>[] = [
      { acceptationsMin: Number.NaN },
      { acceptationsMin: -1 },
      { acceptationsMin: 1.5 },
      { acceptationsMin: Number.POSITIVE_INFINITY },
      { tauxMinPb: Number.NaN },
      { tauxMinPb: -1 },
      { tauxMinPb: 10001 },
      { tauxMinPb: 95.5 },
      { rejetsConsecutifsMax: Number.NaN },
      { rejetsConsecutifsMax: -2 },
      { rejetsConsecutifsMax: 0.5 },
      { rejetsConsecutifsMax: Number.POSITIVE_INFINITY },
    ];
    for (const m of mauvais) {
      expect(() => enregistrerDecision(base, A, { ...reglage, ...m })).toThrow('reglage_invalide');
    }
    expect(enregistrerDecision(base, A, { ...reglage, tauxMinPb: 10000 }).acceptes).toBe(1);
    expect(() => enregistrerDecision({ ...base, motif: '' }, A, reglage)).toThrow('motif_vide');
    expect(() => enregistrerDecision({ ...base, motif: '  ' }, A, reglage)).toThrow('motif_vide');
    expect(aliasApplicable({ ...base, etat: 'actif' }, '', [])).toBe(false);
  });
});
