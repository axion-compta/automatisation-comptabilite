import { describe, expect, it } from 'vitest';
import { ErreurPile, construirePile, reporter, type CartePile } from '../pile-a-verifier.js';

const T = Date.UTC(2026, 10, 12, 10, 0, 0); // 12/11/2026 10:00 UTC
const UTC = 'UTC';
const carte = (id: string, o: Partial<CartePile> = {}): CartePile => ({
  id, fait: 'fait-' + id, groupe: 1, echeance: '2026-12-01', tvaEnJeu: 1000, datePiece: '2026-10-01', propositions: [], ...o,
});
const ids = (p: readonly { id: string }[]): string[] => p.map((c) => c.id);
const pile = (c: CartePile[], t = T) => construirePile(c, t, UTC);
const prop = (id: string, confiance: number) => ({ id, confiance });
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { if (e instanceof ErreurPile) return e.code; throw e; }
  return undefined;
};

describe('pile « À vérifier »', () => {
  it('tri-groupe-echeance-tva-date', () => {
    const p = pile([
      carte('e', { datePiece: '2026-10-05' }), carte('d', { datePiece: '2026-10-02' }), carte('c', { tvaEnJeu: 5000 }),
      carte('b', { echeance: '2026-11-20' }), carte('a', { groupe: 0 }), carte('z', { echeance: undefined }),
    ]);
    expect(ids(p)).toEqual(['a', 'b', 'c', 'd', 'e', 'z']);
    expect(p.map((c) => c.rang)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids(pile([carte('m'), carte('k'), carte('l')]))).toEqual(['k', 'l', 'm']); // égalité : identifiant
  });

  it('raison-du-rang-fournie', () => {
    const p = pile([
      carte('a', { groupe: 0 }), carte('b', { echeance: '2026-11-20' }), carte('c', { tvaEnJeu: 5000 }),
      carte('d', { datePiece: '2026-09-01' }), carte('e'), carte('f'),
    ]);
    expect(p.map((c) => c.raison)).toEqual(['groupe', 'echeance', 'tva', 'date_piece', 'identifiant', 'identifiant']);
  });

  it('cartes-du-meme-fait-groupees', () => {
    const p = pile([
      carte('b', { fait: 'F', tvaEnJeu: 300, echeance: '2026-12-10' }), carte('a', { fait: 'F', tvaEnJeu: 200, echeance: '2026-11-30' }),
      carte('c', { fait: 'G' }),
    ]);
    expect(p).toHaveLength(2);
    const g = p.find((c) => c.fait === 'F')!;
    expect([g.nombre, g.ids, g.tvaEnJeu, g.echeance]).toEqual([2, ['a', 'b'], 500, '2026-11-30']);
    expect(p.find((c) => c.fait === 'G')!.nombre).toBe(1);
    expect(pile([carte('x', { fait: 'H', groupe: 3 }), carte('y', { fait: 'H', groupe: 2 })])[0]!.groupe).toBe(2);
  });

  it('reponse-preselectionnee-la-plus-sure', () => {
    const p = pile([carte('a', { propositions: [prop('p1', 0.4), prop('p2', 0.9), prop('p3', 0.6)] })]);
    expect(p[0]!.preselection).toBe('p2');
  });

  it('egalite-aucune-preselection', () => {
    expect(pile([carte('a', { propositions: [prop('p1', 0.9), prop('p2', 0.9), prop('p3', 0.1)] })])[0]!.preselection).toBeUndefined();
    expect(pile([carte('b')])[0]!.preselection).toBeUndefined();
    // La même proposition vue deux fois dans un groupe n'est pas une égalité.
    const g = pile([carte('c', { fait: 'F', propositions: [prop('p1', 0.8)] }), carte('d', { fait: 'F', propositions: [prop('p1', 0.8), prop('p2', 0.3)] })]);
    expect(g[0]!.preselection).toBe('p1');
  });

  it('plus-tard-masque-jusqu-au-lendemain', () => {
    const a = reporter(carte('a'), T, UTC);
    expect(a.masqueJusqu).toBe(Date.UTC(2026, 10, 13));
    expect(ids(pile([a, carte('b')]))).toEqual(['b']);
    expect(pile([a], Date.UTC(2026, 10, 12, 23, 59, 59))).toEqual([]);
    // Fuseau de la société : à 23:30 UTC le 12, il est déjà le 13 à Paris (UTC+1 en novembre).
    expect(reporter(carte('p'), Date.UTC(2026, 10, 12, 23, 30), 'Europe/Paris').masqueJusqu).toBe(Date.UTC(2026, 10, 13, 23));
  });

  it('plus-tard-revient-le-lendemain', () => {
    const a = reporter(carte('a'), T, UTC);
    const minuit = Date.UTC(2026, 10, 13);
    expect(pile([a], minuit - 1)).toEqual([]);
    expect(ids(pile([a], minuit))).toEqual(['a']);
    expect(ids(pile([a], minuit + 1))).toEqual(['a']);
  });

  it('pile-vide', () => {
    expect(pile([])).toEqual([]);
  });

  it('entrees-invalides-refusees', () => {
    expect(code(() => pile([], Number.NaN))).toBe('instant_invalide');
    expect(code(() => reporter(carte('a'), Number.POSITIVE_INFINITY, UTC))).toBe('instant_invalide');
    expect(code(() => reporter(carte('a'), T, 'Nulle/Part'))).toBe('fuseau_invalide');
    expect(code(() => pile([carte('a', { tvaEnJeu: -1 })]))).toBe('carte_invalide');
    expect(code(() => pile([carte('a', { tvaEnJeu: Number.NaN })]))).toBe('carte_invalide');
    expect(code(() => pile([carte('a', { tvaEnJeu: 0 })]))).toBeUndefined();
    expect(code(() => pile([carte('a', { propositions: [prop('p', Number.NaN)] })]))).toBe('carte_invalide');
  });
});
