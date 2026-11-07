import { describe, expect, it } from 'vitest';
import { analyserDesignation, resoudre } from '../designations.js';

const L = ['a', 'b', 'c', 'd'];
const ctx = (o: Partial<Parameters<typeof resoudre>[1]> = {}) => ({ selection: [], pieceOuverte: null, listeAffichee: L, ...o });
const ciblesDe = (ids: string[]) => ({ sorte: 'cibles', ids });

describe('désignations du chat', () => {
  it('celle-ci-prend-la-selection', () => {
    const d = analyserDesignation('Valide  CELLE-ci')!;
    expect(d).toEqual({ sorte: 'celle_ci' });
    expect(resoudre(d, ctx({ selection: ['s1'], pieceOuverte: 'p1' }))).toEqual(ciblesDe(['s1']));
    expect(analyserDesignation('celui ci')).toEqual({ sorte: 'celle_ci' });
    expect(resoudre(d, ctx({ selection: ['s1', 's2', 's3'] }))).toEqual({ sorte: 'question', choix: ['s1', 's2', 's3'] });
    expect(resoudre({ sorte: 'ces' }, ctx({ selection: ['s1', 's2'] }))).toEqual(ciblesDe(['s1', 's2']));
  });

  it('celle-ci-prend-la-piece-ouverte', () => {
    const d = { sorte: 'celle_ci' } as const;
    expect(resoudre(d, ctx({ pieceOuverte: 'p1' }))).toEqual(ciblesDe(['p1']));
    expect(resoudre(d, ctx({ pieceOuverte: '' }))).toEqual({ sorte: 'question', choix: L });
    expect(resoudre(d, ctx({ listeAffichee: ['z'] }))).toEqual(ciblesDe(['z']));
    expect(resoudre({ sorte: 'ces' }, ctx({ pieceOuverte: 'p1' }))).toEqual(ciblesDe(L));
  });

  it('trois-dernieres-en-lettres', () => {
    expect(analyserDesignation('  Archive les   TROIS dernières ')).toEqual({ sorte: 'n_dernieres', n: 3 });
    expect(analyserDesignation('les deux premières')).toEqual({ sorte: 'n_premieres', n: 2 });
    expect(analyserDesignation('les dix derniers')).toEqual({ sorte: 'n_dernieres', n: 10 });
    expect(resoudre({ sorte: 'n_dernieres', n: 3 }, ctx())).toEqual(ciblesDe(['b', 'c', 'd']));
    expect(resoudre({ sorte: 'n_premieres', n: 2 }, ctx())).toEqual(ciblesDe(['a', 'b']));
  });

  it('trois-dernieres-en-chiffres', () => {
    expect(analyserDesignation('les 3 dernières')).toEqual({ sorte: 'n_dernieres', n: 3 });
    expect(analyserDesignation('les 12 premiers')).toEqual({ sorte: 'n_premieres', n: 12 });
    expect(resoudre({ sorte: 'n_dernieres', n: 4 }, ctx({ selection: ['s1'] }))).toEqual(ciblesDe(L));
  });

  it('n-plus-grand-que-la-liste-question', () => {
    const grande = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(resoudre({ sorte: 'n_dernieres', n: 5 }, ctx())).toEqual({ sorte: 'question', choix: L });
    expect(resoudre({ sorte: 'n_dernieres', n: 9 }, ctx({ listeAffichee: grande }))).toEqual({ sorte: 'question', choix: grande.slice(0, 5) });
    expect(resoudre({ sorte: 'n_dernieres', n: 3 }, ctx({ listeAffichee: ['a'] }))).toEqual({ sorte: 'question', choix: [] });
  });

  it('rien-a-designer-question', () => {
    const vide = ctx({ listeAffichee: [] });
    expect(resoudre({ sorte: 'celle_ci' }, vide)).toEqual({ sorte: 'question', choix: [] });
    expect(resoudre({ sorte: 'ces' }, vide)).toEqual({ sorte: 'question', choix: [] });
    expect(resoudre({ sorte: 'n_dernieres', n: 1 }, vide)).toEqual({ sorte: 'question', choix: [] });
    expect(resoudre({ sorte: 'celle_ci' }, ctx({ listeAffichee: undefined as never, selection: undefined as never }))).toEqual({ sorte: 'question', choix: [] });
  });

  it('n-invalide', () => {
    for (const p of ['les zéro dernières', 'les -1 dernières', 'les 2,5 dernières', 'les onze dernières', 'les 0 premières', 'les 2.5 dernières']) {
      expect(analyserDesignation(p), p).toBeNull();
    }
    for (const n of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      expect(resoudre({ sorte: 'n_dernieres', n } as never, ctx()).sorte).toBe('question');
    }
  });

  it('ordre-de-la-liste-respecte', () => {
    const d = { sorte: 'n_dernieres', n: 2 } as const;
    expect(resoudre(d, ctx())).toEqual(ciblesDe(['c', 'd']));
    expect(resoudre(d, ctx({ listeAffichee: [...L].reverse() }))).toEqual(ciblesDe(['b', 'a']));
    expect(resoudre({ sorte: 'n_premieres', n: 1 }, ctx({ listeAffichee: [...L].reverse() }))).toEqual(ciblesDe(['d']));
  });

  it('phrase-sans-designation-null', () => {
    for (const p of ['', 'bonjour', 'les dernières', 'les trois', 'accès au compte']) {
      expect(analyserDesignation(p), p).toBeNull();
    }
    expect(analyserDesignation(null as never)).toBeNull();
    expect(analyserDesignation('ces écritures')).toEqual({ sorte: 'ces' });
  });
});
